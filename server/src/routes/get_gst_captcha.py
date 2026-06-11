import sys
import json
import time
import os
import base64
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

SCRATCH_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7a31d73d-28ad-417f-b2e7-8f4672dfc889\\scratch"

def make_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1280,800")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(options=chrome_options)

def main(gstin, session_id=None):
    driver = make_driver()
    # Use session_id for the IPC file if provided (matches what Node writes)
    ipc_key = session_id if session_id else gstin
    code_file = os.path.join(SCRATCH_DIR, f"captcha_{ipc_key}.txt")
    
    # Ensure any old code file is removed
    if os.path.exists(code_file):
        try: os.remove(code_file)
        except: pass

    try:
        driver.get("https://services.gst.gov.in/services/searchtp")
        wait = WebDriverWait(driver, 20)

        # Enter GSTIN and trigger blur
        gstin_input = wait.until(EC.presence_of_element_located((By.ID, "for_gstin")))
        gstin_input.clear()
        gstin_input.send_keys(gstin)
        
        # Click search to trigger captcha rendering
        search_btn = wait.until(EC.presence_of_element_located((By.ID, "lotsearch")))
        driver.execute_script("arguments[0].click();", search_btn)

        # Wait for captcha image to load
        captcha_img = wait.until(EC.presence_of_element_located((By.ID, "imgCaptcha")))

        # Wait for natural image dimensions
        for _ in range(30):
            width = driver.execute_script("return arguments[0].naturalWidth;", captcha_img)
            if width and width > 0:
                break
            time.sleep(0.3)

        # Extract base64 via canvas
        base64_data = driver.execute_script("""
            var img = arguments[0];
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        """, captcha_img)

        # Signal captcha image to Node.js
        print(f"__CAPTCHA_START__\n{base64_data}\n__CAPTCHA_END__")
        sys.stdout.flush()

        # Wait for captcha code file
        captcha_code = ""
        for _ in range(120): # wait up to 60 seconds
            if os.path.exists(code_file):
                with open(code_file, "r") as f:
                    captcha_code = f.read().strip()
                try: os.remove(code_file)
                except: pass
                if captcha_code:
                    break
            time.sleep(0.5)
            
        if not captcha_code:
            print(json.dumps({"success": False, "error": "Timeout waiting for captcha code"}))
            return

        # Enter captcha code
        captcha_input = wait.until(EC.presence_of_element_located((By.ID, "fo-captcha")))
        captcha_input.clear()
        captcha_input.send_keys(captcha_code)

        # Click search
        search_btn = wait.until(EC.element_to_be_clickable((By.ID, "lotsearch")))
        driver.execute_script("arguments[0].click();", search_btn)

        # Wait for page to process
        time.sleep(4)

        # Check for error messages
        import re
        page_src = driver.page_source
        if "Enter valid letters" in page_src or "Incorrect CAPTCHA" in page_src or "Invalid Captcha" in page_src:
            print(json.dumps({"success": False, "error": "Incorrect CAPTCHA entered. Please try again."}))
            return

        # Scrape all data
        data = {}
        
        # New GST portal DOM structure (divs with paragraphs)
        info_divs = driver.find_elements(By.CSS_SELECTOR, "div.col-sm-4, div.col-sm-6, div.col-xs-12")
        for div in info_divs:
            ps = div.find_elements(By.TAG_NAME, "p")
            if len(ps) >= 2:
                strong = ps[0].find_elements(By.TAG_NAME, "strong")
                if strong:
                    label = strong[0].text.strip().rstrip(":").strip()
                    val = ps[1].text.strip()
                    if label and val:
                        data[label] = val

        # Fallback to old table structure just in case
        tables = driver.find_elements(By.CLASS_NAME, "table-responsive")
        if not tables:
            tables = driver.find_elements(By.TAG_NAME, "table")

        for table in tables:
            rows = table.find_elements(By.TAG_NAME, "tr")
            for row in rows:
                cols = row.find_elements(By.TAG_NAME, "td")
                if len(cols) >= 2:
                    label = cols[0].text.strip().rstrip(":").strip()
                    val = cols[1].text.strip()
                    if label and val and label not in data:
                        data[label] = val

        if not data:
            print(json.dumps({"success": False, "error": "No taxpayer data found on page."}))
            return

        legal_name = data.get("Legal Name of Business") or data.get("Legal Name") or data.get("Trade Name") or ""
        trade_name = data.get("Trade Name") or legal_name
        display_name = trade_name or legal_name

        full_address = data.get("Principal Place of Business") or data.get("Address") or ""
        full_address = " ".join(full_address.split())

        pin_match = re.search(r'\b\d{6}\b', full_address)
        pincode = pin_match.group(0) if pin_match else ""

        state_code = gstin[:2]
        STATE_MAP = {
            '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
            '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
            '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
            '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
            '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
            '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
            '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
            '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
            '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
            '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
            '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
            '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
        }
        state = STATE_MAP.get(state_code, data.get("State", ""))

        city = ""
        addr_parts = [p.strip() for p in full_address.split(",")]
        if len(addr_parts) >= 2:
            city = addr_parts[-2] if (addr_parts[-1].isdigit() or (state.lower() in addr_parts[-1].lower())) else addr_parts[-1]
        city = city.strip()

        print(json.dumps({
            "success": True,
            "data": {
                "name": display_name,
                "legal_name": legal_name,
                "address": full_address,
                "city": city,
                "state": state,
                "pincode": pincode,
                "gstin": gstin,
                "status": data.get("GSTIN / UIN Status") or data.get("Status") or "Active"
            }
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        driver.quit()

if __name__ == "__main__":
    gstin_arg = sys.argv[1] if len(sys.argv) > 1 else "33AAACA4651L1ZT"
    session_id_arg = sys.argv[2] if len(sys.argv) > 2 else None
    main(gstin_arg.upper().strip(), session_id_arg)
