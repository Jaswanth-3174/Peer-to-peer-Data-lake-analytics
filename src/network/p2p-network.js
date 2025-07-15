const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

class P2PNetwork extends EventEmitter {
  constructor(networkManager) {
    super();
    this.networkManager = networkManager;
    this.nodeId = networkManager.nodeId;
    this.routingTable = new Map();
    this.messageCache = new Map();
    this.maxCacheSize = 1000;

    this.setupNetworkHandlers();
  }

  setupNetworkHandlers() {
    this.networkManager.on('peer-connected', (peer) => {
      this.updateRoutingTable(peer);
      this.emit('peer-connected', peer);
    });

    this.networkManager.on('peer-disconnected', (peer) => {
      this.removeFromRoutingTable(peer);
      this.emit('peer-disconnected', peer);
    });

    this.networkManager.on('message', (message, peerId) => {
      this.handleNetworkMessage(message, peerId);
    });

    this.networkManager.on('data-announced', (announcement) => {
      this.emit('data-announced', announcement);
    });
  }

  async start() {
    await this.networkManager.start();
    console.log(chalk.blue(`🌐 P2P Network started with Node ID: ${this.nodeId}`));
  }

  handleNetworkMessage(message, peerId) {
    // Check if we've seen this message before (prevent loops)
    if (message.messageId && this.messageCache.has(message.messageId)) {
      return;
    }

    // Cache the message
    if (message.messageId) {
      this.cacheMessage(message.messageId);
    }

    switch (message.type) {
      case 'route-discovery':
        this.handleRouteDiscovery(message, peerId);
        break;
      case 'data-query':
        this.handleDataQuery(message, peerId);
        break;
      case 'data-response':
        this.handleDataResponse(message, peerId);
        break;
      case 'sync-request':
        this.handleSyncRequest(message, peerId);
        break;
      default:
        this.emit('custom-message', message, peerId);
    }
  }

  handleRouteDiscovery(message, peerId) {
    // Update routing table with discovered routes
    if (message.routes) {
      message.routes.forEach(route => {
        if (route.nodeId !== this.nodeId) {
          this.routingTable.set(route.nodeId, {
            nextHop: peerId,
            hopCount: route.hopCount + 1,
            lastUpdate: Date.now()
          });
        }
      });
    }
  }

  handleDataQuery(message, peerId) {
    console.log(chalk.cyan(`🔍 Received data query from ${peerId}`));
    this.emit('data-query', message, peerId);
  }

  handleDataResponse(message, peerId) {
    console.log(chalk.green(`📋 Received data response from ${peerId}`));
    this.emit('data-response', message, peerId);
  }

  handleSyncRequest(message, peerId) {
    console.log(chalk.blue(`🔄 Received sync request from ${peerId}`));
    this.emit('sync-request', message, peerId);
  }

  updateRoutingTable(peer) {
    this.routingTable.set(peer.id, {
      nextHop: peer.id,
      hopCount: 1,
      lastUpdate: Date.now()
    });

    // Send route discovery to new peer
    this.sendToNode(peer.id, {
      type: 'route-discovery',
      messageId: uuidv4(),
      sourceNode: this.nodeId,
      routes: this.getRoutingInfo(),
      timestamp: Date.now()
    });
  }

  removeFromRoutingTable(peer) {
    this.routingTable.delete(peer.id);
    
    // Remove routes that go through this peer
    for (const [nodeId, route] of this.routingTable.entries()) {
      if (route.nextHop === peer.id) {
        this.routingTable.delete(nodeId);
      }
    }
  }

  getRoutingInfo() {
    return Array.from(this.routingTable.entries()).map(([nodeId, route]) => ({
      nodeId,
      hopCount: route.hopCount
    }));
  }

  cacheMessage(messageId) {
    // Simple LRU cache
    if (this.messageCache.size >= this.maxCacheSize) {
      const firstKey = this.messageCache.keys().next().value;
      this.messageCache.delete(firstKey);
    }
    this.messageCache.set(messageId, Date.now());
  }

  sendToNode(nodeId, message) {
    const route = this.routingTable.get(nodeId);
    if (route) {
      this.networkManager.sendToPeer(route.nextHop, message);
      return true;
    }
    return false;
  }

  broadcast(message, excludeNodeId = null) {
    message.messageId = message.messageId || uuidv4();
    this.cacheMessage(message.messageId);
    this.networkManager.broadcast(message, excludeNodeId);
  }

  announceDataset(dataset) {
    const announcement = {
      type: 'data-announcement',
      messageId: uuidv4(),
      dataset,
      nodeId: this.nodeId,
      timestamp: Date.now()
    };

    this.broadcast(announcement);
    console.log(chalk.cyan(`📢 Announced dataset: ${dataset.filename}`));
  }

  queryNetwork(query) {
    const queryMessage = {
      type: 'data-query',
      messageId: uuidv4(),
      query,
      sourceNode: this.nodeId,
      timestamp: Date.now()
    };

    this.broadcast(queryMessage);
    console.log(chalk.blue(`🔍 Broadcasting query to network`));
    
    return queryMessage.messageId;
  }

  requestSync(targetNode = null) {
    const syncRequest = {
      type: 'sync-request',
      messageId: uuidv4(),
      sourceNode: this.nodeId,
      timestamp: Date.now()
    };

    if (targetNode) {
      this.sendToNode(targetNode, syncRequest);
    } else {
      this.broadcast(syncRequest);
    }

    console.log(chalk.blue(`🔄 Requesting data sync`));
  }

  getPeers() {
    return this.networkManager.getPeers();
  }

  getPeersCount() {
    return this.networkManager.getPeersCount();
  }

  getNetworkTopology() {
    return {
      nodeId: this.nodeId,
      connectedPeers: this.getPeers(),
      routingTable: Array.from(this.routingTable.entries()).map(([nodeId, route]) => ({
        nodeId,
        nextHop: route.nextHop,
        hopCount: route.hopCount,
        lastUpdate: route.lastUpdate
      })),
      totalNodes: this.routingTable.size + 1 // +1 for self
    };
  }

  async stop() {
    // Send goodbye message
    this.broadcast({
      type: 'peer-leaving',
      nodeId: this.nodeId,
      timestamp: Date.now()
    });

    await this.networkManager.stop();
    this.routingTable.clear();
    this.messageCache.clear();
  }
}

module.exports = P2PNetwork;
