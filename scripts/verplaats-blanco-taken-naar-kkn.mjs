// Verplaatst "blanco" taken (open taken zonder offerte- of leadkoppeling) van het
// Rebu-CRM naar het KKN-CRM. Offertetaken en verkoopkansen blijven in Rebu.
//
// Werkwijze per taak:
//   1. KKN-relatie opzoeken (match op e-mail, anders op bedrijfsnaam)
//   2. Taak in KKN aanmaken met nieuw KKN-taaknummer + alle taaknotities meekopiëren
//   3. Herkomstnotitie toevoegen ("Verplaatst vanuit Rebu-CRM ...")
//   4. Taak (en notities) in Rebu verwijderen
//
// Veiligheid: vóór het verplaatsen wordt een volledige backup (taken + notities)
// weggeschreven naar scripts/.blanco-taken-backup.json. Voortgang staat in
// scripts/.verplaats-taken-voortgang.json zodat het script herstartbaar is.
//
// Gebruik:
//   node scripts/verplaats-blanco-taken-naar-kkn.mjs            (dry-run)
//   node scripts/verplaats-blanco-taken-naar-kkn.mjs verplaats  (uitvoeren)

import pg from 'pg'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv[2] === 'verplaats'

const KKN_REPO = '/Users/nickhouter/projects/KunststofkozijnnodigCRM'
const BACKUP_PAD = resolve(__dirname, '.blanco-taken-backup.json')
const VOORTGANG_PAD = resolve(__dirname, '.verplaats-taken-voortgang.json')

// Rebu-administratie waar alle taken onder vallen / de enige KKN-administratie
const REBU_ADMINISTRATIE = 'e69b63b6-1027-4b35-95d7-0df18f697071'
const KKN_ADMINISTRATIE = 'e8ce1df5-ae1b-433a-a72b-431c79d909b3'

// Gebruikers: Rebu auth.users id -> KKN auth.users id
const GEBRUIKER_MAP = {
  'd06a844a-d26a-4951-92d1-6424cb79b52d': '1b3c7215-2925-423f-a8f1-24cd1c7d9297', // Jordy -> Jordy van der Kelen
  'af691d0b-491b-4b08-b4ff-8417fe6d87e1': '619e8ce5-3445-4235-8534-5c0e7369de43', // Admin -> info@kunststofkozijnnodig.nl
  '505912c3-c8b9-4057-94af-af714e0e7e46': '619e8ce5-3445-4235-8534-5c0e7369de43', // Nick Burgers -> info@
}
const GEBRUIKER_FALLBACK = 'bb3cb14f-9c6b-456b-a887-0501cae4471a' // Nick Houter (KKN)

// Medewerkers: Rebu medewerkers.id -> KKN medewerkers.id
const MEDEWERKER_MAP = {
  '8e34077d-5109-434e-ae52-0529176e2f6a': '64ef8a07-8606-46d4-9b2a-f55809c50129', // Jordy
  '6070ea5a-727b-4d97-8bb3-805a9d68416e': '4a8f35fa-2826-4756-ac31-fdedf9c02bf5', // Nick Burgers
  '0bb9122b-7630-44da-8eb6-e354f6cfa62a': '65993b3f-b34d-4e88-b120-d20b79c8fea0', // Jimmy
}

