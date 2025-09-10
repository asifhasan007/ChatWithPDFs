import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOADS_FOLDER = os.path.join(BASE_DIR, 'uploads')
VECTOR_STORES_FOLDER = os.path.join(BASE_DIR, 'vector_stores')

MODEL_PATH = r"C:\Users\BS 23- Desktop-00014\Documents\models\Meta-Llama-3-8B-Instruct.Q4_K_M.gguf"

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

SIMILARITY_THRESHOLD = 0.10
RETRIEVER_K = 10