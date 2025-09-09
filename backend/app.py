import os
import logging
from flask import Flask, request, jsonify
from config import UPLOADS_FOLDER, VECTOR_STORES_FOLDER
from utils import process_and_index_pdf
from rag_chain import get_conversational_chain

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)
app = Flask(__name__)

#API Endpoints
@app.route('/upload', methods=['POST'])
def upload_handler():
    if 'files' not in request.files:
        logger.warning("Upload attempt with no files part.")
        return jsonify({"error": "No files part in the request"}), 400
    
    files = request.files.getlist('files')
    category = request.form.get('category')

    if not category:
        logger.warning("Upload attempt with no category specified.")
        return jsonify({"error": "No category specified"}), 400

    logger.info(f"Received {len(files)} file(s) for category '{category}'.")
    category_upload_path = os.path.join(UPLOADS_FOLDER, category)
    os.makedirs(category_upload_path, exist_ok=True)

    for file in files:
        if file and file.filename.lower().endswith('.pdf'):
            filepath = os.path.join(category_upload_path, file.filename)
            file.save(filepath)
            process_and_index_pdf(filepath, category)
            
    return jsonify({"message": f"Successfully handled files for category '{category}'"}), 200

#API Endpoints
@app.route('/categories', methods=['GET'])
def categories_handler():
    logger.info("Request received for listing categories.")
    if not os.path.exists(VECTOR_STORES_FOLDER):
        return jsonify({"categories": []}), 200
    categories = [d for d in os.listdir(VECTOR_STORES_FOLDER) if os.path.isdir(os.path.join(VECTOR_STORES_FOLDER, d))]
    return jsonify({"categories": categories}), 200

#API Endpoints
@app.route('/chat', methods=['POST'])
def chat_handler():
    data = request.json
    category = data.get('category')
    question = data.get('question')
    
    logger.info(f"Chat request for category '{category}'.")
    if not category or not question:
        return jsonify({"error": "Missing 'category' or 'question'"}), 400

    chain = get_conversational_chain(category)
    if not chain:
        return jsonify({"error": f"Could not create chat chain for category '{category}'."}), 500

    result = chain.invoke({"question": question})
    logger.info("Successfully generated response.")
    
    source_docs = list(set([os.path.basename(doc.metadata.get('source', 'N/A')) for doc in result.get('source_documents', [])]))

    return jsonify({"answer": result['answer'], "sources": source_docs})

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=False)