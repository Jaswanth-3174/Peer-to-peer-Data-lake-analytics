const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

const P2PNetwork = require('./network/p2p-network-simple');
const DataLake = require('./storage/data-lake');
const AnalyticsEngine = require('./analytics/simple-analytics-engine');
const NetworkManager = require('./network/network-manager');
const config = require('../config.json');

class P2PDataLakeApp {
  constructor(port = config.network.defaultPort, bootstrapNode = null) {
    this.port = port;
    this.bootstrapNode = bootstrapNode;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: config.security.allowedOrigins,
        methods: ["GET", "POST"]
      }
    });

    this.setupDirectories();
    this.initializeComponents();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupDirectories() {
    const dirs = [
      config.storage.dataPath,
      config.storage.metadataPath,
      config.analytics.tempPath,
      config.logging.logPath,
      config.security.keyPath
    ];

    dirs.forEach(dir => {
      fs.ensureDirSync(dir);
    });
  }

  initializeComponents() {
    const { v4: uuidv4 } = require('uuid');
    this.nodeId = uuidv4();
    this.networkManager = new NetworkManager(this.port);
    
    // Extract port from bootstrap node if provided
    let bootstrapPort = null;
    if (this.bootstrapNode) {
      bootstrapPort = this.bootstrapNode.split(':')[1] || this.bootstrapNode;
    }
    
    this.p2pNetwork = new P2PNetwork(this.nodeId, this.port, bootstrapPort);
    this.dataLake = new DataLake(config.storage);
    this.analyticsEngine = new AnalyticsEngine();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    const apiRouter = express.Router();

    // Health check
    apiRouter.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        nodeId: this.nodeId,
        peersCount: this.p2pNetwork.getPeersCount(),
        uptime: process.uptime()
      });
    });

    // Network status
    apiRouter.get('/status', async (req, res) => {
      try {
        const status = await this.getNetworkStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Data upload
    apiRouter.post('/upload', async (req, res) => {
      try {
        const result = await this.handleDataUpload(req);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Query data
    apiRouter.post('/query', async (req, res) => {
      try {
        console.log('Received query request:', req.body);
        const { sql, query } = req.body;
        const queryToExecute = sql || query;
        
        if (!queryToExecute) {
          return res.status(400).json({ 
            success: false, 
            error: 'No query provided' 
          });
        }
        
        const result = await this.analyticsEngine.executeQuery(queryToExecute);
        console.log('Query result:', result);
        
        if (result.success) {
          res.json({
            success: true,
            data: result.data,
            rowCount: result.rowCount || (result.data ? result.data.length : 0),
            executionTime: result.executionTime
          });
        } else {
          res.json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error('Query execution error:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // List datasets
    apiRouter.get('/datasets', async (req, res) => {
      try {
        console.log('Getting datasets...');
        const dataLakeDatasets = await this.dataLake.listDatasets();
        const analyticsDatasets = this.analyticsEngine.getDatasets();
        
        // Combine datasets from both sources
        const combinedDatasets = analyticsDatasets.map(dataset => ({
          name: dataset.name,
          rowCount: dataset.rowCount || 0,
          columnCount: dataset.columns ? dataset.columns.length : 0,
          createdAt: dataset.loadedAt || new Date().toISOString()
        }));
        
        console.log('Combined datasets:', combinedDatasets);
        res.json({ 
          success: true,
          datasets: combinedDatasets 
        });
      } catch (error) {
        console.error('Error getting datasets:', error);
        res.status(500).json({ 
          success: false,
          error: error.message 
        });
      }
    });

    // Get peers
    apiRouter.get('/peers', (req, res) => {
      try {
        const peers = this.p2pNetwork.getPeers();
        console.log('Getting peers:', peers);
        res.json({ 
          success: true,
          peers: peers || []
        });
      } catch (error) {
        console.error('Error getting peers:', error);
        res.status(500).json({ 
          success: false,
          error: error.message,
          peers: []
        });
      }
    });

    this.app.use('/api', apiRouter);

    // Serve main dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(chalk.green(`Client connected: ${socket.id}`));

      socket.on('join-analytics', () => {
        socket.join('analytics');
        socket.emit('network-status', this.getNetworkStatus());
      });

      // P2P Network handlers
      socket.on('join-network', (data) => {
        console.log(chalk.blue(`P2P node joining: ${data.nodeId} on port ${data.port}`));
        socket.join('p2p-network');
        socket.nodeId = data.nodeId;
        socket.port = data.port;
        
        // Add peer to network (without socket to avoid circular reference)
        this.p2pNetwork.addPeer({
          nodeId: data.nodeId,
          port: data.port,
          lastSeen: Date.now(),
          status: 'connected'
        });

        // Send current peer list (only nodeId and port)
        const peers = this.p2pNetwork.getPeers().map(p => ({
          nodeId: p.nodeId,
          port: p.port
        }));
        socket.emit('peer-list', peers);

        // Notify other peers about new peer
        socket.to('p2p-network').emit('new-peer', {
          nodeId: data.nodeId,
          port: data.port
        });
      });

      socket.on('execute-query', async (data) => {
        try {
          const result = await this.analyticsEngine.executeQuery(data.sql, data.params);
          socket.emit('query-result', { id: data.id, result });
        } catch (error) {
          socket.emit('query-error', { id: data.id, error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log(chalk.yellow(`Client disconnected: ${socket.id}`));
        
        // Remove from P2P network if it was a peer
        if (socket.nodeId) {
          this.p2pNetwork.removePeer(socket.nodeId);
          socket.to('p2p-network').emit('peer-disconnected', socket.nodeId);
        }
      });
    });

    // Broadcast network updates
    this.p2pNetwork.on('peer-connected', (peer) => {
      this.io.to('analytics').emit('peer-connected', peer);
    });

    this.p2pNetwork.on('peer-disconnected', (peer) => {
      this.io.to('analytics').emit('peer-disconnected', peer);
    });

    this.dataLake.on('dataset-added', (dataset) => {
      this.io.to('analytics').emit('dataset-added', dataset);
    });
  }

  async getNetworkStatus() {
    const peers = this.p2pNetwork.getPeers();
    const datasets = await this.dataLake.listDatasets();
    
    return {
      nodeId: this.p2pNetwork.nodeId,
      port: this.port,
      peersCount: peers.length,
      peers: peers,
      datasetsCount: datasets.length,
      datasets: datasets,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      storageUsage: await this.dataLake.getStorageStats()
    };
  }

  async handleDataUpload(req) {
    const { filename, data, metadata } = req.body;
    
    if (!filename || !data) {
      throw new Error('Filename and data are required');
    }

    // Store data in data lake
    const datasetId = await this.dataLake.storeDataset(filename, data, metadata);
    
    // Load data into analytics engine
    try {
      const csvData = await this.parseCSVData(data);
      const tableName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
      await this.analyticsEngine.loadDataset(tableName, csvData, metadata);
      console.log(chalk.green(`📊 Loaded dataset ${tableName} into analytics engine`));
    } catch (error) {
      console.error(chalk.red('Error loading data into analytics engine:'), error);
    }
    
    // Announce to network
    this.p2pNetwork.announceDataset({
      id: datasetId,
      filename,
      metadata,
      nodeId: this.nodeId
    });

    return {
      datasetId,
      message: 'Data uploaded successfully',
      replicationStatus: 'pending'
    };
  }

  async parseCSVData(csvText) {
    return new Promise((resolve, reject) => {
      const csv = require('csv-parser');
      const { Readable } = require('stream');
      const results = [];
      
      const stream = Readable.from([csvText]);
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async loadExistingDatasets() {
    try {
      console.log(chalk.blue('📚 Loading existing datasets into analytics engine...'));
      const datasets = await this.dataLake.listDatasets();
      let loadedCount = 0;

      for (const dataset of datasets) {
        if (dataset.filename && dataset.format === 'csv') {
          try {
            // Read the actual data from the file
            const fs = require('fs-extra');
            const dataPath = path.join(config.storage.dataPath, `${dataset.id}.chunk`);
            
            if (await fs.pathExists(dataPath)) {
              const csvData = await fs.readFile(dataPath, 'utf8');
              const parsedData = await this.parseCSVData(csvData);
              const tableName = dataset.filename.replace(/\.[^/.]+$/, ""); // Remove extension
              
              await this.analyticsEngine.loadDataset(tableName, parsedData, dataset.metadata);
              loadedCount++;
              console.log(chalk.green(`✅ Loaded ${tableName} (${parsedData.length} rows)`));
            }
          } catch (error) {
            console.error(chalk.red(`❌ Failed to load ${dataset.filename}:`), error);
          }
        }
      }
      
      console.log(chalk.green(`📊 Loaded ${loadedCount} datasets into analytics engine`));
    } catch (error) {
      console.error(chalk.red('Error loading existing datasets:'), error);
    }
  }

  async start() {
    try {
      // Initialize P2P network
      await this.p2pNetwork.start();
      
      // Load existing datasets into analytics engine
      await this.loadExistingDatasets();
      
      // Start HTTP server
      this.server.listen(this.port, () => {
        console.log(chalk.blue('╔══════════════════════════════════════╗'));
        console.log(chalk.blue('║      P2P Data Lake Analytics         ║'));
        console.log(chalk.blue('╚══════════════════════════════════════╝'));
        console.log(chalk.green(`🚀 Server running on port ${this.port}`));
        console.log(chalk.green(`📊 Dashboard: http://localhost:${this.port}`));
        console.log(chalk.green(`🔗 Node ID: ${this.nodeId.substring(0, 8)}...`));
        console.log(chalk.yellow('───────────────────────────────────────'));
      });

      // Setup graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      console.error(chalk.red('Failed to start application:'), error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log(chalk.yellow('\n🔄 Shutting down gracefully...'));
    
    try {
      await this.p2pNetwork.stop();
      this.server.close();
      console.log(chalk.green('✅ Shutdown complete'));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error during shutdown:'), error);
      process.exit(1);
    }
  }
}

module.exports = P2PDataLakeApp;

// If this file is run directly
if (require.main === module) {
  const { Command } = require('commander');
  const program = new Command();

  program
    .option('-p, --port <number>', 'Port to run on', config.network.defaultPort)
    .parse();

  const options = program.opts();
  const app = new P2PDataLakeApp(parseInt(options.port));
  app.start();
}
