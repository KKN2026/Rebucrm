// Eenmalige broadcast: rebranding-aankondiging (Rebu → Kunststofkozijnnodig.nl)
// naar alle relaties met e-mailadres, met de aankondigings-PDF als bijlage.
//
// Bootst sendBroadcastEmail exact na (Rebu-template, batches, List-Unsubscribe,
// controle-BCC, email_log) maar draait als script omdat de server action een
// ingelogde sessie vereist. Batchgrootte 48: Resend telt to+cc+bcc samen en
// weigert boven de 50 (48 + afzender + controle-BCC = 50).
//
// Voortgang staat in scripts/.broadcast-voortgang.json: bij een fout kan het
// script opnieuw draaien en slaat het reeds verstuurde batches over, zodat
// niemand de mail dubbel krijgt.
//
// Gebruik:
//   node scripts/verstuur-rebranding-broadcast.mjs            → dry-run
//   node scripts/verstuur-rebranding-broadcast.mjs verstuur   → verstuurt echt
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createDbClient } from './db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VOORTGANG = resolve(__dirname, '.broadcast-voortgang.json')
const PDF_PAD = resolve(__dirname, '..', 'Rebu kozijnen - Kunststofkozijnnodig.nl  (1).pdf')
const PDF_NAAM = 'Rebu Kozijnen wordt Kunststofkozijnnodig.nl.pdf'

