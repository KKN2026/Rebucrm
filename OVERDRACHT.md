# Rebu Kozijnen CRM — overdracht & setup

Alles wat je nodig hebt om dit systeem over te nemen, draaiende te houden en
eraan te werken. Geschreven voor macOS.

---

## 1. Wat draait waar

| Onderdeel | Waar | Naam |
|---|---|---|
| Applicatie | Vercel | project `rebucrm` → https://rebucrm.vercel.app |
| Database + inloggen + bestandsopslag | Supabase | organisatie *Rebukozijnen* |
| Code | GitHub | `nickhouter-ctrl/Rebucrm` |
| Uitgaande e-mail | Resend | verstuurt namens `rebukozijnen.nl` |
| Binnenkomende e-mail | Google Workspace | IMAP op de mailbox uit `SMTP_USER` |
| Boekhouding | SnelStart B2B-API | zie §5 — **let op de vervaldatum** |
| Betaallinks | Mollie | iDEAL op facturen |

De app is een Next.js-applicatie (App Router). Serveracties in
`src/lib/actions.ts` doen vrijwel al het werk; die file is groot maar is
opgedeeld met `// === KOPJES ===`.

---

## 2. Je Mac klaarmaken

Eenmalig, ongeveer een half uur.

```bash
# Homebrew (als je het nog niet hebt)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 24 — dezelfde versie als Vercel draait
brew install node@24

# Terminal naar smaak (optioneel, de ingebouwde Terminal werkt ook)
brew install --cask ghostty

# Claude Code — hiermee laat je wijzigingen maken
npm install -g @anthropic-ai/claude-code

# Vercel CLI — voor omgevingsvariabelen en handmatige deploys
npm install -g vercel
vercel login
```

Daarna dit project ophalen:

```bash
git clone https://github.com/<jouw-account>/Rebucrm.git
cd Rebucrm
npm install
vercel link          # kies het project 'rebucrm'
vercel env pull      # zet .env.local klaar met alle sleutels
npm run dev          # draait op http://localhost:3000
```

`vercel env pull` haalt de instellingen uit Vercel. Dat bestand
(`.env.local`) staat bewust **niet** in GitHub — het bevat wachtwoorden en
sleutels. Deel het nooit en zet het nergens in een repo.

---

## 3. Werken en uitrollen

De hoofdtak is `main`. Elke push naar `main` rolt automatisch uit naar
productie — er is geen aparte stap nodig.

```bash
git add -A
git commit -m "Korte beschrijving van wat je veranderd hebt"
git push
```

Controleer voor het pushen of het bouwt:

```bash
npx tsc --noEmit     # typefouten (zie waarschuwing hieronder)
npx next build       # moet eindigen met 'Compiled successfully'
```

> **Let op bij `tsc`:** dit project geeft van oudsher **61 regels** aan
> meldingen die er al stonden en niets kapotmaken. Zolang het er 61 zijn heb
> je niets nieuws geïntroduceerd. Worden het er meer, dan komt dat door jouw
> wijziging.

Terugrollen na een mislukte uitrol: in Vercel → *Deployments* → een eerdere
versie → *Promote to Production*. Dat is binnen een minuut geregeld.

---

## 4. Omgevingsvariabelen

Beheer ze in Vercel (*Settings → Environment Variables*), niet in de code.
Na een wijziging moet je opnieuw uitrollen voordat hij actief is.

| Variabele | Waarvoor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | verbinding met de database |
| `SUPABASE_SERVICE_ROLE_KEY` | serverkant, omzeilt toegangsregels — geheim houden |
| `SUPABASE_DB_PASSWORD` | alleen voor migratiescripts |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | mailbox, ook voor het ophalen van post |
| `IMAP_HOST` / `IMAP_PORT` | binnenkomende mail |
| `RESEND_API_KEY` | verzendt alle uitgaande mail; is deze leeg, dan valt hij terug op SMTP |
| `MAIL_BCC` | blinde kopie van elke verstuurde mail |
| `MOLLIE_API_KEY` | betaallinks op facturen |
| `SNELSTART_CLIENT_KEY` | bepaalt **welke boekhouding** — per administratie uniek |
| `SNELSTART_SUBSCRIPTION_KEY` | toegang tot de API — zie §5 |
| `SNELSTART_KEY_VERVALT` | datum waarop het CRM gaat waarschuwen |
| `CRON_SECRET` | beveiligt de automatische taken |
| `NEXT_PUBLIC_APP_URL` | gebruikt in mails en betaallinks |

