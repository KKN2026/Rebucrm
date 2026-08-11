// Boekt facturen af die bij Mollie betaald zijn maar in het CRM nog openstaan.
//
// Achtergrond: tussen 31 juli en 11 augustus 2026 zijn betalingen via Mollie
// betaallinks niet automatisch afgeboekt. De afboek-logica zelf was in orde —
// de sync werd simpelweg nooit aangeroepen (webhook kwam niet aan, vangnet-cron
// pikte het niet op). Dit script herstelt de administratie achteraf.
//
// GEEN bevestigingsmails: we schrijven de status rechtstreeks weg. Beide
// mail-triggers (Mollie-sync en SnelStart-sync) vuren alleen bij een overgang
// van niet-betaald naar betaald, dus een latere sync mailt deze facturen ook
// niet alsnog.
//
// Gebruik:
//   node scripts/fix-mollie-niet-afgeboekt.mjs        → dry-run (toont alleen)
//   node scripts/fix-mollie-niet-afgeboekt.mjs fix    → voert de afboeking uit

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createDbClient } from './db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// MOLLIE_API_KEY staat alleen in Vercel, niet in .env.local. Haal 'm uit een
// env-bestand dat je zelf meegeeft, of uit de omgeving.
function laadEnv(pad) {
  try {
    for (const line of readFileSync(pad, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const k = m[1].trim()
      // vercel env pull quote waarden en escapet newlines als \n
      const v = m[2].trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch { /* bestand hoeft niet te bestaan */ }
}
laadEnv(resolve(__dirname, '..', '.env.local'))
laadEnv(process.env.MOLLIE_ENV_FILE || resolve(__dirname, '..', '.env.prod'))

const KEY = (process.env.MOLLIE_API_KEY || '').replace(/\\n/g, '\n').trim().replace(/[\r\n]/g, '')
if (!KEY) {
  console.error('MOLLIE_API_KEY ontbreekt. Zet MOLLIE_ENV_FILE naar een env-bestand met de sleutel,')
  console.error('bijvoorbeeld via: vercel env pull .env.prod --environment=production')
  process.exit(1)
}

async function mollie(pad) {
  const r = await fetch(`https://api.mollie.com/v2${pad}`, { headers: { Authorization: `Bearer ${KEY}` } })
  const j = await r.json()
  if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`)
  return j
}

/** Bepaalt of een Mollie betaallink betaald is, en voor welk bedrag. */
async function linkStatus(plId) {
  const link = await mollie(`/payment-links/${plId}`)
  let betaald = 0
  try {
    const sub = await mollie(`/payment-links/${plId}/payments`)
    for (const p of (sub?._embedded?.payments || [])) {
      if (p.status === 'paid') betaald += parseFloat(p.amount.value)
    }
  } catch { /* sub-payments zijn optioneel */ }
  return {
    isBetaald: Boolean(link.paidAt) || betaald > 0,
    bedrag: betaald > 0 ? betaald : parseFloat(link.amount?.value || '0'),
    paidAt: link.paidAt || null,
  }
}

const dryRun = process.argv[2] !== 'fix'
const db = await createDbClient()

const { rows } = await db.query(`
  select f.id, f.factuurnummer, f.status, f.totaal, f.betaald_bedrag,
         f.mollie_payment_id, r.bedrijfsnaam
  from facturen f
  left join relaties r on r.id = f.relatie_id
  where f.mollie_payment_id like 'pl_%'
    and f.status in ('verzonden', 'deels_betaald', 'vervallen', 'concept')
  order by f.datum desc
`)

console.log(`${rows.length} openstaande facturen met een Mollie betaallink${dryRun ? '  (DRY-RUN)' : '  (UITVOEREN)'}\n`)

let hersteld = 0
let totaalBedrag = 0

for (const f of rows) {
  let st
  try {
    st = await linkStatus(f.mollie_payment_id)
  } catch (e) {
    console.log(`  ! ${f.factuurnummer}: Mollie-fout — ${e.message}`)
    continue
  }
  if (!st.isBetaald) continue

  const totaal = Number(f.totaal || 0)
  const nieuwBedrag = Math.max(Number(f.betaald_bedrag || 0), st.bedrag)
  const nieuweStatus = nieuwBedrag >= totaal - 0.01 ? 'betaald' : 'deels_betaald'

  console.log(`  ${f.factuurnummer}  ${f.bedrijfsnaam}`)
  console.log(`      € ${nieuwBedrag.toFixed(2)} betaald op ${String(st.paidAt).slice(0, 10)}  |  ${f.status} → ${nieuweStatus}`)

  if (!dryRun) {
    await db.query(
      `update facturen set betaald_bedrag = $1, status = $2 where id = $3`,
      [nieuwBedrag, nieuweStatus, f.id]
    )
  }
  hersteld++
  totaalBedrag += nieuwBedrag
}

console.log(`\n${dryRun ? 'Zou herstellen' : 'Hersteld'}: ${hersteld} facturen, € ${totaalBedrag.toFixed(2)}`)
if (dryRun) console.log('Draai opnieuw met "fix" om het door te voeren.')

await db.end()
