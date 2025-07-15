const EventEmitter = require('events');
const io = require('socket.io-client');

class P2PNetwork extends EventEmitter {
    constructor(nodeId, port = 3000, bootstrapNode = null) {
        super();
        this.nodeId = nodeId;
        this.port = port;
        this.bootstrapNode = bootstrapNode;
        this.peers = new Map();
        this.isBootstrap = !bootstrapNode;
        this.status = 'disconnected';
        this.socket = null;
    }

    async start() {
        try {
            console.log(`Starting P2P node ${this.nodeId.substring(0, 8)} on port ${this.port}`);
            
            if (this.bootstrapNode) {
                // Connect to bootstrap node
                await this.connectToBootstrap();
            }
            
            this.status = 'connected';
            this.emit('started');
            return true;
        } catch (error) {
            console.error('Failed to start P2P network:', error);
            // Don't throw error, just continue without P2P
            this.status = 'standalone';
            return false;
        }
    }

    async connectToBootstrap() {
        return new Promise((resolve, reject) => {
            this.socket = io(`http://localhost:${this.bootstrapNode}`);
            
            this.socket.on('connect', () => {
                console.log(`Connected to bootstrap node on port ${this.bootstrapNode}`);
                this.socket.emit('join-network', { nodeId: this.nodeId, port: this.port });
                resolve();
            });

            this.socket.on('peer-list', (peers) => {
                this.handlePeerList(peers);
            });

            this.socket.on('new-peer', (peer) => {
                this.handleNewPeer(peer);
            });

            this.socket.on('data-query', (data) => {
                this.emit('query', data);
            });

            this.socket.on('data-response', (data) => {
                this.emit('queryResult', data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Bootstrap connection failed:', error);
                reject(error);
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.socket.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    handlePeerList(peers) {
        console.log('Received peer list:', peers);
        peers.forEach(peer => {
            if (peer.nodeId !== this.nodeId) {
                this.peers.set(peer.nodeId, peer);
            }
        });
        this.emit('peerUpdate', Array.from(this.peers.values()));
    }

    handleNewPeer(peer) {
        if (peer.nodeId !== this.nodeId) {
            this.peers.set(peer.nodeId, peer);
            console.log(`New peer joined: ${peer.nodeId}`);
            this.emit('peerJoined', peer);
        }
    }

    async announceDataset(dataset) {
        console.log(`📢 Announcing dataset: ${dataset.filename}`);
        await this.broadcast('dataset-announcement', dataset);
    }

    async broadcast(type, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('broadcast', { type, data, from: this.nodeId });
        }
    }

    async query(sql, targetPeer = null) {
        const queryData = {
            id: Date.now().toString(),
            sql,
            from: this.nodeId,
            timestamp: Date.now()
        };

        if (this.socket && this.socket.connected) {
            this.socket.emit('query-network', queryData);
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ error: 'Query timeout' });
            }, 10000);

            this.once('queryResult', (result) => {
                clearTimeout(timeout);
                resolve(result);
            });
        });
    }

    getPeers() {
        return Array.from(this.peers.values());
    }

    getPeersCount() {
        return this.peers.size;
    }

    addPeer(peer) {
        this.peers.set(peer.nodeId, peer);
        console.log(`✅ Added peer: ${peer.nodeId} (${this.peers.size} total peers)`);
        this.emit('peer-connected', peer);
    }

    removePeer(nodeId) {
        if (this.peers.has(nodeId)) {
            const peer = this.peers.get(nodeId);
            this.peers.delete(nodeId);
            console.log(`❌ Removed peer: ${nodeId} (${this.peers.size} total peers)`);
            this.emit('peer-disconnected', peer);
        }
    }

    getStatus() {
        return {
            nodeId: this.nodeId,
            port: this.port,
            status: this.status,
            peerCount: this.peers.size,
            peers: this.getPeers(),
            isBootstrap: this.isBootstrap
        };
    }

    async stop() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.status = 'disconnected';
        this.emit('stopped');
    }
}

module.exports = P2PNetwork;
