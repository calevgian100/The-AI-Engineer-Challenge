import numpy as np
from typing import List, Dict, Any, Optional, Union
import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams
from aimakerspace.openai_utils.embedding import EmbeddingModel

class QdrantVectorStore:
    # Class-level shared client to ensure all instances use the same client
    _shared_client = None
    
    def __init__(self, collection_name: str = "documents", embedding_model: EmbeddingModel = None):
        # Initialize or use the shared Qdrant client
        if QdrantVectorStore._shared_client is None:
            # Use a persistent local directory instead of in-memory
            import os
            qdrant_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'qdrant_data')
            os.makedirs(qdrant_path, exist_ok=True)
            QdrantVectorStore._shared_client = QdrantClient(path=qdrant_path)
        
        self.client = QdrantVectorStore._shared_client
        self.collection_name = collection_name
        self.embedding_model = embedding_model or EmbeddingModel()
        self.embedding_size = 1536  # Default for OpenAI embeddings
        
        # Create collection if it doesn't exist
        self._create_collection_if_not_exists()
    
    def _create_collection_if_not_exists(self):
        """Create the collection if it doesn't exist"""
        collections = self.client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        if self.collection_name not in collection_names:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_size,
                    distance=Distance.COSINE
                )
            )
    
    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        """Add texts to the vector store"""
        # Generate embeddings for texts
        embeddings = self.embedding_model.get_embeddings(texts)
        
        # Create points with embeddings and payload
        points = []
        ids = []
        
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            # Generate a unique ID
            point_id = str(uuid.uuid4())
            ids.append(point_id)
            
            # Create payload with text
            payload = {"text": text}
            
            # Add metadata if provided
            if metadatas and i < len(metadatas):
                # Store metadata in a dedicated field
                payload["metadata"] = metadatas[i]
                # Also copy source to the top level for compatibility
                if "source" in metadatas[i]:
                    payload["source"] = metadatas[i]["source"]
            
            # Create point
            point = models.PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload
            )
            points.append(point)
        
        # Insert points into collection
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        
        return ids
    
    async def aadd_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        """Add texts to the vector store asynchronously"""
        # Generate embeddings for texts asynchronously
        embeddings = await asyncio.gather(*[self._agenerate_embedding(text) for text in texts])
        
        # Create points with embeddings and payload
        points = []
        ids = []
        
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            # Generate a unique ID
            point_id = str(uuid.uuid4())
            ids.append(point_id)
            
            # Create payload with text
            payload = {"text": text}
            
            # Add metadata if provided
            if metadatas and i < len(metadatas):
                # Store metadata in a dedicated field
                payload["metadata"] = metadatas[i]
                # Also copy source to the top level for compatibility
                if "source" in metadatas[i]:
                    payload["source"] = metadatas[i]["source"]
            
            # Create point
            point = models.PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload
            )
            points.append(point)
        
        # Insert points into collection
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        
        return ids
    
    def similarity_search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search for documents similar to query"""
        print(f"Similarity search for query: {query}")
        # Generate embedding for query
        query_embedding = self.embedding_model.get_embedding(query)
        print(f"Generated embedding of length: {len(query_embedding)}")
        
        # Get collection info to verify it exists and has points
        try:
            collection_info = self.client.get_collection(self.collection_name)
            print(f"Collection info: {collection_info.vectors_count} vectors in collection")
        except Exception as e:
            print(f"Error getting collection info: {e}")
        
        # Search in the collection
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=k
        )
        print(f"Search returned {len(search_result)} results")
        
        # Format results
        results = []
        for scored_point in search_result:
            item = {
                "text": scored_point.payload.get("text", ""),
                "source": scored_point.payload.get("source", "Unknown"),
                "score": scored_point.score,
            }
            results.append(item)
        
        return results
    
    async def _agenerate_embedding(self, text: str) -> List[float]:
        """Generate embedding asynchronously"""
        return await self.embedding_model.async_get_embedding(text)
    
    async def asimilarity_search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search for documents similar to query asynchronously"""
        # Generate embedding for query
        embedding = await self._agenerate_embedding(query)
        
        # Search in the collection
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            limit=k
        )
        
        print(f"Async search returned {len(search_result)} results")
        if search_result:
            print(f"First result payload: {search_result[0].payload}")
        
        # Convert to expected format with proper metadata handling
        results = []
        for scored_point in search_result:
            payload = scored_point.payload
            
            # Extract text
            text = payload.get("text", "")
            
            # Extract metadata - could be in payload["metadata"] or directly in payload
            if "metadata" in payload and isinstance(payload["metadata"], dict):
                metadata = payload["metadata"]
            else:
                # If no metadata field, treat the payload itself as metadata
                metadata = payload
            
            # Use the source from metadata if available, otherwise fallback to payload source
            source = metadata.get("source", payload.get("source", "Unknown"))
            
            # Include page number or chunk index in source if available
            if "chunk_index" in metadata:
                source_display = f"{source} (Section {metadata['chunk_index'] + 1})"
            else:
                source_display = source
            
            print(f"Found source: {source_display} with score {scored_point.score:.2f}")
                
            results.append({
                "text": text,
                "metadata": metadata,
                "source": source_display,
                "score": scored_point.score
            })
        
        return results
