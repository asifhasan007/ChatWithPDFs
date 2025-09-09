import logging
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import LlamaCpp
from config import EMBEDDING_MODEL_NAME, MODEL_PATH

logger = logging.getLogger(__name__)

def load_models():
    try:
        logger.info("Initializing embedding model...")
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME, 
            model_kwargs={'device': 'cuda'}
        )
        
        logger.info("Initializing LLM...")
        llm = LlamaCpp(
            model_path=MODEL_PATH, 
            n_gpu_layers=-1, 
            n_batch=512, 
            n_ctx=2048, 
            verbose=False
        )
        logger.info("✅ Models loaded successfully.")
        return embeddings, llm
    except Exception as e:
        logger.error(f"❌ Failed to load models. Error: {e}")
        exit()
embeddings, llm = load_models()