---

## 5. SnelStart — dit verloopt elke 90 dagen

De koppeling draait op een **ontwikkelsleutel** die 90 dagen geldig is. Toen
die in juli afliep viel de synchronisatie stil zonder dat iemand het merkte:
betalingen kwamen dagenlang niet meer binnen.

Daarom telt het CRM nu zelf af. Vanaf 21 dagen voor de vervaldatum staat er
een oranje melding op de facturatiepagina, daarna een rode.

**Huidige vervaldatum: 29 oktober 2026.**

### Vernieuwen (gratis, twee minuten)

1. https://b2bapi-developer.snelstart.nl → **Products** → **Ontwikkeling & Test**
2. Naam invullen, *I agree to the Terms of Use* aanvinken, **Subscribe**
3. **Profile** → bij het nieuwe abonnement op **Show** naast *Primary key*
4. In Vercel: `SNELSTART_SUBSCRIPTION_KEY` = die sleutel,
   `SNELSTART_KEY_VERVALT` = datum van vandaag + 90 dagen
5. Opnieuw uitrollen, daarna in het CRM op **Sync** klikken bij Facturatie

Je hoeft het oude abonnement niet op te zeggen. Maak het nieuwe gerust een
week van tevoren aan, dan ligt er geen moment stil.

### Permanent oplossen

Een sleutel die niet verloopt vereist **certificering** bij SnelStart:
aanvraag indienen (besluit binnen ~3 weken), daarna een certificeringsperiode
van ~12 dagen. Reken op vijf à zes weken. Bij de eisen staat "OAuth-methode
verplicht" terwijl deze koppeling `grant_type=clientkey` gebruikt — navragen
of dat ook voor een maatwerkkoppeling geldt.

### Als de sync een foutmelding geeft

- *"weigert de subscription key"* → sleutel verlopen, zie hierboven
- *"auth mislukt (400)"* → de **client key** is ongeldig. Die haal je uit
  SnelStart zelf (maatwerkkoppeling bij je administratie), niet uit het portaal

---

## 6. Database

Migraties staan in `supabase/migrations/`, genummerd. Toepassen gaat met een
klein script per migratie in `scripts/` (zie de bestaande `apply-*.mjs` als
voorbeeld). Die verbinden rechtstreeks met de database via
`SUPABASE_DB_PASSWORD`.

Back-ups: Supabase maakt die automatisch op het Pro-plan. Op het gratis plan
**niet**, en wordt een ongebruikt project na een week gepauzeerd. Voor een
systeem met klantgegevens is Pro de verstandige keuze.

---

## 7. Automatische taken

Draaien via Vercel Cron, ingesteld in `vercel.json`:

| Taak | Wanneer |
|---|---|
| E-mail ophalen | elke minuut |
| SnelStart synchroniseren | elk half uur |
| Database-back-up | dagelijks 03:00 |
| Opruimen concept-status | dagelijks 04:00 |
| Mollie-betalingen controleren | elke 2 uur |
| Rapport vrije uren | 1e van de maand, 07:00 |

Ze zijn beveiligd met `CRON_SECRET`; Vercel stuurt dat automatisch mee.
Handmatig aanroepen kan met dat geheim als `Authorization: Bearer …`.

Betalingsherinneringen aan klanten staan **uit** en hebben geen schedule.
Zet je ze aan, zet dan ook de schedule terug in `vercel.json`.

---

## 8. Goed om te weten

- **Grote offertes**: bijlagen gaan rechtstreeks naar Supabase Storage, want
  Vercel weigert verzoeken boven 4,5 MB. Tekeningen worden verkleind voordat
  ze in de PDF gaan. Past het totaal niet in één mail, dan worden de grootste
  bijlagen automatisch downloadlinks — de mail gaat dus altijd de deur uit.
- **Verzonden mail**: Resend komt niet langs Gmail, dus het CRM plaatst zelf
  een kopie in de Verzonden-map via IMAP.
- **Twee administraties**: dit CRM en dat van Kunststofkozijnnodig delen code
  maar hebben een eigen database, eigen Vercel-project en een eigen
  SnelStart-client-key. Ze staan volledig los van elkaar.