// Productie-sleutels; .env.local kan afwijkende test-instellingen bevatten.
for (const line of readFileSync(resolve(__dirname, '..', '.env.prod'), 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const RESEND_KEY = (process.env.RESEND_API_KEY || '').trim()
const FROM_ADRES = process.env.RESEND_FROM || process.env.SMTP_FROM || 'Nick@rebukozijnen.nl'
const MAIL_BCC = (process.env.MAIL_BCC || '').trim()
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rebucrm.vercel.app'
if (!RESEND_KEY) { console.error('RESEND_API_KEY ontbreekt in .env.prod'); process.exit(1) }

const ONDERWERP = 'Wij hebben een nieuwe naam! 🎉'
const BERICHT = `Goedemiddag,

Na jaren als Rebu Kozijnen gaan wij verder onder een nieuwe naam: Kunststofkozijnnodig.nl.

Hetzelfde team, dezelfde kwaliteit, dezelfde locatie, maar met een frissere, online-gerichte aanpak.

📌 Loopt er nog een offerte bij ons?

Die blijft gewoon lopen via Rebu Kozijnen. Nieuwe offertes lopen via Kunststofkozijnnodig.nl.

📧 info@kunststofkozijnnodig.nl

📱 06 58 86 60 70

📧 verkoop@kunststofkozijnnodig.nl

📱 06 23 84 90 67

🌐 Nieuwsgierig? Kijk op kunststofkozijnnodig.nl.

Met vriendelijke groet,

Het team van Kunststofkozijnnodig.nl

voorheen Rebu Kozijnen`

// --- Rebu-template (1-op-1 uit src/lib/email-template.ts, plain-text-tak) ---
function buildRebuEmailHtml(body) {
  const logoUrl = `${BASE_URL}/images/logo-rebu.png`
  const bodyHtml = body
    .split('\n')
    .map(line => {
      const l = line.trim()
      if (l === '') return '<div style="height:10px;line-height:10px;">&nbsp;</div>'
      const withLinks = l.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#00a66e;text-decoration:underline;">$1</a>')
      if (/^[-•]\s/.test(l)) {
        return `<p style="margin:0 0 6px 0;padding-left:18px;position:relative;font-size:15px;line-height:1.65;color:#1f2937;"><span style="position:absolute;left:0;color:#00a66e;font-weight:bold;">•</span>${withLinks.replace(/^[-•]\s/, '')}</p>`
      }
      return `<p style="margin:0 0 10px 0;font-size:15px;line-height:1.65;color:#1f2937;">${withLinks}</p>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;">Rebu Kozijnen</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f4;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);">
        <tr>
          <td style="background-color:#ffffff;padding:32px 40px 20px 40px;text-align:left;border-bottom:1px solid #f1f5f4;">
            <img src="${logoUrl}" alt="Rebu Kozijnen" width="150" style="display:block;max-width:150px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#00a66e 0%,#22d3ae 50%,#00a66e 100%);"></td>
        </tr>
        <tr>
          <td style="padding:36px 40px 24px 40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8faf9;border-radius:12px;border:1px solid #e6f4ee;">
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:top;width:50%;padding-right:12px;">
                        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#064e3b;letter-spacing:0.3px;">REBU KOZIJNEN B.V.</p>
                        <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                          Samsonweg 26F<br>
                          1521 RM Wormerveer
                        </p>
                      </td>
                      <td style="vertical-align:top;width:50%;padding-left:12px;border-left:2px solid #00a66e;">
                        <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.8;">
                          <a href="tel:+31658866070" style="color:#00a66e;text-decoration:none;font-weight:500;">📞 +31 6 58 86 60 70</a><br>
                          <a href="mailto:info@rebukozijnen.nl" style="color:#00a66e;text-decoration:none;font-weight:500;">✉️ info@rebukozijnen.nl</a><br>
                          <a href="https://www.rebukozijnen.nl" style="color:#00a66e;text-decoration:none;font-weight:500;">🌐 www.rebukozijnen.nl</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8faf9;padding:14px 40px;border-top:1px solid #e6f4ee;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;letter-spacing:0.2px;">
              KVK 907 204 74 · BTW NL 865 427 926 B01 · IBAN NL80 INGB 0675 6102 73
            </p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin-top:16px;">
        <tr><td style="text-align:center;padding:0 16px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Rebu Kozijnen · Kwaliteitskozijnen direct van de leverancier</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// --- Uitvoeren ---
const verstuur = process.argv[2] === 'verstuur'
const db = await createDbClient()

const { rows: adminRows } = await db.query('select id from administraties limit 1')
const adminId = adminRows[0]?.id
const { rows } = await db.query(`select distinct lower(trim(email)) as email from relaties where email is not null and email <> '' and email like '%@%' order by 1`)
const ontvangers = rows.map(r => r.email)

const BATCH = 48
const batches = []
for (let i = 0; i < ontvangers.length; i += BATCH) batches.push(ontvangers.slice(i, i + BATCH))

// Voortgang van een eerdere (deels mislukte) run: verstuurde batch-indexen overslaan.
const klaar = existsSync(VOORTGANG) ? new Set(JSON.parse(readFileSync(VOORTGANG, 'utf-8')).verstuurd) : new Set()

console.log(`${ontvangers.length} unieke ontvangers, ${batches.length} batches van max ${BATCH}${klaar.size ? ` (${klaar.size} al verstuurd in eerdere run)` : ''}`)
console.log(`Van: ${FROM_ADRES} | Onderwerp: ${ONDERWERP} | Bijlage: ${PDF_NAAM}`)
if (!verstuur) {
  console.log(`\nDRY-RUN — eerste batch:\n  ${batches[0].slice(0, 5).join('\n  ')}\n  ... (+${batches[0].length - 5})`)
  console.log('\nDraai opnieuw met "verstuur" om echt te versturen.')
  await db.end(); process.exit(0)
}

const pdfBase64 = readFileSync(PDF_PAD).toString('base64')
const emailHtml = buildRebuEmailHtml(BERICHT)
const fouten = []
let verzonden = 0

for (let i = 0; i < batches.length; i++) {
  if (klaar.has(i)) { console.log(`batch ${i + 1}/${batches.length}: al verstuurd, overgeslagen`); continue }
  const batch = batches[i]
  const bcc = MAIL_BCC && !batch.includes(MAIL_BCC.toLowerCase()) ? [...batch, MAIL_BCC] : [...batch]
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADRES,
      to: [FROM_ADRES],
      bcc,
      subject: ONDERWERP,
      html: emailHtml,
      headers: { 'List-Unsubscribe': `<mailto:${FROM_ADRES}?subject=Afmelden%20nieuwsbrief>` },
      attachments: [{ filename: PDF_NAAM, content: pdfBase64 }],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.ok) {
    klaar.add(i)
    verzonden += batch.length
    writeFileSync(VOORTGANG, JSON.stringify({ verstuurd: [...klaar] }))
    console.log(`batch ${i + 1}/${batches.length}: verstuurd (${batch.length} ontvangers)`)
  } else {
    const melding = json?.message || `HTTP ${res.status}`
    fouten.push(`batch ${i + 1}: ${melding}`)
    console.log(`batch ${i + 1}/${batches.length}: MISLUKT — ${melding}`)
    // Quota-/limietfouten raken ook alle volgende batches: stoppen en hervatten kan later.
    if (res.status === 429 || /quota|limit|exceed/i.test(melding)) {
      console.log('Limiet bereikt — gestopt. Draai later opnieuw om te hervatten (verstuurde batches worden overgeslagen).')
      break
    }
  }
  await new Promise(r => setTimeout(r, 700)) // Resend: max 2 requests/sec
}

// Logboek in het CRM, net als de app-flow — alleen bij (deels) succes.
if (verzonden > 0 && adminId) {
  await db.query(
    `insert into email_log (administratie_id, aan, onderwerp, body_html, verstuurd_door) values ($1, $2, $3, $4, null)`,
    [adminId, `Broadcast Alle (${verzonden} ontvangers, 1 bijlage(n))`, ONDERWERP, emailHtml],
  )
}

console.log(`\nVerstuurd naar ${verzonden} van ${ontvangers.length} ontvangers${fouten.length ? `\nFouten:\n  ${fouten.join('\n  ')}` : ''}`)
await db.end()
