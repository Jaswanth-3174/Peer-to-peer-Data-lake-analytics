const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const chalk = require('chalk');

class DataLake extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.dataPath = config.dataPath;
    this.metadataPath = config.metadataPath;
    this.datasets = new Map();
    this.chunks = new Map();
    
    this.initializeStorage();
  }

  async initializeStorage() {
    // Ensure directories exist
    await fs.ensureDir(this.dataPath);
    await fs.ensureDir(this.metadataPath);

    // Load existing datasets
    await this.loadExistingDatasets();
  }

  async loadExistingDatasets() {
    try {
      const metadataFiles = await fs.readdir(this.metadataPath);
      
      for (const file of metadataFiles) {
        if (file.endsWith('.meta.json')) {
          const metadataFile = path.join(this.metadataPath, file);
          const metadata = await fs.readJson(metadataFile);
          this.datasets.set(metadata.id, metadata);
        }
      }

      console.log(chalk.blue(`📚 Loaded ${this.datasets.size} existing datasets`));
    } catch (error) {
      console.error(chalk.red('Error loading existing datasets:'), error);
    }
  }

  async storeDataset(filename, data, metadata = {}) {
    const datasetId = uuidv4();
    const timestamp = Date.now();
    
    // Create dataset metadata
    const datasetMetadata = {
      id: datasetId,
      filename,
      originalSize: Buffer.byteLength(data),
      format: this.detectFormat(filename),
      timestamp,
      checksum: this.calculateChecksum(data),
      metadata: metadata || {},
      chunks: [],
      replicationFactor: this.config.replicationFactor || 3,
      status: 'active'
    };

    try {
      // Split data into chunks if large
      const chunks = await this.chunkData(data, datasetId);
      datasetMetadata.chunks = chunks.map(chunk => chunk.id);

      // Store chunks
      for (const chunk of chunks) {
        await this.storeChunk(chunk);
      }

      // Store metadata
      await this.storeMetadata(datasetMetadata);

      // Add to in-memory index
      this.datasets.set(datasetId, datasetMetadata);

      console.log(chalk.green(`💾 Stored dataset: ${filename} (${chunks.length} chunks)`));
      this.emit('dataset-added', datasetMetadata);

      return datasetId;
    } catch (error) {
      console.error(chalk.red('Error storing dataset:'), error);
      throw error;
    }
  }

  async chunkData(data, datasetId) {
    const chunks = [];
    const chunkSize = this.config.chunkSize || 1048576; // 1MB default
    const buffer = Buffer.from(data);

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunkData = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
      const chunkId = uuidv4();
      
      chunks.push({
        id: chunkId,
        datasetId,
        index: chunks.length,
        data: chunkData,
        size: chunkData.length,
        checksum: this.calculateChecksum(chunkData)
      });
    }

    return chunks;
  }

  async storeChunk(chunk) {
    const chunkPath = path.join(this.dataPath, `${chunk.id}.chunk`);
    await fs.writeFile(chunkPath, chunk.data);
    
    // Store chunk metadata
    const chunkMetadata = {
      id: chunk.id,
      datasetId: chunk.datasetId,
      index: chunk.index,
      size: chunk.size,
      checksum: chunk.checksum,
      path: chunkPath,
      timestamp: Date.now()
    };

    this.chunks.set(chunk.id, chunkMetadata);
    
    // Save chunk metadata to disk
    const metadataPath = path.join(this.metadataPath, `${chunk.id}.chunk.meta.json`);
    await fs.writeJson(metadataPath, chunkMetadata);
  }

  async storeMetadata(metadata) {
    const metadataPath = path.join(this.metadataPath, `${metadata.id}.meta.json`);
    await fs.writeJson(metadataPath, metadata);
  }

  async retrieveDataset(datasetId) {
    const metadata = this.datasets.get(datasetId);
    if (!metadata) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    try {
      // Retrieve all chunks
      const chunkData = [];
      
      for (const chunkId of metadata.chunks) {
        const chunk = await this.retrieveChunk(chunkId);
        chunkData.push({
          index: chunk.index,
          data: chunk.data
        });
      }

      // Sort chunks by index and concatenate
      chunkData.sort((a, b) => a.index - b.index);
      const completeData = Buffer.concat(chunkData.map(chunk => chunk.data));

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(completeData);
      if (calculatedChecksum !== metadata.checksum) {
        throw new Error('Data integrity check failed');
      }

      return {
        metadata,
        data: completeData
      };
    } catch (error) {
      console.error(chalk.red(`Error retrieving dataset ${datasetId}:`), error);
      throw error;
    }
  }

  async retrieveChunk(chunkId) {
    const chunkMetadata = this.chunks.get(chunkId);
    if (!chunkMetadata) {
      throw new Error(`Chunk not found: ${chunkId}`);
    }

    const data = await fs.readFile(chunkMetadata.path);
    
    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(data);
    if (calculatedChecksum !== chunkMetadata.checksum) {
      throw new Error(`Chunk integrity check failed: ${chunkId}`);
    }

    return {
      ...chunkMetadata,
      data
    };
  }

  async listDatasets() {
    return Array.from(this.datasets.values()).map(dataset => ({
      id: dataset.id,
      filename: dataset.filename,
      format: dataset.format,
      size: dataset.originalSize,
      timestamp: dataset.timestamp,
      chunks: dataset.chunks ? dataset.chunks.length : 0,
      status: dataset.status,
      metadata: dataset.metadata
    }));
  }

  async deleteDataset(datasetId) {
    const metadata = this.datasets.get(datasetId);
    if (!metadata) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    try {
      // Delete chunks
      for (const chunkId of metadata.chunks) {
        await this.deleteChunk(chunkId);
      }

      // Delete metadata
      const metadataPath = path.join(this.metadataPath, `${datasetId}.meta.json`);
      await fs.remove(metadataPath);

      // Remove from memory
      this.datasets.delete(datasetId);

      console.log(chalk.yellow(`🗑️ Deleted dataset: ${metadata.filename}`));
      this.emit('dataset-deleted', datasetId);

      return true;
    } catch (error) {
      console.error(chalk.red(`Error deleting dataset ${datasetId}:`), error);
      throw error;
    }
  }

  async deleteChunk(chunkId) {
    const chunkMetadata = this.chunks.get(chunkId);
    if (chunkMetadata) {
      // Delete chunk file
      await fs.remove(chunkMetadata.path);
      
      // Delete chunk metadata
      const metadataPath = path.join(this.metadataPath, `${chunkId}.chunk.meta.json`);
      await fs.remove(metadataPath);

      // Remove from memory
      this.chunks.delete(chunkId);
    }
  }

  async getDatasetInfo(datasetId) {
    const metadata = this.datasets.get(datasetId);
    if (!metadata) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    return metadata;
  }

  async searchDatasets(query) {
    const results = [];
    
    for (const dataset of this.datasets.values()) {
      // Search in filename and metadata
      const searchText = `${dataset.filename} ${JSON.stringify(dataset.metadata)}`.toLowerCase();
      
      if (searchText.includes(query.toLowerCase())) {
        results.push(dataset);
      }
    }

    return results;
  }

  async getStorageStats() {
    let totalSize = 0;
    let totalChunks = 0;

    for (const dataset of this.datasets.values()) {
      totalSize += dataset.originalSize || 0;
      totalChunks += (dataset.chunks && dataset.chunks.length) || 0;
    }

    return {
      totalDatasets: this.datasets.size,
      totalChunks,
      totalSize,
      formattedSize: this.formatBytes(totalSize)
    };
  }

  detectFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.csv':
        return 'csv';
      case '.json':
        return 'json';
      case '.parquet':
        return 'parquet';
      case '.txt':
        return 'text';
      case '.xml':
        return 'xml';
      default:
        return 'unknown';
    }
  }

  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Methods for data replication across peers
  async replicateDataset(datasetId, targetPeers) {
    // This would be implemented to send dataset chunks to other peers
    console.log(chalk.blue(`🔄 Replicating dataset ${datasetId} to ${targetPeers.length} peers`));
  }

  async syncWithPeer(peerId) {
    // This would be implemented to synchronize datasets with a specific peer
    console.log(chalk.blue(`🔄 Syncing with peer ${peerId}`));
  }
}

module.exports = DataLake;
