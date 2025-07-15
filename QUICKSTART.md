# P2P Data Lake Analytics - Quick Start Guide

## Installation & Setup

1. **Install Dependencies**
   ```bash
   cd d:\P2P
   npm install
   ```

2. **Start Single Node (Development)**
   ```bash
   npm start
   ```
   Open http://localhost:3000

3. **Start Full Network (3 nodes)**
   ```bash
   npm run network
   ```

## Usage Examples

### 1. Upload Data via Web Interface
- Open http://localhost:3000
- Go to the "Available Datasets" section
- Click "Upload File" and select a CSV file

### 2. Upload Data via API
```bash
curl -X POST -F "file=@sample-data/employees.csv" http://localhost:3000/api/upload
```

### 3. Query Data via Web Interface
Open the dashboard and try these sample queries:
```sql
SELECT * FROM employees LIMIT 10
SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department
SELECT * FROM employees WHERE age > 30 ORDER BY salary DESC
```

### 4. Query Data via API
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM employees WHERE salary > 80000"}'
```

### 5. Get Network Status
```bash
curl http://localhost:3000/api/status
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    P2P Data Lake Network                    │
├─────────────────────────────────────────────────────────────┤
│  Bootstrap Node (3000)    Peer 1 (3001)    Peer 2 (3002)  │
│  ┌─────────────────┐     ┌─────────────────┐  ┌─────────────────┐ │
│  │ Data Lake       │     │ Data Lake       │  │ Data Lake       │ │
│  │ Analytics Engine│     │ Analytics Engine│  │ Analytics Engine│ │
│  │ P2P Network     │◄────┤ P2P Network     │──┤ P2P Network     │ │
│  │ Web Dashboard   │     │ API Only        │  │ API Only        │ │
│  └─────────────────┘     └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

✅ **Distributed Storage**: Data automatically distributed across peers
✅ **Real-time Analytics**: SQL queries across the network
✅ **Auto-discovery**: Peers find each other automatically
✅ **Web Dashboard**: Beautiful UI for monitoring and querying
✅ **RESTful API**: Programmatic access to all features
✅ **Data Integrity**: Checksums and verification
✅ **Multiple Formats**: CSV, JSON, text files
✅ **Query Caching**: Improved performance for repeated queries

## Sample Queries

Once you upload the sample data, try these queries:

```sql
-- Basic selection
SELECT * FROM employees LIMIT 5;

-- Aggregation
SELECT department, COUNT(*) as employee_count, AVG(salary) as avg_salary 
FROM employees 
GROUP BY department;

-- Filtering and sorting
SELECT name, age, salary 
FROM employees 
WHERE age > 30 AND salary > 75000 
ORDER BY salary DESC;

-- Join (if you have multiple datasets)
SELECT e.name, e.department, p.product_name 
FROM employees e, products p 
WHERE e.department = 'Engineering' AND p.category = 'Electronics';
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Peer Connection Issues
- Ensure all nodes are running
- Check Windows Firewall settings
- Verify ports 3000-3002 are available

### Data Upload Issues
- Ensure file is valid CSV format
- Check file size (default limit: 50MB)
- Verify network connectivity

## Development

### Start Individual Components
```bash
# Bootstrap node only
node src/app.js --port 3000

# Additional peer
node src/peer.js --port 3001

# Upload sample data
node scripts/upload-sample-data.js
```

### File Structure
```
src/
├── app.js                  # Main application
├── peer.js                 # Peer node launcher
├── network/
│   ├── network-manager.js  # WebSocket management
│   └── p2p-network.js      # P2P protocol
├── storage/
│   └── data-lake.js        # Distributed storage
└── analytics/
    └── analytics-engine.js # Query processing

public/
└── index.html              # Web dashboard

scripts/
├── start-network.js        # Launch full network
└── upload-sample-data.js   # Load test data
```

## Next Steps

1. **Scale Up**: Add more peer nodes
2. **Enhance Security**: Implement encryption and authentication
3. **Advanced Analytics**: Add machine learning capabilities
4. **Data Governance**: Implement access controls and auditing
5. **Production Deploy**: Container orchestration and monitoring
