import requests
import time

try:
    print('Fetching new captcha...')
    r = requests.get('http://localhost:3014/api/customers/captcha?gstin=33AAACA4651L1ZT')
    c = r.json()
    if 'sessionId' in c:
        print('Ready for verification. Session:', c['sessionId'])
    else:
        print('Error:', c)
except Exception as e:
    print('Failed:', e)
