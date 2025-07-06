import os
import uuid
from typing import List, Dict, Any, Optional
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.qdrant_store import QdrantVectorStore

class DocumentProcessor:
    def __init__(self, 
                 chunk_size: int = 1000, 
                 chunk_overlap: int = 200, 
                 collection_name: str = "documents"):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = CharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.vector_store = QdrantVectorStore(collection_name=collection_name)
    
    def process_pdf(self, file_path: str, custom_filename: str = None, custom_file_id: str = None) -> Dict[str, Any]:
        """Process a PDF file and store its chunks in the vector store
        
        Args:
            file_path: Path to the PDF file
            custom_filename: Optional custom filename to use instead of the file path
            custom_file_id: Optional custom file_id to use for this PDF
        """
        print(f"Processing PDF: {file_path}, custom_filename: {custom_filename}, custom_file_id: {custom_file_id}")
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Load PDF
        loader = PDFLoader(file_path)
        documents = loader.load_documents()
        print(f"Loaded {len(documents)} pages from PDF")
        if len(documents) == 0:
            print("Warning: No documents loaded from PDF!")
        
        # Get filename for metadata
        if custom_filename:
            filename = custom_filename
        else:
            filename = os.path.basename(file_path)
        
        # Use provided file_id or generate one
        if custom_file_id:
            file_id = custom_file_id
            print(f"Using provided file_id: {file_id}")
        else:
            # Generate a unique ID for this PDF
            file_id = str(uuid.uuid4())
            print(f"Generated new file_id: {file_id}")
        
        # Split text into chunks
        chunks = self.text_splitter.split_texts(documents)
        
        # Create metadata for each chunk with file_id
        metadatas = [{
            "source": filename,
            "file_id": file_id,
            "chunk_index": i,
            "total_chunks": len(chunks)
        } for i in range(len(chunks))]
        
        # Add chunks to vector store
        print(f"Adding {len(chunks)} chunks to vector store with file_id: {file_id}")
        ids = self.vector_store.add_texts(chunks, metadatas)
        print(f"Added {len(ids)} chunks to vector store with IDs: {ids[:5]}..." if len(ids) > 5 else f"Added {len(ids)} chunks to vector store with IDs: {ids}")
        
        return {
            "filename": filename,
            "file_id": file_id,
            "num_chunks": len(chunks),
            "chunk_ids": ids
        }
    
    async def aprocess_pdf(self, file_path: str, custom_filename: str = None, custom_file_id: str = None) -> Dict[str, Any]:
        """Process a PDF file asynchronously and store its chunks in the vector store
        
        Args:
            file_path: Path to the PDF file
            custom_filename: Optional custom filename to use instead of the file path
            custom_file_id: Optional custom file_id to use for this PDF
        """
        print(f"Async processing PDF: {file_path}, custom_filename: {custom_filename}, custom_file_id: {custom_file_id}")
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Load PDF
        loader = PDFLoader(file_path)
        documents = loader.load_documents()
        print(f"Loaded {len(documents)} pages from PDF")
        if len(documents) == 0:
            print("Warning: No documents loaded from PDF!")
            
        # Get filename for metadata
        if custom_filename:
            filename = custom_filename
        else:
            filename = os.path.basename(file_path)
        
        # Use provided file_id or generate one
        if custom_file_id:
            file_id = custom_file_id
            print(f"Using provided file_id: {file_id}")
        else:
            # Generate a unique ID for this PDF
            file_id = str(uuid.uuid4())
            print(f"Generated new file_id: {file_id}")
        
        # Split text into chunks
        chunks = self.text_splitter.split_texts(documents)
        
        # Create metadata for each chunk with file_id
        metadatas = [{
            "source": filename,
            "file_id": file_id,
            "chunk_index": i,
            "total_chunks": len(chunks)
        } for i in range(len(chunks))]
        
        # Add chunks to vector store
        print(f"Adding {len(chunks)} chunks to vector store with file_id: {file_id}")
        ids = await self.vector_store.aadd_texts(chunks, metadatas)
        print(f"Added {len(ids)} chunks to vector store with IDs: {ids[:5]}..." if len(ids) > 5 else f"Added {len(ids)} chunks to vector store with IDs: {ids}")
        
        return {
            "filename": filename,
            "file_id": file_id,
            "num_chunks": len(chunks),
            "chunk_ids": ids
        }
