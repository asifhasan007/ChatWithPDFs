import sqlite3
import logging

logger = logging.getLogger(__name__)
DATABASE_NAME = "chat_history.db"

def init_db():
    try:
        conn = sqlite3.connect(DATABASE_NAME, check_same_thread=False)
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            sender TEXT NOT NULL, -- 'user' or 'ai'
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );""")
        
        conn.commit()
        conn.close()
        logger.info(f"Database '{DATABASE_NAME}' initialized and table is ready.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)