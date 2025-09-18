import os
import shutil
import logging
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import UPLOADS_FOLDER, VECTOR_STORES_FOLDER
from utils import process_and_index_pdf
from rag_chain import get_conversational_chain,  get_general_ai_chain 
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
from database import init_db, DATABASE_NAME
import uuid

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()]
)
SESSIONS = {}
init_db()
logger = logging.getLogger(__name__)
app = Flask(__name__)
CORS(app)

#generalo chat API Endpoint 
@app.route('/ai-solution', methods=['POST'])
def ai_solution_handler():
    data = request.json
    message = data.get('message')
    
    if not message:
        logger.warning("AI solution request with no message.")
        return jsonify({"error": "Message is required"}), 400
        
    logger.info(f"General AI request: '{message[:20]}...'")
    
    chain = get_general_ai_chain()
    
    try:
        response = chain.invoke({"question": message})
        ai_answer = response      
        logger.info("Successfully generated general AI response.")
        return jsonify({"answer": ai_answer})
    except Exception as e:
        logger.error(f"Error in general AI chain: {e}")
        return jsonify({"error": "Failed to generate AI response."}), 500
    
#PDF upload API Endpoint
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

#PDF delete API Endpoint
@app.route('/categories/<string:category>/documents/<string:filename>', methods=['DELETE'])
def delete_document_handler(category, filename):
    
    logger.info(f"Request to delete document '{filename}' from category '{category}'.")
    pdf_path = os.path.join(UPLOADS_FOLDER, category, filename)
    pdf_name_without_ext = os.path.splitext(filename)[0]
    vector_store_path = os.path.join(VECTOR_STORES_FOLDER, category, pdf_name_without_ext)
    pdf_deleted = False
    vector_store_deleted = False

    try:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            pdf_deleted = True
            logger.info(f"Successfully deleted PDF file: {pdf_path}")
        else:
            logger.warning(f"PDF file not found, could not delete: {pdf_path}")

        if os.path.exists(vector_store_path):
            shutil.rmtree(vector_store_path)
            vector_store_deleted = True
            logger.info(f"Successfully deleted vector store: {vector_store_path}")
        else:
            logger.warning(f"Vector store not found, could not delete: {vector_store_path}")

        if not pdf_deleted and not vector_store_deleted:
            return jsonify({"error": "File and vector store not found."}), 404

        return jsonify({
            "message": f"Successfully deleted '{filename}' and its associated data.",
            "details": {
                "pdf_deleted": pdf_deleted,
                "vector_store_deleted": vector_store_deleted
            }
        }), 200

    except Exception as e:
        logger.error(f"Error deleting document '{filename}' from category '{category}': {e}", exc_info=True)
        return jsonify({"error": "An internal server error occurred during deletion."}), 500

#category get API Endpoint
@app.route('/categories', methods=['GET'])
def categories_handler():
    logger.info("Request received for listing categories.")
    if not os.path.exists(VECTOR_STORES_FOLDER):
        return jsonify({"categories": []}), 200
    categories = [d for d in os.listdir(VECTOR_STORES_FOLDER) if os.path.isdir(os.path.join(VECTOR_STORES_FOLDER, d))]
    return jsonify({"categories": categories}), 200

#category update API Endpoint
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

#category delete API Endpoint
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
    
#Initialize chat API endpoint
@app.route('/chat/start', methods=['POST'])
def start_chat_handler():
    data = request.json
    category = data.get('category')
    if not category:
        return jsonify({"error": "A 'category' is required."}), 400
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {'category': category}
    return jsonify({"message": "Session started successfully", "session_id": session_id}), 200

