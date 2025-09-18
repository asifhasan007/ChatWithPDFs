import os
import logging
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

def get_general_ai_chain():
    logger.info("Creating general-purpose AI chain.")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a highly precise and factual question-answering assistant. Your task is to answer the user's question. Follow these rules strictly:
        1. Read the user's question carefully and identify the specific information being requested.
        2. Provide the answers clearly and concisely.
        3. You can only infer, calculate, or use any knowledge outside when needed.
        4. Your response must contain ONLY the answer. Do not add any conversational filler.
        5. STOP immediately after providing the answer."""), 
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
        if os.path.isdir(os.path.join(category_vs_path, d))
    ]

    if not document_folders:
        logger.warning(f"No valid document vector stores found in category '{category}'.")
        return None

    try:
        logger.info(f"Found {len(document_folders)} vector store(s) for category '{category}'")
        
        all_vector_stores = []
        for folder_path in document_folders:
            logger.info(f"Loading vector store from: {folder_path}")
            try:
                vs = FAISS.load_local(folder_path, embeddings, allow_dangerous_deserialization=True)
                all_vector_stores.append(vs)
                logger.info(f"Successfully loaded: {os.path.basename(folder_path)}")
            except Exception as e:
                logger.error(f"Failed to load vector store from {folder_path}: {e}")
                continue
        
        if not all_vector_stores:
            logger.error("No vector stores could be loaded successfully.")
            return None
        
        if len(all_vector_stores) == 1:
            main_vs = all_vector_stores[0]
            logger.info("Using single vector store.")
        else:
            main_vs = all_vector_stores[0]
            logger.info(f"Merging {len(all_vector_stores) - 1} additional vector store(s)...")

            for i, vs_to_merge in enumerate(all_vector_stores[1:], 1):
                try:
                    main_vs.merge_from(vs_to_merge)
                    logger.info(f"Successfully merged vector store {i}/{len(all_vector_stores)-1}")
                except Exception as e:
                    logger.error(f"Failed to merge vector store {i}: {e}")
            
            logger.info("All vector stores merged successfully.")
            
            try:
                total_docs = len(main_vs.docstore._dict)
                logger.info(f"Total documents in merged vector store: {total_docs}")
            except:
                pass

    except Exception as e:
        logger.error(f"Failed to load or merge vector stores for category '{category}': {e}", exc_info=True)
        return None
    
    fetch_k_value = min(50, len(all_vector_stores) * 20) 
    top_n_value = min(3, len(all_vector_stores) + 1)
    base_retriever = main_vs.as_retriever( search_type="mmr", search_kwargs={"k": RETRIEVER_K,"fetch_k": fetch_k_value})
    reranker = FlashrankRerank(top_n=top_n_value)
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=reranker, base_retriever=base_retriever
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a precise information extraction assistant. Use the conversation history for context and answer the user's question based on the provided text.
        Rules:
        1. Use the 'Conversation History' to understand follow-up questions.
        2. Extract the direct answer from the 'Text' provided.
        3. If the answer is not in the text, say "Not found in the provided text."
        4. Output ONLY the answer. Do not add conversational filler."""),
        #MessagesPlaceholder(variable_name="chat_history"),
        ("user", "Text: {context}\n\nQuestion: {question}\n\nDirect Answer:"),])

    def log_retrieved_docs(docs):
        print("="*50)
        print("RETRIEVED AND RERANKED DOCUMENTS")
        print("="*50)
        
        if not docs:
            logger.warning("No documents were retrieved!")
        else:
            # Track which sources are represented
            sources_seen = set()
            for i, doc in enumerate(docs):
                source = doc.metadata.get('source', 'Unknown')
                source_name = os.path.basename(source) if source != 'Unknown' else 'Unknown'
                sources_seen.add(source_name)
                page = doc.metadata.get('page', 'N/A')
                
                print(f"\nDocument {i+1}:")
                print(f"   Source: {source_name}")
                print(f"   Page: {page + 1 if isinstance(page, int) else page}")
                print(f"   Content Preview: {doc.page_content[0:-1]}...")
            
            print(f"\nUnique PDFs accessed: {sources_seen}")
            print(f"Total documents retrieved: {len(docs)}")
        
        print("="*50)
        return docs  
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        RunnablePassthrough.assign(
            docs=itemgetter("question") | compression_retriever
        ).assign(
            context=lambda x: format_docs(x["docs"])
        ).assign(
            answer=(
                prompt
                | llm
                | StrOutputParser()
            )
        )
    )
    return rag_chain