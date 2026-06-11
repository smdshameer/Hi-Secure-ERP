require('dotenv').config({override:true,quiet:true});
const http=require('http');
const fs=require('fs');

function req(method,path,body){
  return new Promise((resolve)=>{
    const u=new URL('http://localhost:3099'+path);
    const opts={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:method};
    const hdrs={'Content-Type':'application/json'};
    if(body){hdrs['Content-Length']=Buffer.from(JSON.stringify(body)).length;hdrs.body=JSON.stringify(body)}
    const q=http.request({...opts,headers:hdrs},resp=>{
      const sc=resp.headers['set-cookie'];
      if(typeof sc==='string'){
        const m=sc.match(/hisecure\.sid=([^;]+)/);
        if(m)hdrs.Cookie='hisecure.sid='+m[1];
      }
      const d=[];resp.on('data',c=>d.push(c));
      resp.on('end',()=>resolve({status:resp.statusCode,body:JSON.parse(Buffer.concat(d).toString())}));
    });
    q.on('error',e=>resolve({status:0,body:{error:e.message}}));
    if(body)q.write(JSON.stringify(body));q.end();
  });
}
(async()=>{
  let lr=await req('POST','/api/auth/login',{username:'admin',password:'admin@123'});
  if(lr.status!==200){console.log('WF2 LOGIN FAIL');process.exit(1)}
  let cookie={'Cookie':'hisecure.sid='+((lr.body||{}).sid||'')};
  let cid;
  
  // Get customer ID from preflight
  let cr=await req('GET','/api/customers?limit=1',null,cookie);
  if(cr.status===200 && cr.body.data && cr.body.data[0]){
    cid=cr.body.data[0].customer_id;
    console.log('Customer ID:',cid);
  } else {
    console.log('FAIL: no customer found');
    process.exit(1);
  }

  let results={};
  let pass=0, fail=0;
  
  // Check endpoint helper (creates fresh request)
  async function check(name,method,path,body){
    let r=await req(method,path,body);
    let ok=r.status===200;
    if(ok)pass++;else fail++;
    let detail=r.body.error||(r.body.data?'rows='+r.body.data.length:'');
    results[name]={status:r.status,pass:ok,detail:detail};
    console.log('  '+name+': '+(ok?'PASS':'FAIL')+' ['+r.status+'] '+detail);
  }
  
  console.log('\n=== Workflow 2: Customer -> Complaint -> Ticket ===');
  await check('wf2_create_complaint','POST','/api/complaints',{customer_id:cid,subject:'wb-Complaint',priority:'medium',category:'service'});
  let compId=(results['wf2_create_complaint'].detail||'').match(/complaint_id=(\d+)/);
  if(!compId){
    console.log('  FAIL: could not get complaint ID');
    fail++; results['wf2_complaint_id']='FAIL:no id';
  } else {
    let cid2=compId[1];
    await check('wf2_read_complaint','GET','/api/complaints/'+cid2);
    await check('wf2_complaint_status_review','PUT','/api/complaints/'+cid2+'/status',{status:'under_review'});
    await check('wf2_complaint_status_resolved','PUT','/api/complaints/'+cid2+'/status',{status:'resolved',resolution:'wb-resolved'});
    
    let tk=await req('POST','/api/tickets',{customer_id:cid,subject:'wb-Ticket',priority:'medium',ticket_type:'service',complaint_id:cid2,description:'wb-from complaint'});
    if(tk.status===200 && tk.body.data){
      let tid=tk.body.data.ticket_id;
      results['wf2_create_ticket']={status:tk.status,pass:true,detail:'ticket_id='+tid};
      pass++;
      console.log('  wf2_create_ticket: PASS ['+tk.status+'] ticket_id='+tid);
      await check('wf2_read_ticket','GET','/api/tickets/'+tid);
      await check('wf2_ticket_assigned','PUT','/api/tickets/'+tid,{status:'assigned'});
      await check('wf2_ticket_in_progress','PUT','/api/tickets/'+tid,{status:'in_progress'});
      await check('wf2_ticket_closed','PUT','/api/tickets/'+tid,{status:'closed'});
      await check('wf2_filter_closed','GET','/api/tickets?limit=5&status=closed');
    } else {
      results['wf2_create_ticket']={status:tk.status,pass:false,detail:'FAIL'};
      fail++;
    }
  }
  
  let report={suite:'Workflow2',timestamp:new Date().toISOString(),results,passCount:pass,failCount:fail,total:pass+fail,verdict:fail===0?'PASS':'FAIL'};
  fs.writeFileSync('C:/Users/Admin/Desktop/Calude Test/erp-app/_results_wf2.json',JSON.stringify(report,null,2));
  console.log('\nWF2 verdict:',report.verdict,pass+'/'+(pass+fail),'PASS,',fail,'FAIL');
})();
