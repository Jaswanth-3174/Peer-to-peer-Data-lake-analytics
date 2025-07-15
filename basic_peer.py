"""
Basic P2P Data Lake Analytics Framework
Simple peer-to-peer file sharing and data querying
"""

import os
import json
import pandas as pd
from pathlib import Path
from flask import Flask, request, jsonify, send_file
import threading
import time
import requests

class BasicPeer:
    def __init__(self, peer_id, port):
        self.peer_id = peer_id
        self.port = port
        self.host = "127.0.0.1"
        
        # Create data directory for this peer
        self.data_dir = Path(f"peer_{peer_id}_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # Store files and known peers
        self.files = {}  # filename -> file info
        self.peers = {}  # peer_id -> peer info
        
        # Flask web server
        self.app = Flask(f"BasicPeer-{peer_id}")
        self.setup_routes()
        
        print(f"Basic Peer {peer_id} initialized on port {port}")
    
    def setup_routes(self):
        """Setup simple web API routes"""
        
        @self.app.route('/status')
        def status():
            """Get peer status"""
            return jsonify({
                'peer_id': self.peer_id,
                'status': 'running',
                'files_count': len(self.files),
                'peers_count': len(self.peers)
            })
        
        @self.app.route('/upload', methods=['POST'])
        def upload():
            """Upload a file to this peer"""
            if 'file' not in request.files:
                return jsonify({'error': 'No file'}), 400
            
            file = request.files['file']
            if not file.filename:
                return jsonify({'error': 'No filename'}), 400
            
            # Save file
            filename = file.filename
            filepath = self.data_dir / filename
            file.save(filepath)
            
            # Store file info
            self.files[filename] = {
                'size': filepath.stat().st_size,
                'owner': self.peer_id,
                'path': str(filepath)
            }
            
            print(f"File {filename} uploaded to {self.peer_id}")
            return jsonify({'success': True, 'filename': filename})
        
        @self.app.route('/files')
        def list_files():
            """List all known files"""
            return jsonify({'files': list(self.files.keys())})
        
        @self.app.route('/query', methods=['POST'])
        def query():
            """Query data from a CSV file"""
            data = request.get_json()
            filename = data.get('filename')
            
            if filename not in self.files:
                return jsonify({'error': 'File not found'}), 404
            
            try:
                # Load CSV file
                filepath = self.data_dir / filename
                df = pd.read_csv(filepath)
                
                # Return first 5 rows as sample
                result = df.head(5).to_dict('records')
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'total_rows': len(df),
                    'columns': df.columns.tolist()
                })
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/connect', methods=['POST'])
        def connect():
            """Connect to another peer"""
            data = request.get_json()
            peer_id = data.get('peer_id')
            host = data.get('host', '127.0.0.1')
            port = data.get('port')
            
            if peer_id and port:
                self.peers[peer_id] = {'host': host, 'port': port}
                print(f"Connected to peer {peer_id}")
                return jsonify({'success': True})
            
            return jsonify({'error': 'Invalid peer info'}), 400
    
    def start(self):
        """Start the peer server"""
        print(f"Starting Basic Peer {self.peer_id} on http://{self.host}:{self.port}")
        self.app.run(host=self.host, port=self.port, debug=False)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python basic_peer.py <peer_id> <port>")
        sys.exit(1)
    
    peer_id = sys.argv[1]
    port = int(sys.argv[2])
    
    peer = BasicPeer(peer_id, port)
    peer.start()
