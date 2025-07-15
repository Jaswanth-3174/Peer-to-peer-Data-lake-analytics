const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const chalk = require('chalk');

class NetworkManager extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.nodeId = uuidv4();
    this.peers = new Map();
    this.wss = null;
    this.connections = new Map();
    this.heartbeatInterval = null;
  }

  async start() {
    // Start WebSocket server
    this.wss = new WebSocket.Server({ port: this.port + 1000 }); // Use port+1000 for P2P
    
    this.wss.on('connection', (ws, req) => {
      this.handleIncomingConnection(ws, req);
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log(chalk.blue(`🔗 P2P Network listening on port ${this.port + 1000}`));
  }

  handleIncomingConnection(ws, req) {
    const peerId = uuidv4();
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(ws, message, peerId);
      } catch (error) {
        console.error(chalk.red('Invalid message received:'), error);
      }
    });

    ws.on('close', () => {
      this.handlePeerDisconnect(peerId);
    });

    ws.on('error', (error) => {
      console.error(chalk.red(`WebSocket error for peer ${peerId}:`), error);
    });

    // Send handshake
    this.sendMessage(ws, {
      type: 'handshake',
      nodeId: this.nodeId,
      timestamp: Date.now()
    });
  }

  handleMessage(ws, message, peerId) {
    switch (message.type) {
      case 'handshake':
        this.handleHandshake(ws, message, peerId);
        break;
      case 'peer-discovery':
        this.handlePeerDiscovery(message);
        break;
      case 'data-announcement':
        this.handleDataAnnouncement(message);
        break;
      case 'query-request':
        this.handleQueryRequest(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message, peerId);
        break;
      default:
        this.emit('message', message, peerId);
    }
  }

  handleHandshake(ws, message, peerId) {
    const peer = {
      id: message.nodeId,
      connection: ws,
      lastSeen: Date.now(),
      status: 'connected'
    };

    this.peers.set(message.nodeId, peer);
    this.connections.set(peerId, message.nodeId);

    console.log(chalk.green(`🤝 Peer connected: ${message.nodeId}`));
    this.emit('peer-connected', peer);

    // Send our peer list
    this.sendMessage(ws, {
      type: 'peer-list',
      peers: Array.from(this.peers.keys()).filter(id => id !== message.nodeId),
      nodeId: this.nodeId
    });
  }

  handlePeerDiscovery(message) {
    // Try to connect to newly discovered peers
    if (message.peers) {
      message.peers.forEach(peerInfo => {
        if (!this.peers.has(peerInfo.id) && peerInfo.id !== this.nodeId) {
          this.connectToPeer(peerInfo);
        }
      });
    }
  }

  handleDataAnnouncement(message) {
    console.log(chalk.cyan(`📢 Data announced: ${message.filename} from ${message.nodeId}`));
    this.emit('data-announced', message);
  }

  handleQueryRequest(message) {
    this.emit('query-request', message);
  }

  handleHeartbeat(message, peerId) {
    const nodeId = this.connections.get(peerId);
    if (nodeId && this.peers.has(nodeId)) {
      this.peers.get(nodeId).lastSeen = Date.now();
    }
  }

  handlePeerDisconnect(peerId) {
    const nodeId = this.connections.get(peerId);
    if (nodeId && this.peers.has(nodeId)) {
      const peer = this.peers.get(nodeId);
      this.peers.delete(nodeId);
      this.connections.delete(peerId);
      
      console.log(chalk.yellow(`👋 Peer disconnected: ${nodeId}`));
      this.emit('peer-disconnected', peer);
    }
  }

  async connectToPeer(peerInfo) {
    try {
      const ws = new WebSocket(`ws://${peerInfo.host || 'localhost'}:${peerInfo.port}`);
      
      ws.on('open', () => {
        console.log(chalk.green(`🔗 Connected to peer: ${peerInfo.id}`));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message, peerInfo.id);
        } catch (error) {
          console.error(chalk.red('Invalid message from peer:'), error);
        }
      });

      ws.on('error', (error) => {
        console.error(chalk.red(`Failed to connect to peer ${peerInfo.id}:`), error);
      });

    } catch (error) {
      console.error(chalk.red(`Error connecting to peer:`), error);
    }
  }

  sendMessage(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, excludeNodeId = null) {
    this.peers.forEach((peer, nodeId) => {
      if (nodeId !== excludeNodeId && peer.connection) {
        this.sendMessage(peer.connection, message);
      }
    });
  }

  sendToPeer(nodeId, message) {
    const peer = this.peers.get(nodeId);
    if (peer && peer.connection) {
      this.sendMessage(peer.connection, message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      // Send heartbeat to all peers
      this.broadcast({
        type: 'heartbeat',
        nodeId: this.nodeId,
        timestamp: now
      });

      // Remove stale peers
      const staleTimeout = 60000; // 1 minute
      this.peers.forEach((peer, nodeId) => {
        if (now - peer.lastSeen > staleTimeout) {
          this.peers.delete(nodeId);
          console.log(chalk.yellow(`⏰ Removed stale peer: ${nodeId}`));
          this.emit('peer-disconnected', peer);
        }
      });
    }, 30000); // Every 30 seconds
  }

  getPeers() {
    return Array.from(this.peers.values()).map(peer => ({
      id: peer.id,
      status: peer.status,
      lastSeen: peer.lastSeen
    }));
  }

  getPeersCount() {
    return this.peers.size;
  }

  async stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    // Close all peer connections
    this.peers.forEach(peer => {
      if (peer.connection) {
        peer.connection.close();
      }
    });

    this.peers.clear();
    this.connections.clear();
  }
}

module.exports = NetworkManager;
