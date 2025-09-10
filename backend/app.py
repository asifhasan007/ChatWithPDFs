import os
import shutil
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import UPLOADS_FOLDER, VECTOR_STORES_FOLDER
from utils import process_and_index_pdf
from rag_chain import get_conversational_chain,  get_general_ai_chain 

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)
app = Flask(__name__)
CORS(app)

#API Endpoint generalo chat
@app.route('/ai-solution', methods=['POST'])
def ai_solution_handler():
    data = request.json
    message = data.get('message')
    
    if not message:
        logger.warning("AI solution request with no message.")
        return jsonify({"error": "Message is required"}), 400
        
    logger.info(f"General AI request: '{message[:50]}...'")
    
    chain = get_general_ai_chain()
    
    try:
        response = chain.invoke({"question": message})
        ai_answer = response.get('text', 'Could not generate a response.')        
        logger.info("Successfully generated general AI response.")
        return jsonify({"answer": ai_answer})
    except Exception as e:
        logger.error(f"Error in general AI chain: {e}")
        return jsonify({"error": "Failed to generate AI response."}), 500
    
#API Endpoint
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

#API Endpoint
@app.route('/categories', methods=['GET'])
def categories_handler():
    logger.info("Request received for listing categories.")
    if not os.path.exists(VECTOR_STORES_FOLDER):
        return jsonify({"categories": []}), 200
    categories = [d for d in os.listdir(VECTOR_STORES_FOLDER) if os.path.isdir(os.path.join(VECTOR_STORES_FOLDER, d))]
    return jsonify({"categories": categories}), 200

#API Endpoint
@app.route('/categories', methods=['POST'])
def create_category_handler():
    data = request.json
    category_name = data.get('name')

    if not category_name:
        logger.warning("Attempted to create a category without a name.")
        return jsonify({"error": "Category name is required"}), 400

    logger.info(f"Request to create category: '{category_name}'")

    os.makedirs(os.path.join(UPLOADS_FOLDER, category_name), exist_ok=True)
    os.makedirs(os.path.join(VECTOR_STORES_FOLDER, category_name), exist_ok=True)
    
    return jsonify({"message": f"Category '{category_name}' created successfully.", "category": {"name": category_name}}), 201

#API Endpoint
@app.route('/categories/<category_id>', methods=['DELETE'])
def delete_category_handler(category_id):
    logger.info(f"Request to delete category: '{category_id}'")
    upload_path = os.path.join(UPLOADS_FOLDER, category_id)
    vector_store_path = os.path.join(VECTOR_STORES_FOLDER, category_id)

    try:
        if os.path.exists(upload_path):
            shutil.rmtree(upload_path)
        if os.path.exists(vector_store_path):
            shutil.rmtree(vector_store_path)
        
        logger.info(f"Successfully deleted category '{category_id}'.")
        return jsonify({"message": f"Category '{category_id}' deleted successfully."}), 200
    except Exception as e:
        logger.error(f"Error deleting category '{category_id}': {e}")
        return jsonify({"error": "Failed to delete category."}), 500
    
#API Endpoint
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
    logger.info(f"AI: {result['answer']}")
    source_docs = list(set([os.path.basename(doc.metadata.get('source', 'N/A')) for doc in result.get('source_documents', [])]))

    return jsonify({"answer": result['answer'], "sources": source_docs})
#API Endpoint
@app.route('/chat/history/<category_id>', methods=['GET'])
def get_chat_history_handler(category_id):
    logger.info(f"Placeholder: Request to get chat history for category '{category_id}'.")
    return jsonify([]), 200 
#API Endpoint
@app.route('/chat/history', methods=['POST'])
def save_chat_session_handler():
    data = request.json
    logger.info(f"Placeholder: Request to save chat session for category '{data.get('categoryId')}'.")
    return jsonify({"message": "Chat session saved (placeholder)."}), 201
#API Endpoint
@app.route('/chat/history/<session_id>', methods=['DELETE'])
def delete_chat_session_handler(session_id):
    logger.info(f"Placeholder: Request to delete chat session '{session_id}'.")
    return jsonify({"message": "Chat session deleted (placeholder)."}), 200

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=False)