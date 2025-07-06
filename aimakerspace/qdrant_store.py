import numpy as np
from typing import List, Dict, Any, Optional, Union
import uuid
import os
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
            # Check for Qdrant Cloud configuration in environment variables
            qdrant_url = os.environ.get("QDRANT_URL")
            qdrant_api_key = os.environ.get("QDRANT_API_KEY")
            
            # If Qdrant Cloud configuration exists, use cloud client
            if qdrant_url and qdrant_api_key:
                print(f"Connecting to Qdrant Cloud at {qdrant_url}")
                QdrantVectorStore._shared_client = QdrantClient(
                    url=qdrant_url,
                    api_key=qdrant_api_key,
                )
            else:
                # Fall back to local storage
                print("Using local Qdrant storage")
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
    
    def get_all_pdf_metadata(self) -> List[Dict[str, Any]]:
        """Retrieve metadata for all PDFs stored in the vector database"""
        try:
            # Get all points with scroll API
            pdf_files = {}
            offset = None
            
            # Use scroll to get all points in batches
            while True:
                # Fetch a batch of points
                scroll_result = self.client.scroll(
                    collection_name=self.collection_name,
                    limit=100,  # Fetch in batches
                    with_payload=True,
                    with_vectors=False,  # We don't need the vectors
                    offset=offset  # Continue from last batch
                )
                
                # Process results
                points = scroll_result[0]
                offset = scroll_result[1]  # Get offset for next batch
                
                # If no more points, break the loop
                if not points:
                    break
                
                # Extract unique PDF files from points
                for point in points:
                    if point.payload and "metadata" in point.payload:
                        metadata = point.payload["metadata"]
                        if "source" in metadata:
                            filename = metadata["source"]
                            
                            # First, check if file_id is explicitly stored in metadata
                            file_id = metadata.get("file_id", None)
                            
                            # If no explicit file_id, try to extract it from the filename
                            if not file_id and '_' in filename:
                                # Check if the first part looks like a UUID
                                parts = filename.split('_', 1)
                                if len(parts) == 2:
                                    potential_id = parts[0]
                                    # Only use as file_id if it looks like a UUID or is alphanumeric
                                    if ('-' in potential_id and len(potential_id) > 8) or potential_id.isalnum():
                                        file_id = potential_id
                                        # Use the part after the first underscore as the display filename
                                        display_filename = parts[1]
                                    else:
                                        display_filename = filename
                                else:
                                    display_filename = filename
                            else:
                                display_filename = filename
                            
                            # If we still don't have a file_id, generate one from the filename
                            if not file_id:
                                import hashlib
                                file_id = hashlib.md5(filename.encode()).hexdigest()[:8]
                            
                            # Store PDF metadata
                            if file_id not in pdf_files:
                                pdf_files[file_id] = {
                                    "file_id": file_id,
                                    "filename": display_filename,
                                    "num_chunks": 1,
                                    "status": "completed"  # If it's in Qdrant, it's completed
                                }
                            else:
                                # Increment chunk count
                                pdf_files[file_id]["num_chunks"] += 1
                
                # If we've processed all points (no more offset), break the loop
                if offset is None:
                    break
            
            return list(pdf_files.values())
        except Exception as e:
            print(f"Error retrieving PDF metadata: {e}")
            import traceback
            traceback.print_exc()
            return []
    
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
        
    def delete_pdf_by_file_id(self, file_id: str) -> bool:
        """Delete all vector points associated with a specific PDF file_id"""
        try:
            print(f"Attempting to delete PDF with file_id: {file_id}")
            point_ids_to_delete = []
            offset = None
            total_points_checked = 0
            
            # We need to scroll through all points in batches
            while True:
                # Get points with scroll API
                scroll_result = self.client.scroll(
                    collection_name=self.collection_name,
                    limit=100,  # Fetch in batches
                    with_payload=True,
                    with_vectors=False,  # We don't need the vectors
                    offset=offset  # Continue from last batch
                )
                
                # Process results
                points = scroll_result[0]
                total_points_checked += len(points)
                print(f"Checking batch of {len(points)} points, total checked: {total_points_checked}")
                
                # If no more points, break the loop
                if not points:
                    break
                
                # Get the offset for the next batch
                offset = scroll_result[1]
                
                # Find points that belong to this PDF
                for point in points:
                    if point.payload and "metadata" in point.payload:
                        metadata = point.payload["metadata"]
                        
                        # Method 0: Check if file_id is directly stored in metadata
                        if "file_id" in metadata and metadata["file_id"] == file_id:
                            point_ids_to_delete.append(point.id)
                            print(f"Found match by direct metadata file_id: {metadata.get('source', 'unknown')}")
                            continue
                            
                        if "source" in metadata:
                            filename = metadata["source"]
                            print(f"Checking source: {filename}")
                            
                            # Method 1: Direct file_id match at start of filename
                            if '_' in filename and filename.startswith(f"{file_id}_"):
                                point_ids_to_delete.append(point.id)
                                print(f"Found match by prefix: {filename}")
                                continue
                            
                            # Method 2: Check if the first part looks like a UUID or matches our file_id
                            extracted_file_id = None
                            if '_' in filename:
                                parts = filename.split('_', 1)
                                if len(parts) == 2:
                                    potential_id = parts[0]
                                    # Only use as file_id if it looks like a UUID or is alphanumeric
                                    if ('-' in potential_id and len(potential_id) > 8) or potential_id.isalnum():
                                        extracted_file_id = potential_id
                            
                            # If we couldn't extract a file_id, generate one from the filename
                            if not extracted_file_id:
                                import hashlib
                                extracted_file_id = hashlib.md5(filename.encode()).hexdigest()[:8]
                                print(f"Generated hash ID for {filename}: {extracted_file_id}")
                                
                            if extracted_file_id == file_id:
                                point_ids_to_delete.append(point.id)
                                print(f"Found match by extracted ID: {filename} -> {extracted_file_id}")
                
                # If we've processed all points (no more offset), break the loop
                if offset is None:
                    break
            
            # Delete the points if any were found
            if point_ids_to_delete:
                from qdrant_client import models
                print(f"Deleting {len(point_ids_to_delete)} points for file_id: {file_id}")
                
                # Delete in batches of 100 to avoid hitting limits
                batch_size = 100
                for i in range(0, len(point_ids_to_delete), batch_size):
                    batch = point_ids_to_delete[i:i+batch_size]
                    self.client.delete(
                        collection_name=self.collection_name,
                        points_selector=models.PointIdsList(
                            points=batch
                        )
                    )
                    print(f"Deleted batch {i//batch_size + 1} of {(len(point_ids_to_delete) + batch_size - 1) // batch_size}")
                
                print(f"Successfully deleted all {len(point_ids_to_delete)} points for file_id: {file_id}")
                return True
            else:
                print(f"No points found for file_id: {file_id} after checking {total_points_checked} points")
                return False
                
        except Exception as e:
            print(f"Error deleting PDF: {e}")
            import traceback
            traceback.print_exc()
            return False
