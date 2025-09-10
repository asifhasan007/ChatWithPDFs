import os
import logging
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from models import embeddings
from config import VECTOR_STORES_FOLDER

logger = logging.getLogger(__name__)

def process_and_index_pdf(pdf_path, category):
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    vector_store_path = os.path.join(VECTOR_STORES_FOLDER, category, pdf_name)
    
    if os.path.exists(vector_store_path):
        logger.info(f"Vector store for '{pdf_name}' already exists. Skipping.")
        return

    try:
        logger.info(f"Processing '{pdf_name}' for category '{category}'...")
        loader = PyMuPDFLoader(pdf_path)
        documents = loader.load()        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_documents(documents)        
        vector_store = FAISS.from_documents(chunks, embeddings)
        os.makedirs(vector_store_path, exist_ok=True)
        vector_store.save_local(vector_store_path)
        logger.info(f"Saved vector store for '{pdf_name}'.")
    except Exception as e:
        logger.error(f"Failed to process {pdf_name}. Error: {e}")