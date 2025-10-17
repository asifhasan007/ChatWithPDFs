import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOADS_FOLDER = os.path.join(BASE_DIR, 'uploads')
VECTOR_STORES_FOLDER = os.path.join(BASE_DIR, 'vector_stores')

MODEL_PATH = r"C:\Users\BS 23- Desktop-00014\Documents\models\Meta-Llama-3.1-8B-Instruct-Q6_K_L.gguf"

EMBEDDING_MODEL_NAME = "sentence-transformers/LaBSE"

RETRIEVER_K = 5

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"  
OCR_LANGUAGES = "eng+ben"  
OCR_CONFIDENCE_THRESHOLD = 60 

POPPLER_PATH = r"C:\Program Files\poppler-25.07.0\Library\bin"