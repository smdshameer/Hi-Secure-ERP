import urllib.request, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    'https://services.gst.gov.in/services/captcha',
    'https://services.gst.gov.in/services/captchaImage',
    'https://services.gst.gov.in/services/captcha?rnd=12345',
    'https://services.gst.gov.in/services/api/captcha',
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://services.gst.gov.in/services/searchtp',
            'Accept': 'image/webp,image/apng,*/*'
        })
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            data = r.read()
            ct = r.headers.get('Content-Type', '?')
            print(f"URL: {url}")
            print(f"  STATUS: {r.status}  CT: {ct}  BYTES: {len(data)}")
            if 'image' in ct:
                print("  => GOT IMAGE!")
            else:
                print(f"  => TEXT: {data[:200]}")
    except Exception as e:
        print(f"URL: {url} -> ERROR: {e}")
