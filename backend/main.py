from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
from ultralytics import YOLO
import os
import base64
import io
from PIL import Image
from google import genai

app = FastAPI()

# Configure Gemini API
api_key = os.getenv('GOOGLE_API_KEY')
try:
    client = genai.Client(api_key=api_key)
    models = client.models.list()
    vision_models = [m for m in models if 'vision' in m.display_name.lower() or 'flash' in m.display_name.lower()]
    if vision_models:
        model_name = vision_models[0].name
        print(f"Gemini configured successfully, using model: {model_name}")
    else:
        model_name = None
        print("No vision model found")
except Exception as e:
    print(f"Gemini configuration failed: {e}")
    client = None
    model_name = None

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
try:
    car_model = YOLO('yolov8n.pt')  # YOLOv8n for car detection
    print("Car model loaded successfully")
except Exception as e:
    print(f"Error loading car model: {e}")

plate_model_path = 'best.pt'  # Custom plate model
try:
    if os.path.exists(plate_model_path):
        print(f"Plate model file found at {plate_model_path}")
        plate_model = YOLO(plate_model_path)
        print("Plate model loaded successfully")
    else:
        print(f"Plate model file NOT found at {plate_model_path}")
        # Fallback or error?
        # Let's try to load it anyway, maybe YOLO handles relative paths differently or it's in a different location
        plate_model = YOLO(plate_model_path) 
except Exception as e:
    print(f"Error loading plate model: {e}")
    plate_model = None

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_path = "temp.jpg"
    with open(temp_path, "wb") as buffer:
        contents = await file.read()
        buffer.write(contents)

    # Load image
    img = cv2.imread(temp_path)

    # Detect cars
    car_results = car_model(img, conf=0.5)
    cars = []
    for result in car_results:
        for box in result.boxes:
            cls_name = result.names[int(box.cls)]
            if cls_name in ['car', 'truck', 'bus', 'motorcycle']:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cars.append([int(x1), int(y1), int(x2), int(y2)])
    print(f"Cars detected: {len(cars)}")

    # For each car, detect plate
    plates = []
    plate_texts = []
    plate_images = []
    car_brands = []
    for car_box in cars:
        x1, y1, x2, y2 = car_box
        car_crop = img[y1:y2, x1:x2]

        # Detect car brand using Gemini
        brand_text = "Unknown"
        if client and model_name:
            try:
                car_pil = Image.fromarray(cv2.cvtColor(car_crop, cv2.COLOR_BGR2RGB))
                brand_prompt = (
                    "Identifie la marque et le modèle de la voiture dans cette image. "
                    "Renvoie uniquement la marque et le modèle (par exemple, 'Peugeot 208'). "
                    "Si tu n'es pas sûr, renvoie 'Inconnu'."
                )
                brand_response = client.models.generate_content(
                    model=model_name,
                    contents=[car_pil, brand_prompt]
                )
                brand_text = brand_response.text.strip() if brand_response.text else "Inconnu"
            except Exception as e:
                print(f"Gemini Car Brand detection failed: {e}")
        car_brands.append(brand_text)

        if plate_model:
            plate_results = plate_model(car_crop, conf=0.5)
            plate_found = False
            for result in plate_results:
                if plate_found:
                    break
                for box in result.boxes:
                    px1, py1, px2, py2 = box.xyxy[0].tolist()
                    plate_crop = car_crop[int(py1):int(py2), int(px1):int(px2)]
                    # Encode plate image
                    _, plate_buffer = cv2.imencode('.jpg', plate_crop)
                    plate_b64 = base64.b64encode(plate_buffer).decode('utf-8')
                    plate_images.append(plate_b64)
                    # OCR on plate using Gemini
                    if client and model_name:
                        try:
                            pil_image = Image.fromarray(cv2.cvtColor(plate_crop, cv2.COLOR_BGR2RGB))
                            prompt = (
                                "Extrais et renvoie **uniquement** le code de la plaque d'immatriculation "
                                "dans l'image. Ne donne aucun commentaire, préfixe, ou explication. "
                                "Renvoie seulement la chaîne de caractères (par exemple, 123-AB-45)."
                            )
                            response = client.models.generate_content(
                                model=model_name,
                                contents=[pil_image, prompt]
                            )
                            text = response.text.strip() if response.text else ""
                        except Exception as e:
                            print(f"Gemini OCR failed: {e}")
                            text = ""
                    else:
                        text = "Gemini not configured"
                    plates.append({
                        'car_box': car_box,
                        'plate_box': [int(px1 + x1), int(py1 + y1), int(px2 + x1), int(py2 + y1)]
                    })
                    plate_texts.append(text)
                    plate_found = True
                    break
        else:
            print("Plate model not loaded, skipping plate detection")
    print(f"Plates detected: {len(plates)}, Texts: {plate_texts}")

    # Draw boxes on image
    for car in cars:
        cv2.rectangle(img, (car[0], car[1]), (car[2], car[3]), (0, 0, 255), 2)  # Red for cars
    for plate in plates:
        plate_box = plate['plate_box']
        cv2.rectangle(img, (plate_box[0], plate_box[1]), (plate_box[2], plate_box[3]), (255, 0, 0), 2)  # Blue for plates

    # Encode image to base64
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = buffer.tobytes()
    img_b64 = base64.b64encode(img_base64).decode('utf-8')

    # Clean up
    os.remove(temp_path)

    return JSONResponse(content={
        "image": img_b64,
        "cars": len(cars),
        "plates": len(plates),
        "plate_texts": plate_texts,
        "plate_images": plate_images,
        "car_brands": car_brands
    })