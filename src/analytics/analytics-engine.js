const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

// Mock DuckDB for now - in real implementation you'd use the actual DuckDB package
class MockDuckDB {
  constructor() {
    this.tables = new Map();
  }

  async createTable(name, data, schema = null) {
    // Parse CSV data into rows
    const rows = await this.parseCSV(data);
    this.tables.set(name, {
      schema: schema || this.inferSchema(rows[0]),
      data: rows
    });
    return rows.length;
  }

  async parseCSV(csvData) {
    return new Promise((resolve, reject) => {
      const rows = [];
      const stream = require('stream');
      
      const readable = new stream.Readable();
      readable.push(csvData);
      readable.push(null);

      readable
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  inferSchema(sampleRow) {
    const schema = {};
    for (const [key, value] of Object.entries(sampleRow)) {
      // Simple type inference
      if (!isNaN(value) && !isNaN(parseFloat(value))) {
        schema[key] = 'DOUBLE';
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        schema[key] = 'BOOLEAN';
      } else {
        schema[key] = 'VARCHAR';
      }
    }
    return schema;
  }

  async executeQuery(sql) {
    // Simple SQL parser for demo purposes
    // In real implementation, this would use actual DuckDB
    
    const query = sql.trim().toLowerCase();
    
    if (query.startsWith('select')) {
      return this.executeSelect(sql);
    } else if (query.startsWith('insert')) {
      return this.executeInsert(sql);
    } else if (query.startsWith('create')) {
      return this.executeCreate(sql);
    } else {
      throw new Error(`Unsupported query type: ${query}`);
    }
  }

  async executeSelect(sql) {
    // Very basic SELECT parser for demo
    const tableName = this.extractTableName(sql);
    const table = this.tables.get(tableName);
    
    if (!table) {
      throw new Error(`Table not found: ${tableName}`);
    }

    // For demo, just return all data
    // In real implementation, this would parse WHERE clauses, etc.
    return {
      rows: table.data,
      rowCount: table.data.length,
      columns: Object.keys(table.schema)
    };
  }

  extractTableName(sql) {
    const match = sql.match(/from\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  async executeInsert(sql) {
    // Mock implementation
    return { rowCount: 1 };
  }

  async executeCreate(sql) {
    // Mock implementation
    return { status: 'created' };
  }
}

class AnalyticsEngine extends EventEmitter {
  constructor(config, dataLake) {
    super();
    this.config = config;
    this.dataLake = dataLake;
    this.queryCache = new Map();
    this.activeQueries = new Map();
    this.db = new MockDuckDB(); // In real implementation: new DuckDB()
    
    this.initialize();
  }

  async initialize() {
    // Ensure temp directory exists
    await fs.ensureDir(this.config.tempPath);
    
    // Load existing datasets into analytics engine
    await this.loadDatasets();
    
    console.log(chalk.blue('📊 Analytics Engine initialized'));
  }

  async loadDatasets() {
    try {
      const datasets = await this.dataLake.listDatasets();
      
      for (const dataset of datasets) {
        if (dataset.format === 'csv') {
          await this.loadDatasetIntoEngine(dataset);
        }
      }
      
      console.log(chalk.green(`📈 Loaded ${datasets.length} datasets into analytics engine`));
    } catch (error) {
      console.error(chalk.red('Error loading datasets:'), error);
    }
  }

  async loadDatasetIntoEngine(dataset) {
    try {
      // Retrieve dataset from data lake
      const { data } = await this.dataLake.retrieveDataset(dataset.id);
      
      // Create table in analytics engine
      const tableName = this.sanitizeTableName(dataset.filename);
      await this.db.createTable(tableName, data.toString());
      
      console.log(chalk.cyan(`📋 Loaded table: ${tableName}`));
    } catch (error) {
      console.error(chalk.red(`Error loading dataset ${dataset.id}:`, error));
    }
  }

  sanitizeTableName(filename) {
    // Remove extension and sanitize for SQL
    const name = path.parse(filename).name;
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  async executeQuery(sql, params = {}) {
    const queryId = uuidv4();
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`🔍 Executing query ${queryId}: ${sql.substring(0, 100)}...`));
      
      // Check cache first
      const cacheKey = this.generateCacheKey(sql, params);
      if (this.queryCache.has(cacheKey)) {
        console.log(chalk.green(`⚡ Cache hit for query ${queryId}`));
        return this.queryCache.get(cacheKey);
      }

      // Add to active queries
      this.activeQueries.set(queryId, {
        sql,
        params,
        startTime,
        status: 'running'
      });

      // Execute query
      const result = await this.executeQueryInternal(sql, params);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Prepare response
      const response = {
        queryId,
        success: true,
        data: result.rows || result.data || [],
        rowCount: result.rowCount || result.data?.length || 0,
        columns: result.columns || [],
        executionTime,
        timestamp: Date.now(),
        cached: false
      };

      // Cache result if appropriate
      if (this.shouldCacheQuery(sql, executionTime)) {
        this.cacheQuery(cacheKey, response);
      }

      // Remove from active queries
      this.activeQueries.delete(queryId);

      console.log(chalk.green(`✅ Query ${queryId} completed in ${executionTime}ms`));
      this.emit('query-completed', response);

      return response;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Remove from active queries
      this.activeQueries.delete(queryId);

      console.error(chalk.red(`❌ Query ${queryId} failed:`, error));
      
      const errorResponse = {
        queryId,
        success: false,
        error: error.message,
        executionTime,
        timestamp: Date.now()
      };

      this.emit('query-failed', errorResponse);
      throw error;
    }
  }

  async executeQueryInternal(sql, params) {
    // Timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), this.config.maxQueryTime);
    });

    const queryPromise = this.db.executeQuery(sql, params);

    return Promise.race([queryPromise, timeoutPromise]);
  }

  generateCacheKey(sql, params) {
    return require('crypto')
      .createHash('md5')
      .update(sql + JSON.stringify(params))
      .digest('hex');
  }

  shouldCacheQuery(sql, executionTime) {
    // Cache SELECT queries that take more than 1 second
    return sql.trim().toLowerCase().startsWith('select') && executionTime > 1000;
  }

  cacheQuery(key, result) {
    // Simple LRU cache
    const maxCacheSize = 100;
    
    if (this.queryCache.size >= maxCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
    
    // Mark as cached
    const cachedResult = { ...result, cached: true };
    this.queryCache.set(key, cachedResult);
  }

  async getQueryStats() {
    return {
      activeQueries: this.activeQueries.size,
      cachedQueries: this.queryCache.size,
      totalTablesLoaded: this.db.tables.size,
      queries: Array.from(this.activeQueries.values())
    };
  }

  async getTableInfo(tableName) {
    const table = this.db.tables.get(tableName);
    if (!table) {
      throw new Error(`Table not found: ${tableName}`);
    }

    return {
      name: tableName,
      schema: table.schema,
      rowCount: table.data.length,
      columns: Object.keys(table.schema)
    };
  }

  async listTables() {
    return Array.from(this.db.tables.keys()).map(tableName => ({
      name: tableName,
      rowCount: this.db.tables.get(tableName).data.length
    }));
  }

  async explainQuery(sql) {
    // Mock query explanation
    return {
      query: sql,
      plan: [
        { operation: 'SCAN', table: this.extractTableFromQuery(sql) },
        { operation: 'FILTER', conditions: 'WHERE clauses' },
        { operation: 'PROJECT', columns: 'SELECT columns' }
      ],
      estimatedCost: Math.random() * 1000,
      estimatedRows: Math.floor(Math.random() * 10000)
    };
  }

  extractTableFromQuery(sql) {
    const match = sql.match(/from\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  async cancelQuery(queryId) {
    if (this.activeQueries.has(queryId)) {
      this.activeQueries.delete(queryId);
      console.log(chalk.yellow(`🛑 Cancelled query ${queryId}`));
      return true;
    }
    return false;
  }

  clearCache() {
    this.queryCache.clear();
    console.log(chalk.blue('🧹 Query cache cleared'));
  }

  // Distributed query methods
  async executeDistributedQuery(sql, targetPeers = []) {
    console.log(chalk.blue(`🌐 Executing distributed query across ${targetPeers.length} peers`));
    
    // This would coordinate query execution across multiple peers
    // For now, just execute locally
    return this.executeQuery(sql);
  }

  async aggregateResults(partialResults) {
    // This would combine results from multiple peers
    console.log(chalk.blue(`🔄 Aggregating results from ${partialResults.length} peers`));
    
    // Simple aggregation logic
    const combinedData = [];
    let totalRows = 0;
    
    for (const result of partialResults) {
      if (result.success && result.data) {
        combinedData.push(...result.data);
        totalRows += result.rowCount;
      }
    }

    return {
      success: true,
      data: combinedData,
      rowCount: totalRows,
      distributed: true,
      peersQueried: partialResults.length
    };
  }
}

module.exports = AnalyticsEngine;
