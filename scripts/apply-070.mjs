import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/070_beheer_instellingen.sql', 'utf-8'))
const r = await c.query("select column_name from information_schema.columns where table_name='administraties' and column_name in ('standaard_btw_percentage','standaard_betaaltermijn_dagen','smtp_host','mollie_api_key','snelstart_client_key')")
console.log('Rebu migratie 070:', r.rows.length === 5 ? 'kolommen toegevoegd' : `FOUT (${r.rows.length}/5 kolommen gevonden)`)
await c.end()
