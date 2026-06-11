#!/usr/bin/env python3
import http.client, json, re, time

def req(method, path, cookie=''):
    conn = http.client.HTTPConnection('localhost', 3099, timeout=60)
    hdrs = {'Content-Type': 'application/json', 'Connection': 'close'}
    if cookie:
        hdrs['Cookie'] = cookie
    t0 = time.time()
    try:
        conn.request(method, path, headers=hdrs)
        resp = conn.getresponse()
        body = resp.read().decode()
        print(f'  <- {resp.status} ({time.time()-t0:.1f}s) body={body[:100]}')
        return resp.status, body
    except Exception as e:
        print(f'  <- ERROR ({time.time()-t0:.1f}s): {type(e).__name__}: {e}')
        return 0, str(e)
    finally:
        conn.close()

print('Step 1: Login')
status, body = req('POST', '/api/auth/login', '')
print(f'  status={status}')

print('\nStep 2: GET /api/users (60s timeout)')
time.sleep(0.5)
# Use token from the successful curl response
cookie = 'hisecure.sid=eyJ1c2VyIjp7ImlkIjozOTMsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifSwidHMiOjE3ODA2NjA2ODg4MTR9.B8KscFDmd-91y8lxpaEZnUpMeYlXE3fRKDMylgMiAe8'
status, body = req('GET', '/api/users?limit=1', cookie)
print(f'  FINAL status={status}')
