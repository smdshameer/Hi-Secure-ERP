#!/usr/bin/env python3
"""HiSecure ERP -- Production Validation (fresh TCP per request)"""
import http.client, json, time, re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'localhost:3099'
RESULT = 'C:/Users/Admin/Desktop/Calude Test/erp-app/_results_prod.json'
COOKIE_FILE = 'C:/Users/Admin/Desktop/Calude Test/erp-app/.cookie.txt'

cookie_str = ''
pass_count = 0
fail_count = 0
results = {}

def save_cookie(headers):
    """Extract session cookie from response (handles set-cookie string or array)."""
    global cookie_str
    raw = headers.get('set-cookie') or headers.get('Set-Cookie') or ''
    if isinstance(raw, list):
        raw = raw[0] if raw else ''
    m = re.search(r'hisecure\.sid=([^;]+)', raw)
    if m:
        cookie_str = 'hisecure.sid=' + m[1]
        with open(COOKIE_FILE, 'w') as f:
            f.write(cookie_str)

def load_cookie():
    global cookie_str
    if os.path.exists(COOKIE_FILE):
        with open(COOKIE_FILE) as f:
            cookie_str = f.read().strip()

def req(method, path, body=None):
    """Fresh HTTP connection per call -- avoids keep-alive pool bug."""
    global cookie_str
    conn = http.client.HTTPConnection('localhost', 3099, timeout=8)
    hdrs = {
        'Content-Type': 'application/json',
        'Connection': 'close',           # Force new TCP per request
    }
    if cookie_str:
        hdrs['Cookie'] = cookie_str
    data = json.dumps(body).encode() if body else None
    try:
        conn.request(method, path, body=data, headers=hdrs)
        resp = conn.getresponse()
        body_text = resp.read().decode()
        save_cookie(resp.headers)
        try:
            body_json = json.loads(body_text)
        except json.JSONDecodeError:
            body_json = body_text
        return resp.status, body_json
    except Exception as e:
        return 0, {'error': str(e)}
    finally:
        conn.close()

def chk(name, code, detail=''):
    global pass_count, fail_count, results
    ok = (code == 200)
    if ok:
        pass_count += 1
    else:
        fail_count += 1
    results[name] = {'status': code, 'pass': ok, 'detail': detail}
    print(f'  {name}: {"PASS" if ok else "FAIL"} [HTTP {code}] {detail}')

# ---- MAIN ----
load_cookie()
print('=== Login & Session ===')
code, body = req('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin@123'})
print(f'  POST /api/auth/login -> {code} user={body.get("user", {}).get("username", "?")}')
if code != 200:
    print('FATAL: Login failed')
    exit(1)
print(f'  COOKIE: {cookie_str[:50]}...')

print('\n=== RBAC: Module Access ===')
chk('users', *(req('GET', '/api/users?limit=1')))
chk('technicians', *(req('GET', '/api/technicians')))
chk('complaints', *(req('GET', '/api/complaints?limit=1')))
chk('amc_contracts', *(req('GET', '/api/amc/contracts?limit=1')))
chk('repairs', *(req('GET', '/api/repairs?limit=1')))
chk('tickets', *(req('GET', '/api/tickets?limit=1')))
chk('settings', *(req('GET', '/api/settings')))
chk('dashboard', *(req('GET', '/api/dashboard')))
chk('reports', *(req('GET', '/api/reports/stats')))
chk('products', *(req('GET', '/api/products?limit=1')))
chk('customers', *(req('GET', '/api/customers?limit=1')))
chk('payments', *(req('GET', '/api/payments?limit=1')))
chk('parts', *(req('GET', '/api/parts?limit=1')))
chk('suppliers', *(req('GET', '/api/suppliers?limit=1')))
chk('stores', *(req('GET', '/api/stores?limit=1')))
chk('invoices', *(req('GET', '/api/invoices?limit=1')))
chk('accounting', *(req('GET', '/api/accounting?limit=1')))

print('\n=== Workflow 1: Quote -> Invoice -> DC ===')
cust_code, cust_body = req('GET', '/api/customers?limit=1')
cust_id = None
if cust_code == 200 and cust_body.get('data') and cust_body['data']:
    cust_id = cust_body['data'][0].get('customer_id')
    print(f'  Customer: {cust_id}')

if cust_id:
    parts_code, parts_body = req('GET', '/api/parts?limit=1')
    part_id = None
    if parts_code == 200 and parts_body.get('data') and parts_body['data']:
        part_id = parts_body['data'][0].get('part_id')

    q_code, q_body = req('POST', '/api/quotations', {
        'customer_id': cust_id,
        'items': [{'part_id': part_id, 'quantity': 1, 'unit_price': 100, 'discount_percent': 0, 'tax_rate': 18}],
        'terms': 'py-wf1', 'notes': 'prod-test'
    })
    quote_id = None
    if q_code == 200 and q_body.get('data'):
        quote_id = q_body['data'].get('quote_id')
        chk('wf1_quote', q_code, f'quote_id={quote_id}')
    else:
        chk('wf1_quote', q_code, q_body.get('error', 'fail'))

    if quote_id:
        req('PUT', f'/api/quotations/{quote_id}/status', {'status': 'sent'})
        req('PUT', f'/api/quotations/{quote_id}/status', {'status': 'accepted'})
        cv_code, cv_body = req('POST', f'/api/quotations/{quote_id}/convert')
        invoice_id = None
        if cv_code == 200 and cv_body.get('data'):
            invoice_id = cv_body['data'].get('invoice_id')
            chk('wf1_convert', cv_code, f'inv_id={invoice_id}')
        else:
            chk('wf1_convert', cv_code, cv_body.get('error', 'fail'))
        if invoice_id:
            req('POST', f'/api/invoices/{invoice_id}/issue')

        dc_code, dc_body = req('POST', '/api/delivery-challans', {
            'from_location_id': 1, 'to_location_id': 1, 'challan_date': '2026-06-05',
            'items': [{'part_id': part_id, 'quantity': 1}], 'purposes': ['sale']
        })
        dc_id = None
        if dc_code == 200 and dc_body.get('data'):
            dc_id = dc_body['data'].get('delivery_challan_id')
            chk('wf1_dc', dc_code, f'dc_id={dc_id}')
        else:
            chk('wf1_dc', dc_code, dc_body.get('error', 'fail'))
        if dc_id:
            req('PUT', f'/api/delivery-challans/{dc_id}/status', {'status': 'dispatched'})
