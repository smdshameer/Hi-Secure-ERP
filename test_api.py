import requests
import json
import time

def fetch_captcha():
    r = requests.get('http://localhost:3014/api/customers/captcha?gstin=33AAACA4651L1ZT')
    return r.json()

def verify(session_id, captcha_code):
    r = requests.get(f'http://localhost:3014/api/customers/gstin/33AAACA4651L1ZT?captcha={captcha_code}&session_id={session_id}')
    return r.json()

c = fetch_captcha()
print('SESSION:', c['sessionId'])
print('IMAGE BASE64 START')
print(c['image'])
print('IMAGE BASE64 END')
