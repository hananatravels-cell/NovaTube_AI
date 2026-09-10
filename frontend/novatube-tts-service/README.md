# NovaTube AI - Free Voice Generation Service

Edge TTS (primary) + Kokoro TTS (fallback), dono fully free.

## Setup (pehli baar)

1. Windows mein ye folder `C:\Users\HP\OneDrive\Desktop\NovaTube_AI\` ke andar rakhein,
   naam de dein: `tts-service`

2. Naya terminal kholein (VS Code mein `Ctrl+` `), us folder mein jayein:
   ```powershell
   cd C:\Users\HP\OneDrive\Desktop\NovaTube_AI\tts-service
   ```

3. Python virtual environment banayein:
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

4. Dependencies install karein:
   ```powershell
   pip install -r requirements.txt
   ```

5. Service chalayein:
   ```powershell
   uvicorn tts_service:app --host 0.0.0.0 --port 8001 --reload
   ```

6. Confirm ho gaya kaam kar raha hai:
   Browser mein kholein: http://127.0.0.1:8001/health
   `{"status":"ok",...}` dikhna chahiye.

## Kokoro TTS (fallback) — optional, baad mein add kar sakte hain

Edge TTS akela bhi bahut acha kaam karta hai, Kokoro sirf backup ke liye hai.
Agar abhi add nahi karte to bhi service chalegi (sirf Edge TTS use hoga).

Baad mein add karne ke liye:
```powershell
pip install kokoro-onnx soundfile
```
Phir model files download karein (kokoro-onnx GitHub releases se)
`kokoro-v0_19.onnx` aur `voices.bin`, isi folder mein rakh dein.

## Har baar chalane ke liye

Do terminals chahiye honge (dono ek sath chalte rehne chahiye):

**Terminal 1 — TTS service:**
```powershell
cd C:\Users\HP\OneDrive\Desktop\NovaTube_AI\tts-service
venv\Scripts\activate
uvicorn tts_service:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 — Next.js app (jaisa pehle chalate the):**
```powershell
cd C:\Users\HP\OneDrive\Desktop\NovaTube_AI\frontend
npm run dev
```