else:
    print('  SKIP WF1: no customer')

print('\n=== Workflow 2: Complaint -> Ticket ===')
if cust_id:
    c_code, c_body = req('POST', '/api/complaints', {
        'customer_id': cust_id, 'subject': 'py-wf2', 'priority': 'medium', 'category': 'service'
    })
    comp_id = None
    if c_code == 200 and c_body.get('data'):
        comp_id = c_body['data'].get('complaint_id')
        chk('wf2_complaint', c_code, f'comp_id={comp_id}')
    else:
        chk('wf2_complaint', c_code, c_body.get('error', 'fail'))

    if comp_id:
        chk('wf2_comp_read', *(req('GET', f'/api/complaints/{comp_id}')))
        chk('wf2_comp_review', *(req('PUT', f'/api/complaints/{comp_id}/status', {'status': 'under_review'})))
        chk('wf2_comp_resolved', *(req('PUT', f'/api/complaints/{comp_id}/status', {'status': 'resolved', 'resolution': 'py'})))

        t_code, t_body = req('POST', '/api/tickets', {
            'customer_id': cust_id, 'subject': 'py-wf2-tk', 'priority': 'medium',
            'ticket_type': 'service', 'complaint_id': comp_id, 'description': 'py'
        })
        ticket_id = None
        if t_code == 200 and t_body.get('data'):
            ticket_id = t_body['data'].get('ticket_id')
            chk('wf2_ticket', t_code, f'tk_id={ticket_id}')
        else:
            chk('wf2_ticket', t_code, t_body.get('error', 'fail'))

        if ticket_id:
            chk('wf2_tk_read', *(req('GET', f'/api/tickets/{ticket_id}')))
            chk('wf2_tk_assigned', *(req('PUT', f'/api/tickets/{ticket_id}', {'status': 'assigned'})))
            chk('wf2_tk_progress', *(req('PUT', f'/api/tickets/{ticket_id}', {'status': 'in_progress'})))
            chk('wf2_tk_closed', *(req('PUT', f'/api/tickets/{ticket_id}', {'status': 'closed'})))
else:
    print('  SKIP WF2: no customer')

print('\n=== Workflow 3: AMC ===')
if cust_id:
    a_code, a_body = req('POST', '/api/amc/contracts', {
        'customer_id': cust_id, 'contract_type': 'annual',
        'start_date': '2026-01-01', 'end_date': '2027-01-01', 'terms': 'py-wf3'
    })
    amc_id = None
    if a_code == 200 and a_body.get('data'):
        amc_id = a_body['data'].get('amc_id')
        chk('wf3_amc', a_code, f'amc_id={amc_id}')
    else:
        chk('wf3_amc', a_code, a_body.get('error', 'fail'))

    if amc_id:
        chk('wf3_amc_read', *(req('GET', f'/api/amc/contracts/{amc_id}')))
        chk('wf3_activate', *(req('POST', f'/api/amc/contracts/{amc_id}/activate')))

        as_code, as_body = req('POST', '/api/amc/assets', {
            'amc_id': amc_id, 'asset_type': 'equipment',
            'serial_number': f'py-{int(time.time())}', 'is_active': True
        })
        asset_id = None
        if as_code == 200 and as_body.get('data'):
            asset_id = as_body['data'].get('asset_id')
            chk('wf3_asset', as_code, f'asset_id={asset_id}')
        else:
            chk('wf3_asset', as_code, as_body.get('error', 'fail'))

        if asset_id:
            chk('wf3_asset_read', *(req('GET', f'/api/amc/assets/{asset_id}')))
            chk('wf3_asset_list', *(req('GET', f'/api/amc/assets?amc_id={amc_id}')))

        chk('wf3_stats', *(req('GET', '/api/amc/stats')))
        chk('wf3_update', *(req('PUT', f'/api/amc/contracts/{amc_id}', {'terms': 'py-up'})))
        chk('wf3_filter', *(req('GET', f'/api/amc/contracts?customer_id={cust_id}')))
else:
    print('  SKIP WF3: no customer')

# ---- SUMMARY ----
total = pass_count + fail_count
verdict = 'PASS' if fail_count == 0 else 'FAIL'
report = {
    'suite': 'ProductionValidation',
    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'server': 'http://localhost:3099',
    'pass': pass_count,
    'fail': fail_count,
    'total': total,
    'verdict': verdict,
    'results': results
}
with open(RESULT, 'w') as f:
    json.dump(report, f, indent=2)

print(f'\n{"="*50}')
print(f'RESULTS: {pass_count}/{total} PASS, {fail_count} FAIL')
print(f'Verdict: {verdict}')
print(f'File: {RESULT}')
print(f'{"="*50}')
