import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/068_relatie_herkomst.sql','utf-8'))
const r = await c.query("select column_name from information_schema.columns where table_name='relaties' and column_name='herkomst'")
console.log('Rebu migratie 068:', r.rows.length ? 'herkomst toegevoegd' : 'FOUT')
await c.end()
