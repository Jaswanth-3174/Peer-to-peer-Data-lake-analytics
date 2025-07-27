from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import asyncio
import json
from data_engine import DataLakeEngine 


# Pydantic models for request/response
class QueryRequest(BaseModel):
    query: str

class PeerQueryRequest(BaseModel):
    query: str
    peers: List[str]

class QueryResponse(BaseModel):
    success: bool
    data: List[List[Any]]
    columns: List[str]
    row_count: int
    error: Optional[str] = None
    peer_id: Optional[str] = None

class PeerInfo(BaseModel):
    peer_id: str
    host: str
    port: int
    status: str

class MultiPeerResponse(BaseModel):
    success: bool
    results: List[QueryResponse]
    aggregated_data: List[List[Any]]
    columns: List[str]
    total_rows: int
    error: Optional[str] = None

# Initialize FastAPI app
app = FastAPI(title="P2P Data Lake Peer", version="1.0.0")

# Configure CORS with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Initialize data engine
data_engine = DataLakeEngine()

# Peer configuration
PEER_CONFIG = {
    "peer_id": "peer_1",
    "host": "localhost",
    "port": 8001
}

@app.get("/")
async def root():
    return {
        "message": "P2P Data Lake Peer",
        "peer_id": PEER_CONFIG["peer_id"],
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "peer_id": PEER_CONFIG["peer_id"]}

@app.get("/info")
async def get_peer_info():
    tables = data_engine.get_tables()
    return {
        "peer_id": PEER_CONFIG["peer_id"],
        "host": PEER_CONFIG["host"],
        "port": PEER_CONFIG["port"],
        "tables": tables,
        "table_count": len(tables)
    }

@app.get("/tables")
async def get_tables():
    """Get list of available tables"""
    tables = data_engine.get_tables()
    return {"tables": tables}

@app.get("/tables/{table_name}/schema")
async def get_table_schema(table_name: str):
    """Get schema for a specific table"""
    schema = data_engine.get_table_schema(table_name)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
    return {"table_name": table_name, "schema": schema}

@app.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """Execute SQL query on this peer"""
    result = data_engine.execute_query(request.query)
    
    return QueryResponse(
        success=result["success"],
        data=result["data"],
        columns=result["columns"],
        row_count=result["row_count"],
        error=result.get("error"),
        peer_id=PEER_CONFIG["peer_id"]
    )

async def query_peer(peer_url: str, query: str) -> QueryResponse:
    """Query a single peer"""
    try:
        # Execute the query directly if it's the current peer
        # Extract port from the peer URL for comparison (to handle self-queries)
        # Extract port from peer_url to better handle self-peer detection
        peer_port = None
        if "localhost:" in peer_url or "127.0.0.1:" in peer_url:
            try:
                peer_port = int(peer_url.split(":")[-1])
            except (ValueError, IndexError):
                peer_port = None
        
        print(f"Comparing peer URL {peer_url} with current port {PEER_CONFIG['port']}, extracted peer port: {peer_port}")
        
        # If this is a self-query (same port or current host:port)
        current_peer_url = f"http://{PEER_CONFIG['host']}:{PEER_CONFIG['port']}"
        if peer_url == current_peer_url or (peer_port is not None and peer_port == PEER_CONFIG['port']):
            print(f"Self-query detected, executing locally")
            # Execute query locally
            result = data_engine.execute_query(query)
            return QueryResponse(
                success=result["success"],
                data=result["data"],
                columns=result["columns"],
                row_count=result["row_count"],
                error=result.get("error"),
                peer_id=PEER_CONFIG["peer_id"]
            )
            
        # First, check if the peer is online
        try:
            health_response = requests.get(f"{peer_url}/health", timeout=5)
            if health_response.status_code != 200:
                return QueryResponse(
                    success=False,
                    data=[],
                    columns=[],
                    row_count=0,
                    error=f"Peer appears to be offline or not responding correctly. Status: {health_response.status_code}",
                    peer_id=peer_url
                )
        except requests.RequestException:
            return QueryResponse(
                success=False,
                data=[],
                columns=[],
                row_count=0,
                error="Peer is offline or not reachable",
                peer_id=peer_url
            )
            
        # If peer is online, execute the query
        response = requests.post(
            f"{peer_url}/query",
            json={"query": query},
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            return QueryResponse(**data)
        else:
            return QueryResponse(
                success=False,
                data=[],
                columns=[],
                row_count=0,
                error=f"HTTP {response.status_code}: {response.text}",
                peer_id=peer_url
            )
    except Exception as e:
        return QueryResponse(
            success=False,
            data=[],
            columns=[],
            row_count=0,
            error=f"Error querying peer: {str(e)}",
            peer_id=peer_url
        )

@app.post("/query/multi-peer", response_model=MultiPeerResponse)
async def execute_multi_peer_query(request: PeerQueryRequest):
    """Execute query across multiple peers"""
    print(f"Received multi-peer query request: {request}")
    results = []
    
    # Handle case where query has a semicolon at the end (common in SQL)
    query = request.query
    if query.strip().endswith(';'):
        query = query.strip()[:-1]
    
    # Query each peer
    for peer_url in request.peers:
        print(f"Querying peer: {peer_url}")
        result = await query_peer(peer_url, query)
        print(f"Result from {peer_url}: {'Success' if result.success else 'Failed - ' + str(result.error)}")
        results.append(result)
    
    # Check if we have any successful results
    successful_results = [r for r in results if r.success]
    
    # If no successful results, return the first error
    if not successful_results:
        error_message = "All peer queries failed"
        if results:
            error_message = f"All peer queries failed. First error: {results[0].error}"
        
        return MultiPeerResponse(
            success=False,
            results=results,
            aggregated_data=[],
            columns=[],
            total_rows=0,
            error=error_message
        )
    
    # Aggregate results
    all_data = []
    columns = []
    total_rows = 0
    
    for result in successful_results:
        if result.success and result.data:
            if not columns:
                columns = result.columns
            all_data.extend(result.data)
            total_rows += result.row_count
    
    return MultiPeerResponse(
        success=True,
        results=results,
        aggregated_data=all_data,
        columns=columns,
        total_rows=total_rows
    )

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Upload CSV file to this peer"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        # Save uploaded file
        file_path = f"data/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Add to data engine
        success = data_engine.add_csv_data(file_path)
        
        if success:
            return {"message": f"File {file.filename} uploaded successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to process uploaded file")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # Allow port to be specified via command line
    port = 8001
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            PEER_CONFIG["port"] = port
            PEER_CONFIG["peer_id"] = f"peer_{port - 8000}"
        except ValueError:
            print("Invalid port number")
    
    print(f"Starting peer {PEER_CONFIG['peer_id']} on port {port}")
    # Print out URL for debugging
    print(f"Peer URL: http://localhost:{port}")
    print(f"Current peer config: {PEER_CONFIG}")
    uvicorn.run(app, host="0.0.0.0", port=port)
