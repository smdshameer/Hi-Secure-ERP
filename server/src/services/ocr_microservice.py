import sys
import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import fitz  # PyMuPDF
from PIL import Image
import io
import numpy as np

app = FastAPI(title="HiSecure ERP OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global OCR instance
ocr_instance = None

try:
    # Initialize PaddleOCR at startup
    ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", enable_mkldnn=False)
    # Warm up models
    print("Warming up PaddleOCR models...", file=sys.stderr)
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    ocr_instance.predict(dummy_img)
    print("PaddleOCR models successfully warmed up!", file=sys.stderr)
except Exception as e:
    print(f"Failed to initialize PaddleOCR: {e}", file=sys.stderr)

@app.get("/ocr/health")
async def health():
    memory_usage_bytes = 0
    try:
        import psutil
        process = psutil.Process()
        memory_usage_bytes = process.memory_info().rss
    except Exception:
        try:
            import ctypes
            class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
                _fields_ = [
                    ("cb", ctypes.c_ulong),
                    ("PageFaultCount", ctypes.c_ulong),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t),
                ]
            GetProcessMemoryInfo = ctypes.windll.psapi.GetProcessMemoryInfo
            GetCurrentProcess = ctypes.windll.kernel32.GetCurrentProcess
            counters = PROCESS_MEMORY_COUNTERS()
            counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
            if GetProcessMemoryInfo(GetCurrentProcess(), ctypes.byref(counters), counters.cb):
                memory_usage_bytes = counters.WorkingSetSize
        except Exception:
            pass

    return {
        "status": "healthy" if ocr_instance is not None else "unhealthy",
        "engine": "paddleocr",
        "loaded": ocr_instance is not None,
        "memory_usage_bytes": memory_usage_bytes
    }

@app.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...)):
    if ocr_instance is None:
        raise HTTPException(status_code=503, detail="OCR engine not loaded")
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(image)
        
        # Run PaddleOCR
        result = ocr_instance.predict(img_np)
        
        extracted_text = []
        regions = []
        if result and result[0]:
            item = result[0]
            rec_texts = item.get("rec_texts", [])
            rec_scores = item.get("rec_scores", [])
            rec_boxes = item.get("rec_boxes", [])
            for i in range(len(rec_texts)):
                text = rec_texts[i]
                confidence = float(rec_scores[i])
                box = rec_boxes[i]
                box_list = box.tolist() if hasattr(box, 'tolist') else box
                extracted_text.append(text)
                regions.append({"text": text, "confidence": confidence, "box": box_list})
                
        full_text = "\n".join(extracted_text)
        return {
            "text": full_text, 
            "regions": regions, 
            "confidence": sum(r["confidence"] for r in regions) / len(regions) if regions else 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ocr/pdf")
async def ocr_pdf(file: UploadFile = File(...)):
    if ocr_instance is None:
        raise HTTPException(status_code=503, detail="OCR engine not loaded")
    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        
        full_text_pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=75)
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data)).convert("RGB")
            img_np = np.array(image)
            
            result = ocr_instance.predict(img_np)
            page_text = []
            if result and result[0]:
                item = result[0]
                rec_texts = item.get("rec_texts", [])
                for text in rec_texts:
                    page_text.append(text)
            full_text_pages.append("\n".join(page_text))
            
        full_text = "\n--- PAGE BREAK ---\n".join(full_text_pages)
        return {"text": full_text, "pages": len(doc)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("ocr_microservice:app", host="127.0.0.1", port=5050, reload=False)
