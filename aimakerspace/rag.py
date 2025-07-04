from typing import List, Dict, Any, Optional
from aimakerspace.qdrant_store import QdrantVectorStore
from aimakerspace.openai_utils.chatmodel import ChatOpenAI
from aimakerspace.openai_utils.prompts import SystemRolePrompt, UserRolePrompt

class RAGQueryEngine:
    def __init__(self, 
                 collection_name: str = "documents", 
                 model_name: str = "gpt-4.1-mini",
                 k: int = 5):
        self.vector_store = QdrantVectorStore(collection_name=collection_name)
        self.chat_model = ChatOpenAI(model_name=model_name)
        self.k = k
        
        # Default system prompt for RAG
        self.system_prompt = (
            "You are a helpful AI assistant that answers questions based on the provided context. "
            "Use the context to provide accurate and relevant answers. "
            "If the answer is not in the context, say that you don't know based on the provided information. "
            "Always cite the source of your information from the context when possible."
        )
    
    def query(self, query: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Query the RAG system with a question"""
        # Search for relevant documents
        search_results = self.vector_store.similarity_search(query, k=self.k)
        
        if not search_results:
            return {
                "answer": "I don't have any relevant information to answer your question.",
                "sources": []
            }
        
        # Format context from search results
        context = self._format_context(search_results)
        
        # Create messages for the chat model
        messages = [
            SystemRolePrompt(system_prompt or self.system_prompt).create_message(),
            UserRolePrompt(
                f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
            ).create_message()
        ]
        
        # Get response from chat model
        response = self.chat_model.run(messages)
        
        # Extract sources
        sources = [{
            "text": result["text"],
            "source": result["metadata"].get("source", "Unknown"),
            "score": result["score"]
        } for result in search_results]
        
        return {
            "answer": response,
            "sources": sources
        }
    
    async def aquery(self, query: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Query the RAG system with a question asynchronously"""
        print(f"RAG aquery method called with query: {query}")
        # Search for relevant documents
        search_results = await self.vector_store.asimilarity_search(query, k=self.k)
        print(f"Search results type: {type(search_results)}")
        if search_results:
            print(f"First result type: {type(search_results[0])}")
            print(f"First result keys: {search_results[0].keys() if hasattr(search_results[0], 'keys') else 'No keys method'}")
            print(f"First result: {search_results[0]}")
        else:
            print("No search results returned")
        
        if not search_results:
            return {
                "answer": "I don't have any relevant information to answer your question.",
                "sources": []
            }
        
        # Format context from search results
        context = self._format_context(search_results)
        
        # Create messages for the chat model
        messages = [
            SystemRolePrompt(system_prompt or self.system_prompt).create_message(),
            UserRolePrompt(
                f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
            ).create_message()
        ]
        
        # Get response from chat model
        response = self.chat_model.run(messages)
        
        # Extract sources
        sources = [{
            "text": result["text"],
            "source": result["metadata"].get("source", "Unknown"),
            "score": result["score"]
        } for result in search_results]
        
        return {
            "answer": response,
            "sources": sources
        }
    
    async def astream_query(self, query: str, system_prompt: Optional[str] = None):
        """Stream the RAG response asynchronously"""
        try:
            print(f"RAG astream_query called with query: {query}")
            # Search for relevant documents - increased to 5 for more diverse sources
            search_results = await self.vector_store.asimilarity_search(query, k=5)
            print(f"Search returned {len(search_results)} results")
            
            # Debug: Print the first search result to see its structure
            if search_results:
                print(f"First result keys: {search_results[0].keys()}")
                print(f"First result metadata: {search_results[0].get('metadata', {})}")
                print(f"First result source: {search_results[0].get('source', 'No source')}")
            
            # If no relevant PDF content is found, return a clear message and stop
            if not search_results or len(search_results) == 0:
                print("No search results found")
                yield "I don't have any relevant information from your uploaded PDFs to answer this question. Please try a different question related to the PDF content."
                return
                
            # Check if ALL relevance scores are too low (all below 50%)
            # Assuming scores are between 0 and 1
            max_score = max(result.get('score', 0) for result in search_results)
            avg_score = sum(result.get('score', 0) for result in search_results) / len(search_results)
            print(f"Maximum relevance score: {max_score:.2f}, Average relevance score: {avg_score:.2f}")
            
            # Only show the not relevant message if ALL scores are below 50%
            if max_score < 0.5:
                relevance_percentage = int(avg_score * 100)
                print(f"All relevance scores too low. Max: {max_score:.2f}, Avg: {relevance_percentage}%")
                yield f"While I found some content in your PDFs, it doesn't seem directly relevant to your question (relevance: {relevance_percentage}%). Please try a different question related to the PDF content."
                return
            
            # Format context from search results with error handling
            try:
                context = self._format_context(search_results)
                print(f"Context formatted successfully, length: {len(context)}")
            except Exception as e:
                print(f"Error formatting context: {e}")
                # Create a simple context if formatting fails
                context = "\n".join([f"Document {i+1}: {result.get('text', '')}" for i, result in enumerate(search_results)])
        except Exception as e:
            yield "I encountered an error while searching for relevant information. Please try again."
            return
        
        # Create messages for the chat model
        messages = [
            SystemRolePrompt(system_prompt or self.system_prompt).create_message(),
            UserRolePrompt(
                f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
            ).create_message()
        ]
        
        # Extract sources for frontend display
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
        
        print(f"Prepared {len(sources)} sources for streaming response")
        
        # Stream response from chat model
        async for chunk in self.chat_model.astream(messages):
            yield chunk
            
        # Add completion marker to signal the end of the stream
        yield "__STREAM_COMPLETE__"
    
    def _format_context(self, search_results: List[Dict[str, Any]]) -> str:
        """Format search results into a context string for prompt"""
        context_parts = []
        
        for i, result in enumerate(search_results):
            try:
                # Extract text safely
                text = result.get("text", "")
                
                # Extract source with proper fallback handling
                if "metadata" in result and isinstance(result["metadata"], dict):
                    source = result["metadata"].get("source", result.get("source", "Unknown"))
                else:
                    source = result.get("source", "Unknown")
                
                # Add to context parts
                context_parts.append(f"[Document {i+1}] Source: {source}\n{text}\n")
            except Exception as e:
                # Skip this result if there's an error
                pass
        
        return "\n\n".join(context_parts)