#chat flow API endpoint
@app.route('/chat', methods=['POST'])
def chat_handler():
    data = request.json
    question = data.get('question')
    session_id = data.get('session_id')
    if not question or not session_id:
        return jsonify({"error": "A 'question' and 'session_id' are required."}), 400
 
    session_info = SESSIONS.get(session_id)
    if not session_info:
        return jsonify({"error": "Invalid or expired session ID."}), 404
    category = session_info.get('category')

    try:
        # start rag chain
        rag_chain = get_conversational_chain(category)
        if not rag_chain:
            return jsonify({"error": f"Could not create RAG chain for category '{category}'."}), 500

        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # save user question to DB
        cursor.execute(
            "INSERT INTO chat_history (category, sender, message) VALUES (?, ?, ?)",
            (category, 'user', question)
        )
        conn.commit()
        MEMORY_WINDOW_SIZE = 20 
        # fetch chat history from DB
        cursor.execute(
            "SELECT sender, message FROM chat_history WHERE category = ? ORDER BY timestamp DESC LIMIT ?",
            (category, MEMORY_WINDOW_SIZE)
        )
        history_rows = cursor.fetchall()     
        history_rows.reverse()
        chat_history_for_chain = []
        for sender, message in history_rows:
            if sender == 'user':
                chat_history_for_chain.append(HumanMessage(content=message))
            else:
                chat_history_for_chain.append(AIMessage(content=message))

        result = rag_chain.invoke({
            "question": question,
            "chat_history": chat_history_for_chain
        })
        
        answer = result.get("answer", "Error: The model failed to generate an answer.")
        source_documents = result.get("docs", [])

        # save AI answer to DB
        cursor.execute(
            "INSERT INTO chat_history (category, sender, message) VALUES (?, ?, ?)",
            (category, 'ai', answer)
        )
        conn.commit()
        conn.close() 
        
        # send to the frontend
        sources = []
        unique_sources = {}
        for doc in source_documents:
            source_file = doc.metadata.get("source", "Unknown")
            page_num = doc.metadata.get("page", -1)
            page_label = page_num + 1 if page_num != -1 else "N/A"
            source_key = f"{source_file}-p{page_label}"
            if source_key not in unique_sources:
                unique_sources[source_key] = {"source": os.path.basename(source_file), "page": page_label}
        sources = list(unique_sources.values())
        
        logger.info(f"Responded to question in '{category}'. Found {len(sources)} sources.")
        logger.info(f"HERE IS {answer} and HERE IS {sources}")
        return jsonify({"answer": answer, "sources": sources})

    except Exception as e:
        logger.error(f"Critical error in chat handler for category '{category}': {e}", exc_info=True)
        return jsonify({"error": "An internal server error occurred."}), 500
    
#chat history fetch API Endpoint
@app.route('/chat/history/<string:category>', methods=['GET'])
def get_chat_history_handler(category):
    logger.info(f"Request to fetch chat history for category '{category}'.")
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row  
        cursor = conn.cursor()       
        cursor.execute(
            "SELECT sender, message, timestamp FROM chat_history WHERE category = ? ORDER BY timestamp ASC",
            (category,)
        )
        
        history = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        logger.info(f"Found {len(history)} messages for category '{category}'.")
        return jsonify(history), 200
    
    except Exception as e:
        logger.error(f"Error fetching history for '{category}': {e}", exc_info=True)
        return jsonify({"error": "Failed to retrieve chat history."}), 500
    
#chat history delete API Endpoint
@app.route('/chat/history/<string:category>', methods=['DELETE'])
def delete_chat_session_handler(category):
    logger.info(f"Request to delete chat session '{category}'.")
    try:
        conn=sqlite3.connect(DATABASE_NAME)
        cursor=conn.cursor()
        cursor.execute("DELETE FROM chat_history WHERE category = ?", (category,))
        conn.commit()
        conn.close()
        logger.info(f"Chat session '{category}' deleted successfully.")
        return jsonify({"message": "Chat session deleted successfully."}), 200

    except Exception as e:
        logger.error(f"Error deleting chat session '{category}': {e}", exc_info=True)
        return jsonify({"error": "Failed to delete chat session."}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=False)