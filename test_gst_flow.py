"""
Test script to understand GST portal's HTTP API for captcha + GSTIN lookup.
Run: python test_gst_flow.py
"""
import urllib.request, urllib.parse, ssl, json, base64, http.cookiejar

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Use a cookie jar to maintain session
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ctx),
    urllib.request.HTTPCookieProcessor(cj)
)

BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://services.gst.gov.in/services/searchtp',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
}

# Step 1: Visit the search page to get session cookies
print("Step 1: Loading search page...")
req = urllib.request.Request('https://services.gst.gov.in/services/searchtp', headers=BASE_HEADERS)
with opener.open(req, timeout=15) as r:
    print(f"  Status: {r.status}")
    print(f"  Cookies: {[c.name + '=' + c.value[:20] for c in cj]}")

# Step 2: Fetch captcha image
print("\nStep 2: Fetching captcha...")
import random
rnd = random.randint(10000, 99999)
req2 = urllib.request.Request(
    f'https://services.gst.gov.in/services/captcha?rnd={rnd}',
    headers={**BASE_HEADERS, 'Accept': 'image/webp,image/apng,image/*,*/*'}
)
with opener.open(req2, timeout=15) as r:
    captcha_bytes = r.read()
    print(f"  Status: {r.status}")
    print(f"  Content-Type: {r.headers.get('Content-Type')}")
    print(f"  Captcha size: {len(captcha_bytes)} bytes")
    b64 = base64.b64encode(captcha_bytes).decode()
    print(f"  Base64 prefix: data:image/png;base64,{b64[:50]}...")
    # Save to file to view
    with open('C:/Users/Admin/Desktop/Calude Test/erp-app/captcha_sample.png', 'wb') as f:
        f.write(captcha_bytes)
    print("  Saved to captcha_sample.png")

# Step 3: Try to look up GSTIN via the API
print("\nStep 3: Testing GSTIN lookup API endpoints...")
test_gstin = "29AADCB2230M1ZP"  # Sample GSTIN

for url, method, data in [
    (f'https://services.gst.gov.in/services/api/search/taxpayerDetails?gstin={test_gstin}', 'GET', None),
    (f'https://services.gst.gov.in/services/api/search/taxpayerDetailsGST?gstin={test_gstin}&captcha=TESTX', 'GET', None),
    ('https://services.gst.gov.in/services/api/search/taxpayerDetails', 'POST', json.dumps({'gstin': test_gstin, 'captcha': 'TESTX'}).encode()),
]:
    try:
        h = {**BASE_HEADERS, 'Content-Type': 'application/json'} if method == 'POST' else BASE_HEADERS
        req3 = urllib.request.Request(url, data=data, headers=h, method=method)
        with opener.open(req3, timeout=10) as r:
            body = r.read()
            ct = r.headers.get('Content-Type', '?')
            print(f"  {method} {url[:80]}")
            print(f"    Status: {r.status}  CT: {ct}  Bytes: {len(body)}")
            print(f"    Body: {body[:300]}")
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"  {method} {url[:80]}")
        print(f"    HTTP Error: {e.code}  Body: {body[:200]}")
    except Exception as e:
        print(f"  {method} {url[:80]} -> ERROR: {e}")
