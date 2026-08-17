import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/072_mail_bcc_actief.sql', 'utf-8'))
const r = await c.query("select column_name from information_schema.columns where table_name='administraties' and column_name='mail_bcc_actief'")
console.log('Rebu migratie 072:', r.rows.length ? 'mail_bcc_actief toegevoegd' : 'FOUT')
await c.end()
