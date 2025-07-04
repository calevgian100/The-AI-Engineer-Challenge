# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import time
import uuid
import json
import traceback
import shutil
import asyncio

# Import RAG components - use relative imports to find modules in project root
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import the modules
from aimakerspace.document_processor import DocumentProcessor
from aimakerspace.rag import RAGQueryEngine

# Initialize FastAPI application with a title
app = FastAPI(title="WODWise with RAG")

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Define a constant for processing status tracking
processing_status = {}

# Load environment variables from env.yaml file
def load_env_vars():
    env_vars = {}
    try:
        env_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'env.yaml')
        with open(env_file_path, 'r') as file:
            content = file.read()
            # Simple parsing for each key in the YAML file
            for line in content.splitlines():
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip()
                    value = value.strip().strip('\'"')
                    if value:  # Only add non-empty values
                        env_vars[key] = value
                        # Also set as environment variable for other modules to access
                        os.environ[key.upper()] = value
        return env_vars
    except Exception as e:
        print(f"Error loading environment variables: {e}")
        return {}

def load_api_key():
    env_vars = load_env_vars()
    return env_vars.get('openai_api_key', '')

# Get the API key
DEFAULT_API_KEY = load_api_key()

# Set the OpenAI API key as an environment variable
os.environ["OPENAI_API_KEY"] = DEFAULT_API_KEY

# Initialize document processor and RAG query engine
document_processor = DocumentProcessor()
rag_engine = RAGQueryEngine()

# Define the data model for chat requests using Pydantic
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default
    api_key: Optional[str] = None  # OpenAI API key is now optional
    use_rag: Optional[bool] = False  # Whether to use RAG for this query

# Define the data model for RAG queries
class RAGRequest(BaseModel):
    query: str  # User query
    system_prompt: Optional[str] = None  # Optional system prompt

# Define the data model for processing status
class ProcessingStatus(BaseModel):
    status: str
    message: str
    file_id: Optional[str] = None
    filename: Optional[str] = None
    num_chunks: Optional[int] = None

