import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOADS_FOLDER = os.path.join(BASE_DIR, 'uploads')
VECTOR_STORES_FOLDER = os.path.join(BASE_DIR, 'vector_stores')

MODEL_PATH = r"C:\path\to\your\models\Meta-Llama-3-8B-Instruct.Q4_K_M.gguf"

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

SIMILARITY_THRESHOLD = 0.60
RETRIEVER_K = 10