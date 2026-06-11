#!/usr/bin/env python3
import urllib.request, urllib.error, json

BASE = 'http://localhost:3099'

# Direct Python request test
url = BASE + '/api/auth/login'
data = json.dumps({'username': 'admin', 'password': 'admin@123'}).encode()
print(f'URL: {url}')
print(f'Data: {data}')

req = urllib.request.Request(url, data=data, headers={
    'Content-Type': 'application/json',
}, method='POST')

try:
    resp = urllib.request.urlopen(req, timeout=8)
    print(f'Status: {resp.status}')
    print(f'Headers: {dict(resp.headers)}')
    print(f'Body: {resp.read().decode()[:200]}')
except urllib.error.HTTPError as e:
    print(f'HTTPError: {e.code}')
    print(f'Body: {e.read().decode()[:200]}')
except Exception as e:
    print(f'Error: {type(e).__name__}: {e}')