# Function to process PDF in the background
async def process_pdf_background(file_content: bytes, file_id: str, original_filename: str):
    try:
        import tempfile
        processing_status[file_id] = {"status": "processing", "message": "Processing PDF..."}
        
        # Create a temporary file to process the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
        
        try:
            # Process the PDF using the document processor with the original filename
            result = document_processor.process_pdf(temp_path, custom_filename=original_filename)
            
            # Ensure the filename in the result is the original filename
            result["filename"] = original_filename
            
            # Update processing status
            processing_status[file_id] = {
                "status": "completed",
                "message": "PDF processed successfully",
                "filename": original_filename,
                "num_chunks": result["num_chunks"]
            }
        finally:
            # Always clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        processing_status[file_id] = {"status": "failed", "message": str(e)}

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Use the provided API key or fall back to the default from env.yaml
        api_key = request.api_key if request.api_key else DEFAULT_API_KEY
        
        if not api_key:
            raise HTTPException(status_code=400, detail="No API key provided and no default API key found")
        
        # If RAG is enabled, use the RAG engine
        if request.use_rag:
            # Create an async generator function for streaming responses
            async def generate():
                try:
                    # Use the RAG engine to stream the response
                    async for chunk in rag_engine.astream_query(
                        query=request.user_message,
                        system_prompt=request.developer_message
                    ):
                        yield chunk
                    
                    # Send an explicit completion marker that the frontend will recognize
                    yield "__STREAM_COMPLETE__"
                    
                except Exception as e:
                    yield f"Error: {str(e)}__STREAM_COMPLETE__"  # Include completion marker even on error
        else:
            # Use the standard OpenAI chat completion
            from openai import OpenAI
            
            # Initialize OpenAI client with the API key
            client = OpenAI(api_key=api_key)
            
            # Create an async generator function for streaming responses
            async def generate():
                try:
                    # Create a streaming chat completion request
                    stream = client.chat.completions.create(
                        model=request.model,
                        messages=[
                            {"role": "system", "content": request.developer_message},
                            {"role": "user", "content": request.user_message}
                        ],
                        stream=True,  # Enable streaming response
                        max_tokens=1000  # Limit token count to prevent long responses
                    )
                    
                    # Yield each chunk of the response as it becomes available
                    for chunk in stream:
                        if chunk.choices[0].delta.content is not None:
                            yield chunk.choices[0].delta.content
                    
                    # Send an explicit completion marker that the frontend will recognize
                    yield "__STREAM_COMPLETE__"
                    
                except Exception as e:
                    yield f"Error: {str(e)}__STREAM_COMPLETE__"  # Include completion marker even on error
        
        # Return a streaming response to the client with appropriate headers
        return StreamingResponse(
            generate(), 
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to upload a PDF file
@app.post("/api/upload-pdf")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        # Get the original filename
        original_filename = file.filename
        
        # Check if a file with the same name already exists in Qdrant
        from aimakerspace.qdrant_store import QdrantVectorStore
        vector_store = QdrantVectorStore()
        existing_pdfs = vector_store.get_all_pdf_metadata()
        
        # Check for files with the same name
        for pdf in existing_pdfs:
            if pdf.get("filename") == original_filename:
                # File already exists
                existing_file_id = pdf.get("file_id")
                
                return {
                    "file_id": existing_file_id, 
                    "status": "already_exists", 
                    "message": f"PDF '{original_filename}' was already uploaded and processed.",
                    "filename": original_filename,
                    "num_chunks": pdf.get('num_chunks', 0)
                }
        
        # Generate a unique ID for this upload
        file_id = str(uuid.uuid4())
        
        # Read the file content
        file_content = await file.read()
        
        # Process the PDF in the background using temporary storage
        background_tasks.add_task(process_pdf_background, file_content, file_id, original_filename)
        
        return {"file_id": file_id, "status": "processing", "message": "PDF upload started"}
    
    except Exception as e:
        print(f"Error in upload_pdf: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to check the status of PDF processing
@app.get("/api/pdf-status/{file_id}")
async def pdf_status(file_id: str):
    try:
        if file_id in processing_status:
            return processing_status[file_id]
        else:
            return {"status": "not_found", "message": "PDF processing status not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Debug endpoint to check all processing statuses
@app.get("/api/debug/processing-status")
async def debug_processing_status():
    return {"processing_status": processing_status}

# Endpoint to list all available PDFs
@app.get("/api/list-pdfs")
async def list_pdfs():
    try:
        print(f"DEBUG: Listing PDFs from Qdrant Cloud")
        pdf_list = []
        
        # Get PDFs from Qdrant Cloud
        from aimakerspace.qdrant_store import QdrantVectorStore
        vector_store = QdrantVectorStore()
        qdrant_pdfs = vector_store.get_all_pdf_metadata()
        
        if qdrant_pdfs:
            print(f"DEBUG: Found {len(qdrant_pdfs)} PDFs in Qdrant")
            pdf_list.extend(qdrant_pdfs)
        else:
            print("DEBUG: No PDFs found in Qdrant or error occurred")
        
        # Debug processing_status dictionary
        print(f"DEBUG: Current processing_status: {processing_status}")
        
        # Sort by filename
        pdf_list.sort(key=lambda x: x['filename'])
        print(f"DEBUG: Returning {len(pdf_list)} PDFs")
        
        return {"pdfs": pdf_list}
    except Exception as e:
        print(f"Error listing PDFs: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint for RAG queries
@app.post("/api/rag-query")
async def rag_query(request: RAGRequest):
    try:
        # Get search results directly - limit to top 5 results to ensure we get enough distinct sources
        search_results = await rag_engine.vector_store.asimilarity_search(request.query, k=5)
        
        # If no relevant PDF content is found, return a clear message
        if not search_results or len(search_results) == 0:
            return {
                "answer": "I don't have any relevant information from your uploaded PDFs to answer this question. Please try a different question related to the PDF content.",
                "sources": []
            }
            
        # Calculate average relevance score
        if search_results:
            relevance_scores = [result.get("score", 0) for result in search_results]
            relevance_percentage = int(sum(relevance_scores) / len(relevance_scores) * 100) if relevance_scores else 0
        else:
            relevance_percentage = 0
        
        # If relevance is below threshold, return a message indicating no relevant content
        if relevance_percentage < 50 or not search_results:
            return {
                "answer": f"I don't have enough relevant information in the uploaded PDF to answer this question. (Relevance: {relevance_percentage}%)",
                "sources": [],
                "relevance": relevance_percentage
            }
        
        # Format context from search results manually
        context_parts = []
        sources = []
        
        # Sort search results by score (highest first)
        search_results = sorted(search_results, key=lambda x: x.get('score', 0), reverse=True)
        
        for i, result in enumerate(search_results):
            try:
                # Extract text and score
                text = result.get("text", "")
                score = result.get("score", 0)
                
                # Extract source with proper fallback handling
                source = result.get("source", "Unknown")
                
                # Add to context parts for the prompt
                context_parts.append(f"[Document {i+1}] Source: {source}\n{text}\n")
                
                # Add to sources for the response
                source_item = {
                    "text": text,
                    "source": source,
                    "score": score
                }
                sources.append(source_item)
                print(f"Added source: {source} with score {score:.2f}")
                
            except Exception as e:
                pass
        
        # Find diverse sources by looking at different sections
        # First, group sources by their base filename (without section number)
        source_groups = {}
        for source in sources:
            # Extract just the filename without the section number
            source_name = source['source'].split(' (Section')[0] if ' (Section' in source['source'] else source['source']
            
            if source_name not in source_groups:
                source_groups[source_name] = []
            source_groups[source_name].append(source)
        
        # For each group, find sources from different sections if possible
        final_sources = []
        seen_texts = set()
        
        # First, add the highest scoring source from each group
        for source_name, group_sources in source_groups.items():
            # Sort by score descending
            group_sources.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Add the highest scoring source
            best_source = group_sources[0]
            text_fingerprint = best_source['text'][:100]
            seen_texts.add(text_fingerprint)
            final_sources.append(best_source)
        
        # If we have fewer than 3 sources and there are multiple sections in the same document,
        # try to add sources from different sections
        if len(final_sources) < 3:
            # Find sources with different section numbers
            for source_name, group_sources in source_groups.items():
                if len(final_sources) >= 3:
                    break
                    
                # Try to find sources from different sections
                for source in group_sources:
                    if len(final_sources) >= 3:
                        break
                        
                    text_fingerprint = source['text'][:100]
                    if text_fingerprint not in seen_texts:
                        seen_texts.add(text_fingerprint)
                        final_sources.append(source)
        
        # Sort final sources by score
        final_sources.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        # Replace with unique sources
        sources = final_sources
        print(f"After source selection: {len(sources)} diverse sources")
        
        # Join context parts
        context = "\n".join(context_parts)
        
        # Create messages for the chat model
        messages = [
            {"role": "system", "content": request.system_prompt or rag_engine.system_prompt},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.query}\n\nAnswer:"}
        ]
        
        # Get response from chat model
        response = rag_engine.chat_model.run(messages)
        
        # Create a response with consistent format
        response_data = {
            "answer": response,
            "sources": sources
        }
        

        return response_data
    
    except Exception as e:
        return {
            "answer": "I encountered an error while processing your question. Please try again.",
            "sources": []
        }

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/rag-stream")
async def rag_stream(request: Request):
    """Stream RAG response with sources"""
    try:
        # Parse request
        data = await request.json()
        query = data.get("query", "")
        system_prompt = data.get("system_prompt", None)
        
        # First get sources to return them separately
        search_results = await rag_engine.vector_store.asimilarity_search(query, k=5)
        print(f"RAG stream endpoint: found {len(search_results)} sources")
        
        # Extract sources with proper metadata handling
        sources = []
        for result in search_results:
            # Extract text and score
            text = result.get("text", "")
            score = result.get("score", 0)
            
            # Extract source with proper fallback handling
            if "metadata" in result and isinstance(result["metadata"], dict):
                source = result["metadata"].get("source", result.get("source", "Unknown"))
            else:
                source = result.get("source", "Unknown")
                
            sources.append({
                "text": text,
                "source": source,
                "score": score
            })
        
        # Sort sources by score (highest first) and limit to top 5
        sources = sorted(sources, key=lambda x: x.get("score", 0), reverse=True)[:5]
        print(f"Prepared {len(sources)} sources for response")
        
        # Log each source to check for duplicates
        for i, source in enumerate(sources):
            print(f"Source {i}: {source['source']}, Score: {source['score']}, Text: {source['text'][:30]}...")
            
        # Find diverse sources by looking at different sections
        # First, group sources by their base filename (without section number)
        source_groups = {}
        for source in sources:
            # Extract just the filename without the section number
            source_name = source['source'].split(' (Section')[0] if ' (Section' in source['source'] else source['source']
            
            if source_name not in source_groups:
                source_groups[source_name] = []
            source_groups[source_name].append(source)
        
        # For each group, find sources from different sections if possible
        final_sources = []
        seen_texts = set()
        
        # First, add the highest scoring source from each group
        for source_name, group_sources in source_groups.items():
            # Sort by score descending
            group_sources.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Add the highest scoring source
            best_source = group_sources[0]
            text_fingerprint = best_source['text'][:100]
            seen_texts.add(text_fingerprint)
            final_sources.append(best_source)
        
        # If we have fewer than 3 sources and there are multiple sections in the same document,
        # try to add sources from different sections
        if len(final_sources) < 3:
            # Find sources with different section numbers
            for source_name, group_sources in source_groups.items():
                if len(final_sources) >= 3:
                    break
                    
                # Try to find sources from different sections
                for source in group_sources:
                    if len(final_sources) >= 3:
                        break
                        
                    text_fingerprint = source['text'][:100]
                    if text_fingerprint not in seen_texts:
                        seen_texts.add(text_fingerprint)
                        final_sources.append(source)
        
        # Sort final sources by score
        final_sources.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        # Replace with unique sources
        sources = final_sources
        print(f"After deduplication: {len(sources)} unique sources")
        
        # Create response headers
        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
        
        # Create streaming response
        async def generate():
            try:
                # First yield the sources as a special message
                sources_json = json.dumps({"sources": sources})
                yield f"data: {sources_json}\n\n"
                
                # Then stream the actual response
                async for chunk in rag_engine.astream_query(query, system_prompt):
                    yield f"data: {chunk}\n\n"
                
                # Add completion marker
                yield "data: __STREAM_COMPLETE__\n\n"
            except Exception as e:
                # Return error message in the stream
                yield f"data: Error: {str(e)}\n\n"
                yield "data: __STREAM_COMPLETE__\n\n"
        
        return StreamingResponse(generate(), headers=headers)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error processing request: {str(e)}"}
        )

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
