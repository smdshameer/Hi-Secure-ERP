from selenium import webdriver
from selenium.webdriver.chrome.options import Options
chrome_options = Options()
chrome_options.add_argument("--headless=new")
driver = webdriver.Chrome(options=chrome_options)
driver.get("https://services.gst.gov.in/services/searchtp")
tables = driver.find_elements("tag name", "table")
print(len(tables))
driver.quit()
