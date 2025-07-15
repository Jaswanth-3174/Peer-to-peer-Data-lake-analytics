const EventEmitter = require('events');

class SimpleAnalyticsEngine extends EventEmitter {
    constructor() {
        super();
        this.datasets = new Map();
    }

    async loadDataset(name, data, metadata = {}) {
        console.log(`Loading dataset: ${name} with ${data.length} rows`);
        this.datasets.set(name, {
            data,
            metadata: {
                ...metadata,
                rowCount: data.length,
                columns: data.length > 0 ? Object.keys(data[0]) : [],
                loadedAt: new Date().toISOString()
            }
        });
        return true;
    }

    async executeQuery(sql) {
        try {
            console.log(`Executing query: ${sql}`);
            
            // Simple SQL parser for basic operations
            const result = this.parseAndExecuteSQL(sql);
            
            return {
                success: true,
                data: result.data,
                rowCount: result.data.length,
                executionTime: result.executionTime,
                query: sql
            };
        } catch (error) {
            console.error('Query execution failed:', error);
            return {
                success: false,
                error: error.message,
                query: sql
            };
        }
    }

    parseAndExecuteSQL(sql) {
        const startTime = Date.now();
        
        // Ensure sql is a string and convert to lowercase for parsing
        const sqlString = String(sql || '').trim();
        if (!sqlString) {
            throw new Error('Empty query provided');
        }
        
        const sqlLower = sqlString.toLowerCase();
        
        if (sqlLower.startsWith('select')) {
            return this.executeSelect(sqlString);
        } else if (sqlLower.startsWith('show tables')) {
            return this.showTables();
        } else if (sqlLower.startsWith('describe') || sqlLower.startsWith('desc')) {
            return this.describeTable(sqlString);
        } else {
            throw new Error(`Unsupported query type: ${sqlString}`);
        }
    }

    executeSelect(sql) {
        const startTime = Date.now();
        
        // Basic SELECT parser
        const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(\s+WHERE\s+(.+?))?(\s+GROUP\s+BY\s+(.+?))?(\s+ORDER\s+BY\s+(.+?))?(\s+LIMIT\s+(\d+))?/i);
        
        if (!selectMatch) {
            throw new Error('Invalid SELECT syntax');
        }

        const [, selectClause, tableName, , whereClause, , groupByClause, , orderByClause, , limitClause] = selectMatch;
        
        // Get dataset
        const dataset = this.datasets.get(tableName);
        if (!dataset) {
            throw new Error(`Table '${tableName}' not found`);
        }

        let data = [...dataset.data];

        // Apply WHERE clause
        if (whereClause) {
            data = this.applyWhere(data, whereClause);
        }

        // Apply GROUP BY
        if (groupByClause) {
            data = this.applyGroupBy(data, groupByClause, selectClause);
        } else {
            // Apply SELECT clause
            data = this.applySelect(data, selectClause);
        }

        // Apply ORDER BY
        if (orderByClause) {
            data = this.applyOrderBy(data, orderByClause);
        }

        // Apply LIMIT
        if (limitClause) {
            data = data.slice(0, parseInt(limitClause));
        }

