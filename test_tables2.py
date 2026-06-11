import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
chrome_options = Options()
chrome_options.add_argument("--headless=new")
driver = webdriver.Chrome(options=chrome_options)
driver.get("https://services.gst.gov.in/services/searchtp")
data = {}
tables = driver.find_elements("tag name", "table")
for table in tables:
    for row in table.find_elements("tag name", "tr"):
        cols = row.find_elements("tag name", "td")
        if len(cols) >= 2:
            data[cols[0].text] = cols[1].text
print(json.dumps(data))
driver.quit()
