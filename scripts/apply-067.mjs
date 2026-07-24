import { createDbClient } from './db.mjs'
import fs from 'fs'
const c = await createDbClient()
await c.query(fs.readFileSync('./supabase/migrations/067_referentie_en_merk.sql', 'utf-8'))
const r = await c.query("select table_name, column_name from information_schema.columns where (table_name='relaties' and column_name='om_referentie_gevraagd') or (table_name='offertes' and column_name='merk')")
console.log('Migratie 067 toegepast:', r.rows.map(x=>`${x.table_name}.${x.column_name}`).join(', '))
await c.end()