        return {
            data,
            executionTime: Date.now() - startTime
        };
    }

    applySelect(data, selectClause) {
        const columns = selectClause.trim();
        
        if (columns === '*') {
            return data;
        }

        const selectedColumns = columns.split(',').map(col => col.trim());
        
        return data.map(row => {
            const newRow = {};
            selectedColumns.forEach(col => {
                if (row.hasOwnProperty(col)) {
                    newRow[col] = row[col];
                }
            });
            return newRow;
        });
    }

    applyWhere(data, whereClause) {
        // Simple WHERE parser for basic conditions
        return data.filter(row => {
            // Handle simple conditions like: age > 30, name = 'John', salary >= 50000
            const conditions = whereClause.split(/\s+AND\s+/i);
            
            return conditions.every(condition => {
                const match = condition.trim().match(/(\w+)\s*(>=|<=|>|<|=|!=)\s*(.+)/);
                if (!match) return true;
                
                const [, column, operator, value] = match;
                const rowValue = row[column];
                let compareValue = value.replace(/['"]/g, '');
                
                // Try to convert to number if possible
                if (!isNaN(compareValue)) {
                    compareValue = parseFloat(compareValue);
                }
                
                switch (operator) {
                    case '=': return rowValue == compareValue;
                    case '!=': return rowValue != compareValue;
                    case '>': return parseFloat(rowValue) > parseFloat(compareValue);
                    case '<': return parseFloat(rowValue) < parseFloat(compareValue);
                    case '>=': return parseFloat(rowValue) >= parseFloat(compareValue);
                    case '<=': return parseFloat(rowValue) <= parseFloat(compareValue);
                    default: return true;
                }
            });
        });
    }

    applyGroupBy(data, groupByClause, selectClause) {
        const groupColumns = groupByClause.split(',').map(col => col.trim());
        const grouped = new Map();

        // Group data
        data.forEach(row => {
            const key = groupColumns.map(col => row[col]).join('|');
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(row);
        });

        // Apply aggregations
        const result = [];
        grouped.forEach((rows, key) => {
            const groupRow = {};
            
            // Add group columns
            groupColumns.forEach((col, index) => {
                groupRow[col] = key.split('|')[index];
            });

            // Parse SELECT clause for aggregations
            const selectParts = selectClause.split(',').map(part => part.trim());
            selectParts.forEach(part => {
                if (part.includes('COUNT(')) {
                    const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : 'count';
                    groupRow[alias] = rows.length;
                } else if (part.includes('AVG(')) {
                    const column = part.match(/AVG\((\w+)\)/i)[1];
                    const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : `avg_${column}`;
                    const sum = rows.reduce((acc, row) => acc + parseFloat(row[column] || 0), 0);
                    groupRow[alias] = sum / rows.length;
                } else if (part.includes('SUM(')) {
                    const column = part.match(/SUM\((\w+)\)/i)[1];
                    const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : `sum_${column}`;
                    groupRow[alias] = rows.reduce((acc, row) => acc + parseFloat(row[column] || 0), 0);
                } else if (!groupColumns.includes(part)) {
                    // Regular column from group
                    if (rows[0] && rows[0][part] !== undefined) {
                        groupRow[part] = rows[0][part];
                    }
                }
            });

            result.push(groupRow);
        });

        return result;
    }

    applyOrderBy(data, orderByClause) {
        const orderParts = orderByClause.split(',').map(part => part.trim());
        
        return data.sort((a, b) => {
            for (const part of orderParts) {
                const [column, direction = 'ASC'] = part.split(/\s+/);
                const aVal = a[column];
                const bVal = b[column];
                
                let comparison = 0;
                if (aVal < bVal) comparison = -1;
                if (aVal > bVal) comparison = 1;
                
                if (direction.toUpperCase() === 'DESC') {
                    comparison *= -1;
                }
                
                if (comparison !== 0) {
                    return comparison;
                }
            }
            return 0;
        });
    }

    showTables() {
        const tables = Array.from(this.datasets.keys()).map(name => ({
            table_name: name,
            row_count: this.datasets.get(name).metadata.rowCount
        }));

        return {
            data: tables,
            executionTime: 1
        };
    }

    describeTable(sql) {
        const match = sql.match(/DESCRIBE\s+(\w+)/i) || sql.match(/DESC\s+(\w+)/i);
        if (!match) {
            throw new Error('Invalid DESCRIBE syntax');
        }

        const tableName = match[1];
        const dataset = this.datasets.get(tableName);
        
        if (!dataset) {
            throw new Error(`Table '${tableName}' not found`);
        }

        const columns = dataset.metadata.columns.map(col => ({
            column_name: col,
            data_type: 'TEXT'
        }));

        return {
            data: columns,
            executionTime: 1
        };
    }

    getDatasets() {
        const datasets = [];
        for (const [name, dataset] of this.datasets) {
            datasets.push({
                name: name,
                rowCount: dataset.metadata.rowCount,
                columns: dataset.metadata.columns,
                loadedAt: dataset.metadata.loadedAt
            });
        }
        return datasets;
    }

    removeDataset(name) {
        return this.datasets.delete(name);
    }
}

module.exports = SimpleAnalyticsEngine;
