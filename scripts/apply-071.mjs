import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/071_huisstijl_storage.sql', 'utf-8'))
const r = await c.query("select id, public from storage.buckets where id = 'huisstijl'")
console.log('Rebu migratie 071:', r.rows.length ? `bucket huisstijl aangemaakt (public: ${r.rows[0].public})` : 'FOUT')
await c.end()
