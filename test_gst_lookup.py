"""
Find the correct GSTIN lookup endpoint for the GST portal.
The form at https://services.gst.gov.in/services/searchtp
submits via Angular/JS, so we need to trace the actual API call.
"""
import urllib.request, urllib.parse, ssl, http.cookiejar, json, base64, random

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ctx),
    urllib.request.HTTPCookieProcessor(cj)
)

BASE = 'https://services.gst.gov.in'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

# Step 1: Get the main page (establishes session cookies)
print("Step 1: Getting session cookies...")
req = urllib.request.Request(f'{BASE}/services/searchtp', headers={
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml',
})
with opener.open(req, timeout=15) as r:
    body = r.read().decode('utf-8', errors='ignore')
    print(f"  Cookies: {[c.name for c in cj]}")

# Step 2: Fetch captcha
print("\nStep 2: Fetching captcha image...")
rnd = random.random()
req2 = urllib.request.Request(f'{BASE}/services/captcha?rnd={rnd}', headers={
    'User-Agent': UA,
    'Referer': f'{BASE}/services/searchtp',
    'Accept': 'image/png,image/*',
})
with opener.open(req2, timeout=15) as r:
    captcha_bytes = r.read()
    print(f"  Got {len(captcha_bytes)} bytes of captcha image")

# The captcha we see is embedded as an <img src="/services/captcha"> 
# The form POST goes to services/api/search/taxpayerDetails
# Let's try with proper headers including X-Requested-With and correct content type

print("\nStep 3: Testing taxpayer lookup API with correct headers...")
test_gstin = "29AADCB2230M1ZP"
test_captcha = "ABCDE"  # Will be wrong captcha but tests connectivity

for endpoint, payload in [
    ('/services/taxpayerDetails', None),  # GET
    ('/services/api/search', None),  # GET
]:
    try:
        url = f'{BASE}{endpoint}?gstin={test_gstin}' if payload is None else f'{BASE}{endpoint}'
        req3 = urllib.request.Request(url, headers={
            'User-Agent': UA,
            'Referer': f'{BASE}/services/searchtp',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
        }, method='GET')
        with opener.open(req3, timeout=10) as r:
            b = r.read()
            print(f"  GET {endpoint}: {r.status} {r.headers.get('Content-Type','?')} {len(b)}b")
            print(f"    {b[:300]}")
    except urllib.error.HTTPError as e:
        b = e.read()
        print(f"  GET {endpoint}: HTTP {e.code}  {b[:200]}")
    except Exception as e:
        print(f"  GET {endpoint}: ERROR {e}")

# Try submitting actual form data
print("\nStep 4: Try form submission (POST with captcha)...")
form_data = urllib.parse.urlencode({'gstin': test_gstin, 'captcha': test_captcha, 'action': 'search'}).encode()
try:
    req4 = urllib.request.Request(f'{BASE}/services/searchtp', data=form_data, headers={
        'User-Agent': UA,
        'Referer': f'{BASE}/services/searchtp',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
    }, method='POST')
    with opener.open(req4, timeout=10) as r:
        b = r.read()
        print(f"  POST searchtp: {r.status}  {len(b)}b")
        print(f"    {b[:500]}")
except urllib.error.HTTPError as e:
    b = e.read()
    print(f"  POST searchtp: HTTP {e.code}  {b[:300]}")
except Exception as e:
    print(f"  POST searchtp: ERROR {e}")
