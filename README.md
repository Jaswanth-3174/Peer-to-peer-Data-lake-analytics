# P2P Data Lake Analytics

A distributed peer-to-peer data lake analytics system that allows multiple nodes to share, store, and analyze data collaboratively.

## Features

- **Distributed Data Storage**: Data is distributed across multiple peer nodes
- **Real-time Analytics**: Query and analyze data across the network
- **Auto-discovery**: Peers automatically discover each other
- **Web Dashboard**: Monitor network status and run queries
- **Data Synchronization**: Automatic data replication and consistency
- **Multiple Data Formats**: Support for CSV, JSON, Parquet files
- **SQL-like Queries**: Use familiar SQL syntax for data analysis

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Bootstrap Node (First peer)
```bash
npm run start
```

### 3. Start Additional Peers
```bash
npm run peer -- --port 3001
npm run peer -- --port 3002
```

### 4. Access Web Dashboard
Open http://localhost:3000 in your browser

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Peer Node 1   │    │   Peer Node 2   │    │   Peer Node 3   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Data Store  │ │    │ │ Data Store  │ │    │ │ Data Store  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Analytics Eng│ │    │ │Analytics Eng│ │    │ │Analytics Eng│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ P2P Network │ │◄──►│ │ P2P Network │ │◄──►│ │ P2P Network │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Usage Examples

### Upload Data
```bash
curl -X POST -F "file=@data.csv" http://localhost:3000/api/upload
```

### Query Data
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM datasets WHERE age > 25"}'
```

### Get Network Status
```bash
curl http://localhost:3000/api/status
```

## Configuration

Edit `config.json` to customize:
- Network settings
- Storage locations
- Analytics options
- Security settings

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
