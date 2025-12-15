# ANPR App (Automatic Number Plate Recognition)

A web application for detecting cars, license plates, and extracting plate text using AI.

## Features

- Car detection using YOLOv8
- License plate detection using custom YOLO model
- Text extraction from plates using Google Gemini AI
- Car brand recognition
- Web interface with image upload
- History of analyses

## Prerequisites

- Python 3.8+
- Node.js 14+
- Google Cloud API key with Gemini enabled

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/anpr-app.git
   cd anpr-app
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. Download the Tunisian plate detection model:
   - Place the model file at `../../../projet/ANPR_models/tunisian_plate_detector/weights/best.pt` relative to the backend folder
   - Or update the path in `backend/main.py`

## Usage

1. Start the backend:
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Start the frontend (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```

3. Open http://localhost:3000 in your browser

4. Upload an image to detect cars and plates

## API Key Setup

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Create a new project or select existing
3. Enable the Gemini API
4. Create an API key
5. Add it to your `.env` file as `GOOGLE_API_KEY`

## Project Structure

```
anpr-app/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt     # Python dependencies
│   └── yolov8n.pt          # YOLOv8 nano model
├── frontend/
│   ├── src/                # React source code
│   ├── public/             # Static files
│   └── package.json        # Node dependencies
├── .gitignore
├── .env.example
└── README.md
```

## Technologies Used

- Backend: FastAPI, OpenCV, Ultralytics YOLO, Google Gemini AI
- Frontend: React, CSS
- AI: YOLOv8 for detection, Gemini for OCR

## License

MIT License