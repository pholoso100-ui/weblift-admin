// Authorized, on-demand, read-only backup. Do not expose this endpoint without admin authentication.
// Never store returned backups, customer data or credentials in GitHub or Vercel build artifacts.
const tableNames=['wl_config','wl_catalogue','wl_proposals','wl_sales_events','wl_payments','wl_invitations'];
export function mountMigrationExport(app,{pool,requireDb,authenticate,writable}){
  app.get('/api/sales/admin/migration-snapshot',authenticate,writable,requireDb,async(req,res)=>{
    let db;
    try{
      db=await pool.connect();
      await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const tables={},counts={};
      for(const table of tableNames){
        const result=await db.query('SELECT * FROM '+table);
        tables[table]=result.rows;
        counts[table]=result.rowCount;
      }
      const seqResult=await db.query('SELECT last_value,is_called FROM wl_invoice_seq');
      const invoiceSequence=seqResult.rows[0]||null;
      await db.query('COMMIT');
      res.set('Cache-Control','private, no-store, max-age=0');
      res.set('X-Content-Type-Options','nosniff');
      res.set('Content-Disposition','attachment; filename="weblift-private-sales-snapshot.json"');
      res.json({format:'weblift-sales-snapshot-v1',exported_at:new Date().toISOString(),counts,invoice_sequence:invoiceSequence,tables});
    }catch{
      if(db)await db.query('ROLLBACK').catch(()=>{});
      res.status(503).json({error:'Could not create a consistent snapshot. No records were changed.'});
    }finally{db?.release()}
  });
}
