from bs4 import BeautifulSoup
import re
import json

html = open(r'C:\Users\Admin\.gemini\antigravity\brain\7a31d73d-28ad-417f-b2e7-8f4672dfc889\scratch\debug_html.html', encoding='utf-8').read()

data = {}

# We'll use regex since BeautifulSoup isn't installed
# Find all divs that look like they have a <p><strong>Label</strong></p> <p>Value</p>
blocks = re.findall(r'<div[^>]*>.*?<p>\s*<strong[^>]*>(.*?)</strong>\s*</p>\s*<p[^>]*>(.*?)</p>.*?</div>', html, re.DOTALL | re.IGNORECASE)

for label, val in blocks:
    label = re.sub(r'<[^>]+>', '', label).strip().rstrip(':').strip()
    val = re.sub(r'<[^>]+>', '', val).strip()
    if label and val:
         data[label] = val

print(json.dumps(data, indent=2))