function leesEnv(pad) {
  const env = {}
  for (const line of readFileSync(pad, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

// Session pooler (IPv4) met terugval op de directe host, zoals scripts/db.mjs
async function verbind(envPad, label) {
  const env = leesEnv(envPad)
  const ref = (env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1]
  const wachtwoord = env.SUPABASE_DB_PASSWORD
  if (!ref || !wachtwoord) {
    console.error(`${label}: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_DB_PASSWORD ontbreekt in ${envPad}`)
    process.exit(1)
  }
  const basis = { port: 5432, database: 'postgres', password: wachtwoord, ssl: { rejectUnauthorized: false } }
  try {
    const client = new pg.Client({ ...basis, host: 'aws-1-eu-west-1.pooler.supabase.com', user: `postgres.${ref}` })
    await client.connect()
    return client
  } catch {
    const client = new pg.Client({ ...basis, host: `db.${ref}.supabase.co`, user: 'postgres' })
    await client.connect()
    return client
  }
}

function leesJson(pad, standaard) {
  return existsSync(pad) ? JSON.parse(readFileSync(pad, 'utf-8')) : standaard
}

const norm = (s) => (s || '').toLowerCase().trim()

const rebu = await verbind(resolve(__dirname, '..', '.env.local'), 'Rebu')
const kkn = await verbind(resolve(KKN_REPO, '.env.local'), 'KKN')

try {
  // 1. Blanco taken ophalen (open, geen offerte, geen lead) met relatiegegevens
  const { rows: taken } = await rebu.query(`
    select t.id, t.taaknummer, t.titel, t.omschrijving, t.status, t.prioriteit,
           to_char(t.deadline, 'YYYY-MM-DD') as deadline, t.deadline_tijd, t.categorie,
           t.toegewezen_aan, t.medewerker_id, t.created_at, t.updated_at,
           r.bedrijfsnaam, r.email as relatie_email
    from taken t
    join relaties r on r.id = t.relatie_id
    where t.status = 'open' and t.offerte_id is null and t.lead_id is null
      and t.administratie_id = $1
    order by t.taaknummer nulls last`, [REBU_ADMINISTRATIE])

  const taakIds = taken.map((t) => t.id)
  const { rows: notities } = taakIds.length
    ? await rebu.query('select * from taak_notities where taak_id = any($1)', [taakIds])
    : { rows: [] }
  const notitiesPerTaak = new Map()
  for (const n of notities) {
    if (!notitiesPerTaak.has(n.taak_id)) notitiesPerTaak.set(n.taak_id, [])
    notitiesPerTaak.get(n.taak_id).push(n)
  }

  // 2. KKN-relaties indexeren op e-mail en bedrijfsnaam
  const { rows: kknRelaties } = await kkn.query(
    'select id, bedrijfsnaam, email from relaties where administratie_id = $1', [KKN_ADMINISTRATIE])
  const opEmail = new Map(), opNaam = new Map()
  for (const r of kknRelaties) {
    if (norm(r.email) && !opEmail.has(norm(r.email))) opEmail.set(norm(r.email), r.id)
    if (norm(r.bedrijfsnaam) && !opNaam.has(norm(r.bedrijfsnaam))) opNaam.set(norm(r.bedrijfsnaam), r.id)
  }

  const zoekRelatie = (t) => opEmail.get(norm(t.relatie_email)) || opNaam.get(norm(t.bedrijfsnaam)) || null

  const zonderRelatie = taken.filter((t) => !zoekRelatie(t))
  console.log(`Blanco taken in Rebu: ${taken.length} (met ${notities.length} notities)`)
  if (zonderRelatie.length) {
    console.log(`LET OP — geen KKN-relatie gevonden voor ${zonderRelatie.length} taken:`)
    for (const t of zonderRelatie) console.log(`  ${t.taaknummer}  ${t.titel}  (${t.bedrijfsnaam})`)
  }

  if (!APPLY) {
    const voorbeeld = taken.slice(0, 10).map((t) =>
      `  ${t.taaknummer || '(geen nr)'}  ${t.titel.slice(0, 40).padEnd(40)}  ${t.bedrijfsnaam}`)
    console.log('\nDRY-RUN — voorbeeld van wat verplaatst wordt:')
    console.log(voorbeeld.join('\n'))
    console.log(`\nDraai met "verplaats" om ${taken.length - zonderRelatie.length} taken echt te verplaatsen.`)
    process.exit(0)
  }

  // 3. Backup wegschrijven vóór er iets wijzigt (eenmalig; niet overschrijven bij hervatten)
  if (!existsSync(BACKUP_PAD)) {
    const { rows: volledigeTaken } = await rebu.query('select * from taken where id = any($1)', [taakIds])
    writeFileSync(BACKUP_PAD, JSON.stringify({ taken: volledigeTaken, notities }, null, 1))
    console.log(`Backup weggeschreven: ${BACKUP_PAD}`)
  }

  const voortgang = leesJson(VOORTGANG_PAD, {})

  // 4. Volgend KKN-taaknummer bepalen (zelfde logica als getVolgendTaaknummer in de app)
  const jaar = new Date().getFullYear().toString()
  const { rows: [laatste] } = await kkn.query(
    "select max(taaknummer) as max from taken where taaknummer like $1", [`${jaar}-%`])
  let volgendNr = laatste?.max ? parseInt(laatste.max.split('-')[1]) + 1 : 1

  let verplaatst = 0, overgeslagen = 0
  for (const taak of taken) {
    const relatieId = zoekRelatie(taak)
    if (!relatieId) { overgeslagen++; continue }

    let kknTaakId = voortgang[taak.id]

    if (!kknTaakId) {
      const taaknummer = `${jaar}-${String(volgendNr++).padStart(5, '0')}`
      await kkn.query('begin')
      try {
        const { rows: [nieuw] } = await kkn.query(`
          insert into taken (administratie_id, relatie_id, titel, omschrijving, status, prioriteit,
                             deadline, deadline_tijd, categorie, toegewezen_aan, medewerker_id,
                             taaknummer, created_at, updated_at)
          values ($1,$2,$3,$4,'open',$5,$6,$7,$8,$9,$10,$11,$12,now())
          returning id`,
          [KKN_ADMINISTRATIE, relatieId, taak.titel, taak.omschrijving, taak.prioriteit,
           taak.deadline, taak.deadline_tijd, taak.categorie,
           GEBRUIKER_MAP[taak.toegewezen_aan] || GEBRUIKER_FALLBACK,
           taak.medewerker_id ? (MEDEWERKER_MAP[taak.medewerker_id] || null) : null,
           taaknummer, taak.created_at])
        kknTaakId = nieuw.id

        for (const n of notitiesPerTaak.get(taak.id) || []) {
          await kkn.query(`
            insert into taak_notities (administratie_id, taak_id, gebruiker_id, tekst, created_at)
            values ($1,$2,$3,$4,$5)`,
            [KKN_ADMINISTRATIE, kknTaakId, GEBRUIKER_MAP[n.gebruiker_id] || GEBRUIKER_FALLBACK, n.tekst, n.created_at])
        }
        await kkn.query(`
          insert into taak_notities (administratie_id, taak_id, gebruiker_id, tekst)
          values ($1,$2,$3,$4)`,
          [KKN_ADMINISTRATIE, kknTaakId, GEBRUIKER_FALLBACK,
           `Verplaatst vanuit het Rebu-CRM (was taak ${taak.taaknummer || 'zonder nummer'}).`])
        await kkn.query('commit')
      } catch (e) {
        await kkn.query('rollback')
        throw new Error(`KKN-insert mislukt voor ${taak.taaknummer}: ${e.message}`)
      }
      voortgang[taak.id] = kknTaakId
      writeFileSync(VOORTGANG_PAD, JSON.stringify(voortgang, null, 1))
    }

    // Rebu-kant opruimen (ook bij hervatten: rij kan nog bestaan als vorige run hier stopte)
    await rebu.query('begin')
    try {
      await rebu.query('delete from taak_notities where taak_id = $1', [taak.id])
      await rebu.query('delete from taken where id = $1', [taak.id])
      await rebu.query('commit')
    } catch (e) {
      await rebu.query('rollback')
      throw new Error(`Rebu-verwijderen mislukt voor ${taak.taaknummer}: ${e.message}`)
    }

    verplaatst++
    if (verplaatst % 25 === 0) console.log(`  ${verplaatst}/${taken.length} verplaatst…`)
  }

  console.log(`\nKlaar: ${verplaatst} taken verplaatst naar KKN, ${overgeslagen} overgeslagen (geen relatie-match).`)
} finally {
  await rebu.end()
  await kkn.end()
}
