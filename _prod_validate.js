require('dotenv').config({override:true,quiet:true});
const http=require('http');const fs=require('fs');const path=require('path');

let cookie='';
function req(method,path2,body){
  return new Promise(resolve=>{
    const u=new URL('http://localhost:3099'+path2);
    const opts={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method};
    const hdrs={'Content-Type':'application/json'};
    if(body){hdrs['Content-Length']=Buffer.from(JSON.stringify(body)).length}
    if(cookie)hdrs.Cookie=cookie;
    const q=http.request({...opts,headers:hdrs},resp=>{
      const sc=resp.headers['set-cookie'];
      const scStr=(Array.isArray(sc)?sc[0]:sc)||'';
      const m=scStr.match(/hisecure\.sid=([^;]+)/);
      if(m)cookie='hisecure.sid='+m[1];
      const d=[];resp.on('data',c=>d.push(c));
      resp.on('end',()=>{try{resolve({status:resp.statusCode,body:JSON.parse(Buffer.concat(d).toString())})}catch(e){resolve({status:resp.statusCode,body:Buffer.concat(d).toString()})}});
    });
    q.on('error',()=>resolve({status:0,body:{error:'connection'}}));
    if(body)q.write(JSON.stringify(body));q.end();
  });
}

(async()=>{
  let lr=await req('POST','/api/auth/login',{username:'admin',password:'admin@123'});
  if(lr.status!==200){console.log('LOGIN FAIL');process.exit(1)}
  console.log('LOGIN:',lr.status,'cookie set:',!!cookie,'user='+lr.body.user.username,'id='+lr.body.user.id);
  let pass=0,fail=0;
  let out={suite:'all',login:lr.status,results:{},passCount:0,failCount:0,total:0,timestamp:new Date().toISOString()};
  function chk(name,status,detail){
    if(status===200)pass++;else fail++;
    out.results[name]={status,pass:status===200,detail:(detail||'')};
    out.passCount=pass;out.failCount=fail;out.total=pass+fail;
    out.verdict=fail===0?'PASS':'FAIL';
    console.log(' '+name+': '+(status===200?'PASS':'FAIL')+' ['+status+'] '+(detail||''));
  }

  console.log('\n=== RBAC ===');
  let r;
  r=await req('GET','/api/users?limit=1');chk('users',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/technicians');chk('technicians',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/complaints?limit=1');chk('complaints',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/amc/contracts?limit=1');chk('amc',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/repairs?limit=1');chk('repairs',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/tickets?limit=1');chk('tickets',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/settings');chk('settings',r.status,r.body.error||r.body.message||'ok');
  r=await req('GET','/api/dashboard');chk('dashboard',r.status,r.body.error||'ok');
  r=await req('GET','/api/reports/stats');chk('reports',r.status,r.body.error||'ok');
  r=await req('GET','/api/products?limit=1');chk('products',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/customers?limit=1');chk('customers',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/payments?limit=1');chk('payments',r.status,r.body.error||r.body.message||'ok');
  r=await req('GET','/api/parts?limit=1');chk('parts',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/suppliers?limit=1');chk('suppliers',r.status,r.body.error||r.body.message||'ok');
  r=await req('GET','/api/stores?limit=1');chk('stores',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/invoices?limit=1');chk('invoices',r.status,r.body.error||'rows='+((r.body.data||[]).length));
  r=await req('GET','/api/accounting?limit=1');chk('accounting',r.status,r.body.error||r.body.message||'ok');

  let custId=null;
  r=await req('GET','/api/customers?limit=1');
  if(r.status===200&&r.body.data&&r.body.data[0])custId=r.body.data[0].customer_id;
  console.log('\nCustomer:',custId);

  if(custId){
    console.log('\n=== Workflow 2: Complaint -> Ticket ===');
    let c=await req('POST','/api/complaints',{customer_id:custId,subject:'wb-Complaint',priority:'medium',category:'service'});
    let compId=(c.body&&c.body.data&&c.body.data.complaint_id)||null;
    chk('wf2_create_complaint',c.status,compId?'compId='+compId:(c.body.error||'fail'));

    if(compId){
      let r2=await req('GET','/api/complaints/'+compId);chk('wf2_read',r2.status,(r2.body.data&&r2.body.data.complaint_id?'ok':r2.body.error));
      r2=await req('PUT','/api/complaints/'+compId+'/status',{status:'under_review'});chk('wf2_review',r2.status,(r2.body.error||'ok'));
      r2=await req('PUT','/api/complaints/'+compId+'/status',{status:'resolved',resolution:'wb'});chk('wf2_resolved',r2.status,(r2.body.error||'ok'));

      let t=await req('POST','/api/tickets',{customer_id:custId,subject:'wb-Ticket',priority:'medium',ticket_type:'service',complaint_id:compId,description:'wb'});
      let tId=(t.body&&t.body.data&&t.body.data.ticket_id)||null;
      chk('wf2_ticket',t.status,tId?'tId='+tId:(t.body.error||'fail'));

      if(tId){
        let r3=await req('GET','/api/tickets/'+tId);chk('wf2_ticket_read',r3.status,(r3.body.data&&r3.body.data.ticket_id?'ok':r3.body.error));
        r3=await req('PUT','/api/tickets/'+tId,{status:'assigned'});chk('wf2_assigned',r3.status,(r3.body.error||'ok'));
        r3=await req('PUT','/api/tickets/'+tId,{status:'in_progress'});chk('wf2_progress',r3.status,(r3.body.error||'ok'));
        r3=await req('PUT','/api/tickets/'+tId,{status:'closed'});chk('wf2_closed',r3.status,(r3.body.error||'ok'));
        r3=await req('GET','/api/tickets?limit=5&status=closed');chk('wf2_closed_filter',r3.status,(r3.body.error||'n='+((r3.body.data||[]).length)));
      }
    }

    console.log('\n=== Workflow 3: AMC ===');
    let a=await req('POST','/api/amc/contracts',{customer_id:custId,contract_type:'annual',start_date:'2026-01-01',end_date:'2027-01-01',terms:'wb'});
    let amcId=(a.body&&a.body.data&&a.body.data.amc_id)||null;
    chk('wf3_amc',a.status,amcId?'amcId='+amcId:(a.body.error||'fail'));

    if(amcId){
      let r4=await req('GET','/api/amc/contracts/'+amcId);chk('wf3_amc_read',r4.status,(r4.body.data&&r4.body.data.amc_id?'ok':r4.body.error));
      r4=await req('POST','/api/amc/contracts/'+amcId+'/activate');chk('wf3_activate',r4.status,(r4.body.error||'ok'));

      let aset=await req('POST','/api/amc/assets',{amc_id:amcId,asset_type:'equipment',serial_number:'wb-'+Date.now(),is_active:true});
      let asetId=(aset.body&&aset.body.data&&aset.body.data.asset_id)||null;
      chk('wf3_asset',aset.status,asetId?'astId='+asetId:(aset.body.error||'fail'));

      if(asetId){
        let r5=await req('GET','/api/amc/assets/'+asetId);chk('wf3_asset_read',r5.status,(r5.body.data&&r5.body.data.asset_id?'ok':r5.body.error));
        r5=await req('GET','/api/amc/assets?amc_id='+amcId);chk('wf3_asset_list',r5.status,(r5.body.error||'n='+((r5.body.data||[]).length)));
      }
      r4=await req('GET','/api/amc/stats');chk('wf3_stats',r4.status,(r4.body.error||'ok'));
      r4=await req('PUT','/api/amc/contracts/'+amcId,{terms:'wb-up'});chk('wf3_update',r4.status,(r4.body.error||'ok'));
      r4=await req('GET','/api/amc/contracts?customer_id='+custId);chk('wf3_filter',r4.status,(r4.body.error||'ok'));
    }
  }

  fs.writeFileSync('C:/Users/Admin/Desktop/Calude Test/erp-app/_results_all.json',JSON.stringify(out,null,2));
  console.log('\n=== FINAL ===');
  console.log('Total:',pass+'/'+out.total,' PASS,',fail,'FAIL');
  console.log('Verdict:',out.verdict);
})();
