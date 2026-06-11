#!/usr/bin/env python3
import http.client, json, time, re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'localhost:3099'
COOKIE_FILE = 'C:/Users/Admin/Desktop/Calude Test/erp-app/.cookie.txt'
cookie_str = ''

def save_cookie(headers):
    global cookie_str
    raw = headers.get('Set-Cookie', '')
    m = re.search(r'hisecure\.sid=([^;]+)', raw)
    if m:
        cookie_str = 'hisecure.sid=' + m[1]
        with open(COOKIE_FILE, 'w') as f:
            f.write(cookie_str)
        print(f'  [COOKIE SAVED] {cookie_str[:50]}...')

def req_debug(method, path):
    global cookie_str
    print(f'  [REQ] {method} {path} cookie={cookie_str[:40] if cookie_str else "NONE"}')
    conn = http.client.HTTPConnection('localhost', 3099, timeout=5)
    hdrs = {
        'Content-Type': 'application/json',
        'Connection': 'close',
    }
    if cookie_str:
        hdrs['Cookie'] = cookie_str
    conn.request(method, path, headers=hdrs)
    resp = conn.getresponse()
    body = resp.read().decode()
    save_cookie(resp.headers)
    print(f'  [RESP] status={resp.status} body={body[:80]}')
    conn.close()
    try:
        return resp.status, json.loads(body)
    except:
        return resp.status, body

# Step by step
print('Step 1: Login')
code, body = req_debug('POST', '/api/auth/login')
print()

print('Step 2: Users')
code, body = req_debug('GET', '/api/users?limit=1')
print()

print('Step 3: Dashboard')
code, body = req_debug('GET', '/api/dashboard')
print()

print('Step 4: Customers')
code, body = req_debug('GET', '/api/customers?limit=1')
print()

print('DONE')
