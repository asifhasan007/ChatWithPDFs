import logging
import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

def load_models():
    try:
        logger.info("Initializing embedding model...")
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={'device': 'cuda'}
        )

        logger.info("Initializing LLM with GPT...")
        llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.1)

        logger.info("Models loaded successfully.")
        return embeddings, llm
    except Exception as e:
        logger.error(f"Failed to load models. Error: {e}")
        exit()

embeddings, llm = load_models()


'''#For local LLm 
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
            temperature=0.1,  
            max_tokens=300,   
            top_p=0.95,
            n_ctx=4096,
            repeat_penalty=1.1,
            stop=[      
                "\nYou:",    
                "\nQuestion:",
                "\nConversational Filler:",
                "Answer Format:",
                "You:",
                "User:",
                "Human:",
                "Assistant:",
                "---",
                "Note:",
                "<|eot_id|>",
                "<|end|>",     
            ],
            verbose=True
        )

        logger.info("Models loaded successfully.")
        return embeddings, llm
    
    except Exception as e:
        logger.error(f"Failed to load models. Error: {e}")
        exit()
embeddings, llm = load_models()'''