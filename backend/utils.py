import os
import logging
import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from models import embeddings
from config import VECTOR_STORES_FOLDER,TESSERACT_PATH, OCR_LANGUAGES, OCR_CONFIDENCE_THRESHOLD, POPPLER_PATH
import hashlib
import json
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

logger = logging.getLogger(__name__)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

def sanitize_filename(filename):
    # create a hash of the original filename
    filename_hash = hashlib.md5(filename.encode('utf-8')).hexdigest()
    return filename_hash

def save_name_mapping(category, sanitized_name, original_name):
    mapping_file = os.path.join(VECTOR_STORES_FOLDER, category, '_name_mapping.json')
    
    # load existing mappings
    mappings = {}
    if os.path.exists(mapping_file):
        try:
            with open(mapping_file, 'r', encoding='utf-8') as f:
                mappings = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load existing mappings: {e}")
    
    # add new mapping
    mappings[sanitized_name] = original_name
    
    # save mappings
    try:
        os.makedirs(os.path.dirname(mapping_file), exist_ok=True)
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(mappings, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved name mapping: {sanitized_name} -> {original_name}")
    except Exception as e:
        logger.error(f"Failed to save name mapping: {e}")

def detect_language(text):
    bangla_pattern = re.compile(r'[\u0980-\u09FF]')
    return bool(bangla_pattern.search(text))

def is_pdf_scanned(pdf_path, sample_pages=3):
    try:
        loader = PyMuPDFLoader(pdf_path)
        documents = loader.load()
        
        # Check first N pages
        pages_to_check = min(sample_pages, len(documents))
        total_text_length = 0
        
        for i in range(pages_to_check):
            text = documents[i].page_content.strip()
            total_text_length += len(text)
        
        # If very little text found, assume it's scanned
        avg_text_per_page = total_text_length / pages_to_check
        is_scanned = avg_text_per_page < 50  
        
        logger.info(f"PDF analysis - Avg text per page: {avg_text_per_page:.0f} chars. Scanned: {is_scanned}")
        return is_scanned
        
    except Exception as e:
        logger.error(f"Error checking if PDF is scanned: {e}")
        return False
    
def extract_text_with_ocr(pdf_path, pdf_name):
    try:
        logger.info(f"Starting OCR extraction for '{pdf_name}'...")
        
        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=300, poppler_path=POPPLER_PATH)  # Higher DPI = better quality
        
        documents = []
        for page_num, image in enumerate(images):
            logger.info(f"Processing page {page_num + 1}/{len(images)} with OCR...")
            
            # Perform OCR with confidence scores
            ocr_data = pytesseract.image_to_data(
                image, 
                lang=OCR_LANGUAGES,
                output_type=pytesseract.Output.DICT
            )
            
            # Filter by confidence and reconstruct text
            page_text = []
            for i, conf in enumerate(ocr_data['conf']):
                if int(conf) > OCR_CONFIDENCE_THRESHOLD:
                    text = ocr_data['text'][i]
                    if text.strip():
                        page_text.append(text)
            
            text_content = ' '.join(page_text)
            
            if text_content.strip():
                doc = Document(
                    page_content=text_content,
                    metadata={
                        'source': pdf_name,
                        'page': page_num,
                        'extraction_method': 'ocr'
                    }
                )
                documents.append(doc)
                logger.info(f"Extracted {len(text_content)} characters from page {page_num + 1}")
            else:
                logger.warning(f"No text extracted from page {page_num + 1}")
        
        logger.info(f"OCR extraction completed. Total pages processed: {len(documents)}")
        return documents
        
    except Exception as e:
        logger.error(f"OCR extraction failed for '{pdf_name}': {e}")
        return []
       
def chunk_semantically(documents, pdf_name, chunk_size=2000, chunk_overlap=300):
    chunks = []
    
    for doc_idx, document in enumerate(documents):
        text = document.page_content
        page_num = document.metadata.get('page', doc_idx)
        
        # detect language for appropriate processing
        is_bangla = detect_language(text)
        
        if is_bangla:
            # Bangla sentence endings: ।, ?, !
            sentences = re.split(r'[।\?\!]\s*|\n\s*\n', text)
        else:
            # For english text, split by paragraphs
            sentences = re.split(r'\n\s*\n', text)
        
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # check if adding this sentence would exceed chunk size
            if current_chunk and len(current_chunk.encode('utf-8')) + len(sentence.encode('utf-8')) + 2 > chunk_size:
                # create chunk with proper metadata
                chunk_doc = Document(
                    page_content=current_chunk.strip(),
                    metadata={
                        'source': pdf_name,
                        'page': page_num,
                        'chunk_index': len(chunks),
                        'language': 'bangla' if is_bangla else 'english'
                    }
                )
                chunks.append(chunk_doc)
                
                # start new chunk with overlap
                if len(current_chunk.encode('utf-8')) > chunk_overlap:
                    overlap_text = current_chunk[-chunk_overlap:] if not is_bangla else current_chunk[-chunk_overlap//2:]
                else:
                    overlap_text = current_chunk
                
                current_chunk = overlap_text + ("\n\n" if not is_bangla else " ") + sentence
            else:
                if current_chunk:
                    current_chunk += ("\n\n" if not is_bangla else " ") + sentence
                else:
                    current_chunk = sentence

        # Add the final chunk if it has content
        if current_chunk.strip():
            chunk_doc = Document(
                page_content=current_chunk.strip(),
                metadata={
                    'source': pdf_name,
                    'page': page_num,
                    'chunk_index': len(chunks),
                    'language': 'bangla' if is_bangla else 'english'
                }
            )
            chunks.append(chunk_doc)
    
    logger.info(f"Created {len(chunks)} chunks for {pdf_name}. Language detected: {'Bangla' if is_bangla else 'English'}")
    return chunks

def process_and_index_pdf(pdf_path, category):
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    # sanitize the filename for the vector store path
    sanitized_name = sanitize_filename(pdf_name)
    vector_store_path = os.path.join(VECTOR_STORES_FOLDER, category, sanitized_name)

    if os.path.exists(vector_store_path):
        logger.info(f"Vector store for '{pdf_name}' already exists. Skipping.")
        return

    try:
        logger.info(f"Processing '{pdf_name}' for category '{category}' with semantic chunking...")

        if is_pdf_scanned(pdf_path):
            logger.info(f"Detected scanned PDF '{pdf_name}'. Using OCR for text extraction...")
            documents = extract_text_with_ocr(pdf_path, pdf_name)
            if not documents:
                logger.warning(f"OCR extraction yielded no documents for '{pdf_name}'. Skipping.")
                return
        else:
            logger.info(f"Loading text-based PDF '{pdf_name}'...")
            loader = PyMuPDFLoader(pdf_path)
            documents = loader.load()

        # pass documents and OG pdf_name to preserve metadata
        chunks = chunk_semantically(documents, pdf_name)  # Use OG name in metadata
        
        if not chunks:
            logger.warning(f"No chunks created for '{pdf_name}'.")
            return
        
        vector_store = FAISS.from_documents(chunks, embeddings)
        os.makedirs(vector_store_path, exist_ok=True)
        vector_store.save_local(vector_store_path)
        
        # save the name mapping
        save_name_mapping(category, sanitized_name, pdf_name)
        
        logger.info(f"Saved vector store for '{pdf_name}' (as {sanitized_name}) with {len(chunks)} semantic chunks.")

    except Exception as e:
        logger.error(f"Failed to process {pdf_name}. Error: {e}")