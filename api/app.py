# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load API key from env.yaml file
def load_api_key():
    try:
        env_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'env.yaml')
        with open(env_file_path, 'r') as file:
            content = file.read()
            # Simple parsing: look for line starting with 'openai_api_key:'
            for line in content.splitlines():
                if line.strip().startswith('openai_api_key:'):
                    # Extract the API key value (remove 'openai_api_key:' and strip quotes)
                    api_key = line.split(':', 1)[1].strip()
                    # Remove surrounding quotes if present
                    api_key = api_key.strip('\'"')
                    return api_key
        return ''
    except Exception as e:
        return ''

# Get the API key
DEFAULT_API_KEY = load_api_key()

# CORS middleware already added above

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default
    api_key: Optional[str] = None  # OpenAI API key is now optional

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Use the provided API key or fall back to the default from env.yaml
        api_key = request.api_key if request.api_key else DEFAULT_API_KEY
        
        if not api_key:
            raise HTTPException(status_code=400, detail="No API key provided and no default API key found")
            
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
                    stream=True  # Enable streaming response
                )
                
                # Yield each chunk of the response as it becomes available
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content
                        
                # Send a final newline to signal the end of the stream
                yield "\n"
                
            except Exception as e:
                yield f"Error: {str(e)}"

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

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
