require('dotenv').config({ override: true, quiet: true });
const http = require('http');
const fs = require('fs');

function req(opts, body, jar) {
  return new Promise((resolve, reject) => {
    const b = body ? Buffer.from(JSON.stringify(body)) : null;
    const hdrs = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
    if (jar && jar['hisecure.sid']) hdrs.Cookie = 'hisecure.sid=' + jar['hisecure.sid'];
    if (b) hdrs['Content-Length'] = b.length;
    const q = http.request({ ...opts, headers: hdrs }, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
        const sc = resp.headers['set-cookie'];
        const jarOut = { ...(jar || {}) };
        if (sc) sc.forEach(s => { const m = s.match(/hisecure\.sid=([^;]+)/); if (m) jarOut['hisecure.sid'] = m[1]; });
        resolve({ status: resp.statusCode, body: parsed, jar: jarOut });
      });
    });
    q.on('error', reject);
    if (b) q.write(b);
    q.end();
  });
}

(async () => {
  const login = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin@123' });
  if (login.status !== 200) { console.error('LOGIN FAIL'); process.exit(1); }
  const j = (login.jar || {});
  const hdr = j['hisecure.sid'] ? { Cookie: 'hisecure.sid=' + j['hisecure.sid'] } : {};
  const out = {};

  // pre-flight customer
  const custList = await req({ host: 'localhost', port: 3099, path: '/api/customers?limit=1', method: 'GET', headers: hdr });
  const cid = custList.body?.data?.[0]?.customer_id;
  out.customer_seeded = cid || 'NONE';

  if (cid) {
    // CREATE complaint
    const comp = await req({ host: 'localhost', port: 3099, path: '/api/complaints', method: 'POST' }, { customer_id: cid, subject: 'ProdWF2 Comp', priority: 'medium', category: 'service' }, hdr);
    out.create_complaint = comp.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(comp.body).slice(0, 120);
    const compId = comp.body?.data?.complaint_id;

    if (compId) {
      // READ complaint
      const compR = await req({ host: 'localhost', port: 3099, path: '/api/complaints/' + compId, method: 'GET', headers: hdr });
      out.read_complaint = compR.status === 200 ? 'PASS' : 'FAIL';

      // STATUS: registered -> under_review
      const compS1 = await req({ host: 'localhost', port: 3099, path: '/api/complaints/' + compId + '/status', method: 'PUT' }, { status: 'under_review' }, hdr);
      out.complaint_registered_to_review = compS1.status === 200 ? 'PASS' : 'FAIL';

      // STATUS: under_review -> resolved
      const compS2 = await req({ host: 'localhost', port: 3099, path: '/api/complaints/' + compId + '/status', method: 'PUT' }, { status: 'resolved', resolution: 'Fixed in prod validation' }, hdr);
      out.complaint_review_to_resolved = compS2.status === 200 ? 'PASS' : 'FAIL';

      // READ after status change
      const compR2 = await req({ host: 'localhost', port: 3099, path: '/api/complaints/' + compId, method: 'GET', headers: hdr });
      out.complaint_post_status_read = compR2.status === 200 && compR2.body?.data?.status === 'resolved' ? 'PASS' : 'FAIL';

      // CREATE ticket from complaint
      const tk = await req({ host: 'localhost', port: 3099, path: '/api/tickets', method: 'POST' }, { customer_id: cid, subject: 'ProdWF2 Ticket', priority: 'medium', ticket_type: 'service', complaint_id: compId, description: 'from complaint' }, hdr);
      out.create_ticket = tk.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(tk.body).slice(0, 100);
      const tkId = tk.body?.data?.ticket_id;

      if (tkId) {
        // READ ticket
        const tkR = await req({ host: 'localhost', port: 3099, path: '/api/tickets/' + tkId, method: 'GET', headers: hdr });
        out.read_ticket = tkR.status === 200 ? 'PASS' : 'FAIL';

        // STATUS: open -> assigned
        const tkS1 = await req({ host: 'localhost', port: 3099, path: '/api/tickets/' + tkId, method: 'PUT' }, { status: 'assigned' }, hdr);
        out.ticket_open_to_assigned = tkS1.status === 200 ? 'PASS' : 'FAIL';

        // STATUS: assigned -> in_progress
        const tkS2 = await req({ host: 'localhost', port: 3099, path: '/api/tickets/' + tkId, method: 'PUT' }, { status: 'in_progress' }, hdr);
        out.ticket_assigned_to_progress = tkS2.status === 200 ? 'PASS' : 'FAIL';

        // STATUS: in_progress -> closed
        const tkS3 = await req({ host: 'localhost', port: 3099, path: '/api/tickets/' + tkId, method: 'PUT' }, { status: 'closed' }, hdr);
        out.ticket_progress_to_closed = tkS3.status === 200 ? 'PASS' : 'FAIL';

        // READ after close
        const tkR2 = await req({ host: 'localhost', port: 3099, path: '/api/tickets/' + tkId, method: 'GET', headers: hdr });
        out.ticket_closed_read = tkR2.status === 200 && tkR2.body?.data?.status === 'closed' ? 'PASS' : 'FAIL';

        // SEARCH
        const tkSearch = await req({ host: 'localhost', port: 3099, path: '/api/tickets?search=ProdWF2', method: 'GET', headers: hdr });
        out.search_tickets = tkSearch.status === 200 && tkSearch.body.data?.length > 0 ? 'PASS (found ' + tkSearch.body.data.length + ')' : 'FAIL';

        // FILTER
        const tkFilter = await req({ host: 'localhost', port: 3099, path: '/api/tickets?status=closed', method: 'GET', headers: hdr });
        out.filter_tickets = tkFilter.status === 200 ? 'PASS' : 'FAIL';

        // STATS
        const tkStats = await req({ host: 'localhost', port: 3099, path: '/api/tickets/stats', method: 'GET', headers: hdr });
        out.ticket_stats = tkStats.status === 200 && tkStats.body?.data ? 'PASS' : 'FAIL';

        // TECHNICIANS list (linked)
        const techs = await req({ host: 'localhost', port: 3099, path: '/api/technicians?limit=10', method: 'GET', headers: hdr });
        out.technicians_list = techs.status === 200 ? 'PASS' : 'FAIL';

        // REPAIRS list
        const reps = await req({ host: 'localhost', port: 3099, path: '/api/repairs?limit=5', method: 'GET', headers: hdr });
        out.repairs_list = reps.status === 200 ? 'PASS' : 'FAIL';

        // COMPLAINT stats
        const compStats = await req({ host: 'localhost', port: 3099, path: '/api/complaints/stats', method: 'GET', headers: hdr });
        out.complaint_stats = compStats.status === 200 ? 'PASS' : 'FAIL';

        // PAGINATION test
        const tkPage = await req({ host: 'localhost', port: 3099, path: '/api/tickets?limit=5&offset=0', method: 'GET', headers: hdr });
        out.tickets_pagination = tkPage.status === 200 ? 'PASS' : 'FAIL';

        // RECENT tickets
        const tkRecent = await req({ host: 'localhost', port: 3099, path: '/api/tickets/recent?limit=5', method: 'GET', headers: hdr });
        out.tickets_recent = tkRecent.status === 200 ? 'PASS' : 'FAIL';
      }
    }
  }

  const wf2Report = {
  suite: 'Workflow2',
  timestamp: new Date().toISOString(),
  results: out,
  passCount: Object.values(out).filter(v => v === 'PASS').length,
  failCount: Object.values(out).filter(v => v.startsWith('FAIL')).length,
  total: Object.keys(out).length,
  verdict: Object.values(out).filter(v => v.startsWith('FAIL')).length === 0 ? 'PASS' : 'FAIL'
};
fs.writeFileSync('C:/Users/Admin/Desktop/Calude Test/erp-app/_results_wf2.json', JSON.stringify(wf2Report, null, 2));
console.log(JSON.stringify(wf2Report, null, 2));
  process.exit(0);
})();
