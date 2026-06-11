from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import json
chrome_options = Options()
chrome_options.add_argument("--headless=new")
driver = webdriver.Chrome(options=chrome_options)
driver.get("https://services.gst.gov.in/services/searchtp")
time.sleep(2)

gstin_input = driver.find_element(By.ID, "for_gstin")
gstin_input.send_keys("33CMAPM9758H1ZQ")

search_btn = driver.find_element(By.ID, "lotsearch")
driver.execute_script("arguments[0].click();", search_btn)
time.sleep(2)

data = {}
tables = driver.find_elements(By.CLASS_NAME, "table-responsive")
if not tables:
    tables = driver.find_elements(By.TAG_NAME, "table")
for table in tables:
    rows = table.find_elements(By.TAG_NAME, "tr")
    for row in rows:
        cols = row.find_elements(By.TAG_NAME, "td")
        if len(cols) >= 2:
            label = cols[0].text.strip().rstrip(':').strip()
            val = cols[1].text.strip()
            if label and val:
                data[label] = val
print(json.dumps(data))
driver.quit()
