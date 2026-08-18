import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/073_broadcast_bcc_instelling.sql', 'utf-8'))
const r = await c.query("select column_name from information_schema.columns where table_name='administraties' and column_name='broadcast_bcc_actief'")
console.log('Rebu migratie 073:', r.rows.length ? 'broadcast_bcc_actief toegevoegd' : 'FOUT')
await c.end()
