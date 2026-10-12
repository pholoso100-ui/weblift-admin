// Restore a private WebLift sales snapshot into a NEW, EMPTY PostgreSQL database.
// Usage: TARGET_DATABASE_URL="postgresql://..." node scripts/restore-sales.mjs ./private-snapshot.json
// Never commit the snapshot or database URL to a repository.
import pg from 'pg';
import {readFileSync} from 'node:fs';
const tableOrder=['wl_config','wl_catalogue','wl_proposals','wl_sales_events','wl_payments','wl_invitations'];
const jsonColumns=new Set(['value','items','details','selected_services']);
const path=process.argv[2],url=process.env.TARGET_DATABASE_URL;
if(!path||!url){console.error('Provide snapshot path and TARGET_DATABASE_URL.');process.exit(2)}
const backup=JSON.parse(readFileSync(path,'utf8'));
if(backup.format!=='weblift-sales-snapshot-v1'||!backup.tables||!backup.counts)throw Error('Unrecognised backup format');
for(const table of tableOrder){
  const rows=backup.tables[table];
  if(!Array.isArray(rows)||rows.length!==backup.counts[table])throw Error('Snapshot count mismatch for '+table);
}
const db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});
await db.connect();
let committed=false;
try{
  await db.query('BEGIN');
  await db.query(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  // Fail closed: restoring into a populated sales database could rewrite real customer data.
  for(const table of tableOrder){
    const n=Number((await db.query('SELECT count(*)::integer AS count FROM '+table)).rows[0].count);
    if(n!==0)throw Error('Destination '+table+' already contains '+n+' records; migration aborted');
  }
  for(const table of tableOrder){
    for(const row of backup.tables[table]){
      const columns=Object.keys(row);
      if(!columns.length||columns.some(x=>!/^[a-z][a-z0-9_]*$/.test(x)))throw Error('Unexpected backup columns in '+table);
      const identifiers=columns.map(x=>'"'+x+'"').join(',');
      const placeholders=columns.map((_,i)=>'$'+(i+1)).join(',');
      const values=columns.map(c=>jsonColumns.has(c)?JSON.stringify(row[c]):row[c]);
      await db.query('INSERT INTO '+table+' ('+identifiers+') VALUES ('+placeholders+')',values);
    }
    const after=Number((await db.query('SELECT count(*)::integer AS count FROM '+table)).rows[0].count);
    if(after!==backup.counts[table])throw Error('Verification failed: '+table);
  }
  if(backup.invoice_sequence){
    await db.query("SELECT setval('wl_invoice_seq', $1::bigint, $2::boolean)",[backup.invoice_sequence.last_value,backup.invoice_sequence.is_called]);
  }
  for(const table of ['wl_sales_events','wl_payments']){
    const n=Number((await db.query('SELECT coalesce(max(id),0)::bigint AS id FROM '+table)).rows[0].id);
    if(n>0)await db.query("SELECT setval(pg_get_serial_sequence($1, 'id'), $2::bigint, true)",[table,n]);
  }
  await db.query('COMMIT');
  committed=true;
  console.log('Migration verified. Restored counts:',JSON.stringify(backup.counts));
}catch(error){
  await db.query('ROLLBACK').catch(()=>{});
  console.error('Migration not committed:',error.message);
  process.exitCode=1;
}finally{
  await db.end();
}
if(!committed)console.error('Original Render database is untouched. Verify credentials and retry with an empty target.');
