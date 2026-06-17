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

SCRATCH_DIR = os.environ.get("GST_SCRATCH_DIR", os.path.join(os.path.dirname(__file__), "_scratch"))

def make_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1280,800")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    return webdriver.Chrome(options=chrome_options)

def fetch_captcha_base64_from_page(driver, wait):
    """Extract the captcha image from the already-loaded page as base64."""
    try:
        captcha_img = wait.until(EC.presence_of_element_located((By.ID, "imgCaptcha")))
        # Wait for natural dimensions to be non-zero
        for _ in range(40):
            width = driver.execute_script("return arguments[0].naturalWidth;", captcha_img)
            if width and width > 0:
                break
            time.sleep(0.25)
        else:
            # Try to get src attribute instead
            src = captcha_img.get_attribute("src") or ""
            if "base64," in src:
                return src
            return None

        base64_data = driver.execute_script("""
            var img = arguments[0];
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 120;
            canvas.height = img.naturalHeight || 40;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        """, captcha_img)
        return base64_data
    except Exception as e:
        print(f"[WARN] Could not extract captcha from canvas: {e}", file=sys.stderr)
        return None

def main(gstin, session_id=None):
    os.makedirs(SCRATCH_DIR, exist_ok=True)

    ipc_key = session_id if session_id else gstin
    code_file = os.path.join(SCRATCH_DIR, f"captcha_{ipc_key}.txt")

    # Remove any old IPC file
    if os.path.exists(code_file):
        try: os.remove(code_file)
        except: pass

    driver = None
    try:
        driver = make_driver()
        wait = WebDriverWait(driver, 25)

        # Step 1: Load the GST search page
        driver.get("https://services.gst.gov.in/services/searchtp")

        # Step 2: Enter the GSTIN into the search box
        gstin_input = wait.until(EC.presence_of_element_located((By.ID, "for_gstin")))
        gstin_input.clear()
        gstin_input.send_keys(gstin)
        time.sleep(0.5)

        # Step 3: Click the search button to trigger captcha rendering
        search_btn = wait.until(EC.presence_of_element_located((By.ID, "lotsearch")))
        driver.execute_script("arguments[0].click();", search_btn)

        # Step 4: Wait for captcha image to appear
        time.sleep(1.5)
        base64_data = fetch_captcha_base64_from_page(driver, wait)

        if not base64_data:
            # Try screenshot as fallback
            print(json.dumps({"success": False, "error": "Could not extract captcha image from page"}))
            return

        # Step 5: Send captcha image to Node.js via stdout
        print(f"__CAPTCHA_START__\n{base64_data}\n__CAPTCHA_END__")
        sys.stdout.flush()

        # Step 6: Wait for the user to type and submit the captcha code
        captcha_code = ""
        for _ in range(120):  # 60 seconds timeout
            if os.path.exists(code_file):
                with open(code_file, "r") as f:
                    captcha_code = f.read().strip()
                try: os.remove(code_file)
                except: pass
                if captcha_code:
                    break
            time.sleep(0.5)

        if not captcha_code:
            print(json.dumps({"success": False, "error": "Timeout waiting for captcha input from user"}))
            return

        # Step 7: Enter the captcha code into the captcha input box
        try:
            captcha_input = wait.until(EC.presence_of_element_located((By.ID, "fo-captcha")))
            captcha_input.clear()
            captcha_input.send_keys(captcha_code)
        except Exception:
            # Try alternate captcha field IDs
            for cid in ["captcha", "captchaInput", "fo_captcha"]:
                try:
                    ci = driver.find_element(By.ID, cid)
                    ci.clear()
                    ci.send_keys(captcha_code)
                    break
                except: pass

        # Step 8: Submit the form again
        try:
            search_btn2 = wait.until(EC.element_to_be_clickable((By.ID, "lotsearch")))
            driver.execute_script("arguments[0].click();", search_btn2)
        except Exception:
            # Try form submit
            try:
                driver.execute_script("document.querySelector('form').submit();")
            except: pass

        # Step 9: Wait for the response page to load
        time.sleep(4)

        # Step 10: Check for error messages
        import re
        page_src = driver.page_source
        if "Enter valid letters" in page_src or "Incorrect CAPTCHA" in page_src or "Invalid Captcha" in page_src or "Invalid captcha" in page_src:
            print(json.dumps({"success": False, "error": "Incorrect CAPTCHA entered. Please try again."}))
            return

        if "GSTIN / UIN not found" in page_src or "No record found" in page_src:
            print(json.dumps({"success": False, "error": "GSTIN not found in GST portal records."}))
            return

        # Step 11: Scrape taxpayer data from the results page
        data = {}

        # Try modern GST portal div structure
        info_divs = driver.find_elements(By.CSS_SELECTOR, "div.col-sm-4, div.col-sm-6, div.col-xs-12, div.col-md-6, div.col-md-4")
        for div in info_divs:
            ps = div.find_elements(By.TAG_NAME, "p")
            if len(ps) >= 2:
                strong = ps[0].find_elements(By.TAG_NAME, "strong")
                if strong:
                    label = strong[0].text.strip().rstrip(":").strip()
                    val = ps[1].text.strip()
                    if label and val:
                        data[label] = val

        # Also try table structure
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

        # Try definition lists
        dls = driver.find_elements(By.TAG_NAME, "dl")
        for dl in dls:
            dts = dl.find_elements(By.TAG_NAME, "dt")
            dds = dl.find_elements(By.TAG_NAME, "dd")
            for i, dt in enumerate(dts):
                label = dt.text.strip().rstrip(":")
                val = dds[i].text.strip() if i < len(dds) else ""
                if label and val and label not in data:
                    data[label] = val

        if not data:
            # Last resort: try to get all visible text
            body_text = driver.find_element(By.TAG_NAME, "body").text
            if gstin in body_text or "Legal Name" in body_text or "Trade Name" in body_text:
                print(json.dumps({"success": False, "error": "Taxpayer found but data could not be parsed. Please try again."}))
            else:
                print(json.dumps({"success": False, "error": "No taxpayer data found. The GSTIN may be invalid or not registered."}))
            return

        # Build structured output
        legal_name = (data.get("Legal Name of Business") or data.get("Legal Name") or
                      data.get("Trade Name") or data.get("Taxpayer Name") or "")
        trade_name = data.get("Trade Name") or legal_name
        display_name = trade_name or legal_name

        full_address = (data.get("Principal Place of Business") or data.get("Address") or
                        data.get("Principal Business Address") or "")
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
            '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
            '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
            '37': 'Andhra Pradesh (Amaravati)',
        }
        state = STATE_MAP.get(state_code, data.get("State", data.get("State Jurisdiction", "")))

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
                "status": (data.get("GSTIN / UIN Status") or data.get("Status") or
                           data.get("GST Status") or "Active")
            }
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        if driver:
            try: driver.quit()
            except: pass

if __name__ == "__main__":
    gstin_arg = sys.argv[1] if len(sys.argv) > 1 else "33AAACA4651L1ZT"
    session_id_arg = sys.argv[2] if len(sys.argv) > 2 else None
    main(gstin_arg.upper().strip(), session_id_arg)
