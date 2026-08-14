import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/069_snelstart_betaling_boeking.sql', 'utf-8'))
const r = await c.query("select column_name from information_schema.columns where table_name='facturen' and column_name='snelstart_betaling_id'")
console.log('Rebu migratie 069:', r.rows.length ? 'snelstart_betaling_id toegevoegd' : 'FOUT')
await c.end()
