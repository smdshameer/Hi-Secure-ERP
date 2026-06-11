#!/usr/bin/env python3
import http.client, json, time, re, os, sys, socket
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'localhost'
PORT = 3099
COOKIE_FILE = 'C:/Users/Admin/Desktop/Calude Test/erp-app/.cookie.txt'
cookie_str = ''

def save_cookie(headers):
    global cookie_str
    raw = headers.get('set-cookie') or headers.get('Set-Cookie') or ''
    print(f'  [RAW COOKIE HEADER] {raw[:100]}')
    m = re.search(r'hisecure\.sid=([^;]+)', raw)
    if m:
        cookie_str = 'hisecure.sid=' + m[1]
        with open(COOKIE_FILE, 'w') as f:
            f.write(cookie_str)
        print(f'  [COOKIE SAVED] {cookie_str[:50]}...')
    else:
        print('  [NO COOKIE MATCH]')

def req(method, path, body=None, label=''):
    global cookie_str
    lbl = f'[{label}] ' if label else ''
    print(f'  {lbl}{method} {path} | cookie={cookie_str[:40] if cookie_str else "none"}')
    try:
        conn = http.client.HTTPConnection(BASE, PORT, timeout=3)
        hdrs = {'Content-Type': 'application/json', 'Connection': 'close'}
        if cookie_str:
            hdrs['Cookie'] = cookie_str
        data = json.dumps(body).encode() if body else b''
        print(f'  {lbl}Sending {len(data)} bytes...')
        conn.request(method, path, body=data if data else None, headers=hdrs)
        print(f'  {lbl}Request sent, waiting for response...')
        resp = conn.getresponse()
        body_text = resp.read().decode()
        print(f'  {lbl}Got response: status={resp.status} body_len={len(body_text)} body={body_text[:80]}')
        save_cookie(resp.headers)
        conn.close()
        try:
            return resp.status, json.loads(body_text)
        except:
            return resp.status, body_text
    except socket.timeout:
        print(f'  {lbl}TIMEOUT after 3s')
        return 0, {'error': 'timeout'}
    except Exception as e:
        print(f'  {lbl}ERROR: {type(e).__name__}: {e}')
        return 0, {'error': str(e)}

# Test
print('=== Step 1: Login ===')
code, body = req('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin@123'}, 'LOGIN')
print(f'Result: {code} {body.get("user",{}).get("username","?")}')
print()

print('=== Step 2: Users (with cookie) ===')
time.sleep(0.5)
code, body = req('GET', '/api/users?limit=1', label='USERS')
print(f'Result: {code}')
print()

print('=== Step 3: Try with explicit cookie header ===')
time.sleep(0.5)
# Force manual cookie
conn = http.client.HTTPConnection(BASE, PORT, timeout=5)
conn.request('GET', '/api/users?limit=1', headers={
    'Cookie': 'hisecure.sid=eyJ1c2VyIjp7ImlkIjozOTMsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifSwidHMiOjE3ODA2NTg4NzE1MDl9.gvZPoxvNBeJlvCB6VJcHqMfsf52OuMP56uRzVqQMXFA',
    'Connection': 'close'
})
resp = conn.getresponse()
body = resp.read().decode()
print(f'Result: status={resp.status} body={body[:100]}')
conn.close()
