import os
import logging
import re
import json
from langchain.chains import LLMChain
from langchain_community.vectorstores import FAISS
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.retrievers import ContextualCompressionRetriever
from models import llm, embeddings
from config import VECTOR_STORES_FOLDER, RETRIEVER_K
from langchain.retrievers.document_compressors import FlashrankRerank
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from operator import itemgetter
from langchain.schema.output_parser import StrOutputParser

logger = logging.getLogger(__name__)

def get_original_name_from_mapping(category, sanitized_name):
    mapping_file = os.path.join(VECTOR_STORES_FOLDER, category, '_name_mapping.json')
    
    if not os.path.exists(mapping_file):
        return sanitized_name
    
    try:
        with open(mapping_file, 'r', encoding='utf-8') as f:
            mappings = json.load(f)
        return mappings.get(sanitized_name, sanitized_name)
    except Exception as e:
        logger.warning(f"Could not load name mappings: {e}")
        return sanitized_name

def detect_bangla_in_query(text):
    bangla_pattern = re.compile(r'[\u0980-\u09FF]')
    return bool(bangla_pattern.search(text))

def get_general_ai_chain():
    logger.info("Creating general-purpose AI chain.")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a highly precise and factual question-answering assistant that supports both English and Bangla languages. Your task is to answer the user's question in the same language they asked. Follow these rules strictly:
        1. Read the user's question carefully and identify the specific information being requested.
        2. If the question is in Bangla (বাংলা), respond in Bangla.
        3. If the question is in English, respond in English.
        4. Provide the answers clearly and concisely.
        5. You can only infer, calculate, or use any knowledge outside when needed.
        6. Your response must contain ONLY the answer. Do not add any conversational filler.
        7. STOP immediately after providing the answer."""), 
        ("user", "Question: {question}\n\nAnswer:"),
    ])

    rag_chain = (
        RunnablePassthrough.assign(
            context=itemgetter("question"))
        | prompt
        | llm
        | StrOutputParser()
    )  
    return rag_chain

def get_conversational_chain(category):
    category_vs_path = os.path.join(VECTOR_STORES_FOLDER, category)
    if not os.path.exists(category_vs_path):
        logger.error(f"Vector store path for category '{category}' not found.")
        return None
    
    all_items_in_category = os.listdir(category_vs_path)
    document_folders = [
        os.path.join(category_vs_path, d)
        for d in all_items_in_category
        if os.path.isdir(os.path.join(category_vs_path, d)) and not d.startswith('_')
    ]

    if not document_folders:
        logger.warning(f"No valid document vector stores found in category '{category}'.")
        return None

    try:
        logger.info(f"Found {len(document_folders)} vector store(s) for category '{category}'")
        
        all_vector_stores = []
        for folder_path in document_folders:
            folder_name = os.path.basename(folder_path)
            logger.info(f"Loading vector store from: {folder_path}")
            try:
                vs = FAISS.load_local(
                    folder_path, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
                all_vector_stores.append(vs)
                
                # get original name for logging
                original_name = get_original_name_from_mapping(category, folder_name)
                logger.info(f"Successfully loaded: {original_name}")
                
            except Exception as e:
                original_name = get_original_name_from_mapping(category, folder_name)
                logger.error(f"Failed to load vector store from {original_name}: {e}")
        
        if not all_vector_stores:
            logger.error("No vector stores could be loaded successfully.")
            return None
        
        if len(all_vector_stores) == 1:
            main_vs = all_vector_stores[0]
            logger.info("Using single vector store.")
        else:
            logger.info(f"Merging {len(all_vector_stores)-1} additional vector store(s)...")
            main_vs = all_vector_stores[0]
            for i, vs in enumerate(all_vector_stores[1:], 1):
                try:
                    main_vs.merge_from(vs)
                    logger.info(f"Successfully merged vector store {i}/{len(all_vector_stores)-1}")
                except Exception as e:
                    logger.error(f"Failed to merge vector store {i}: {e}")
            logger.info("All vector stores merged successfully.")

    except Exception as e:
        logger.error(f"Failed to load or merge vector stores for category '{category}': {e}", exc_info=True)
        return None

    fetch_k_value = 30
    top_n_value = 5
    base_retriever = main_vs.as_retriever(search_type="similarity", search_kwargs={"k": RETRIEVER_K, "fetch_k": fetch_k_value})
    reranker = FlashrankRerank(top_n=top_n_value)
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=reranker, base_retriever=base_retriever
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a precise multilingual information extraction assistant that supports both English and Bangla (বাংলা). Use the conversation history for context and answer the user's question based on the provided text.
        
        Rules:
        1. **Language Detection**: If the user's question is in Bangla (বাংলা), respond in Bangla. If in English, respond in English.
        2. Use the 'Conversation History' to understand follow-up questions.
        3. Extract the direct answer from the 'Text' provided but you can use your own knowledge to help the user elaborate the answers.
        4. First answer only from the text provided. If the answer is not in the text and you can use your own knowledge and chat history to answer, do so, but refer to the text if possible.
        5. Make your answer as complete as possible and precise and don't answer out of context.
        6. If the user asks for an explanation, provide a brief one based on the text in the same language as the question.
        7. Output ONLY the answer in the appropriate language. Do not add conversational filler.
        
        Examples:
        - English question → English answer
        - বাংলা প্রশ্ন → বাংলা উত্তর"""),
        ("user", "Text: {context}\n\nQuestion: {question}\n\nDirect Answer:"),
    ])

    def log_retrieved_docs(docs):
        try:
            separator = "=" * 50
            logger.info(separator)
            logger.info("RETRIEVED AND RERANKED DOCUMENTS")
            logger.info(separator)
            
            if not docs:
                logger.warning("No documents were retrieved!")
            else:
                sources_seen = set()
                for i, doc in enumerate(docs):
                    source = doc.metadata.get('source', 'Unknown')
                    sources_seen.add(source)
                    page = doc.metadata.get('page', 'N/A')
                    language = doc.metadata.get('language', 'unknown')
                    
                    logger.info(f"\nDocument {i+1}:")
                    logger.info(f"   Original Source: {source}")
                    logger.info(f"   Page: {page + 1 if isinstance(page, int) else page}")
                    logger.info(f"   Language: {language}")
                    logger.info(f"   Content Preview: {doc.page_content}...")
                
                logger.info(f"\nUnique PDFs accessed: {sources_seen}")
                logger.info(f"Total documents retrieved: {len(docs)}")
            
            logger.info(separator)
        except Exception as e:
            logger.error(f"Error logging retrieved docs: {e}")
        
        return docs

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        RunnablePassthrough.assign(
            docs=itemgetter("question") | compression_retriever | log_retrieved_docs
        ).assign(
            context=lambda x: format_docs(x["docs"])
        ).assign(
            answer=(
                prompt
                | llm
            )
        )
    )
    return rag_chain