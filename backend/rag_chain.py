import os
import logging
from langchain.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import EmbeddingsFilter
from models import llm, embeddings
from config import VECTOR_STORES_FOLDER, SIMILARITY_THRESHOLD, RETRIEVER_K

logger = logging.getLogger(__name__)

def get_conversational_chain(category):

    category_vs_path = os.path.join(VECTOR_STORES_FOLDER, category)
    if not os.path.exists(category_vs_path):
        logger.error(f"Vector store path for category '{category}' not found.")
        return None

    document_folders = [os.path.join(category_vs_path, d) for d in os.listdir(category_vs_path)]
    if not document_folders:
        logger.warning(f"No documents found in category '{category}'.")
        return None

    try:
        logger.info(f"Loading and merging {len(document_folders)} vector store(s) for category '{category}'.")
        main_vs = FAISS.load_local(document_folders[0], embeddings, allow_dangerous_deserialization=True)
        for path in document_folders[1:]:
            main_vs.merge_from(FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True))
    except Exception as e:
        logger.error(f"Failed to load vector stores for category '{category}'. Error: {e}")
        return None

    #Create Retriever
    base_retriever = main_vs.as_retriever(search_kwargs={"k": RETRIEVER_K})
    embeddings_filter = EmbeddingsFilter(embeddings=embeddings, similarity_threshold=SIMILARITY_THRESHOLD)
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=embeddings_filter, base_retriever=base_retriever
    )
    
    #Create the Convo Chain
    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, output_key='answer')
    
    template = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>
                    Use the following context to answer the user's question. The answer must be found exclusively within the provided context. If the context does not contain the answer, say "I cannot answer this from the provided text." Do not use outside knowledge.
                    <|eot_id|><|start_header_id|>user<|end_header_id|>
                    Context: {context}
                    Question: {question}
                    Answer:<|eot_id|><|start_header_id|>assistant<|end_header_id|>"""
    
    QA_PROMPT = PromptTemplate(template=template, input_variables=["question", "context"])
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=compression_retriever,
        memory=memory,
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": QA_PROMPT}
    )    
    return chain