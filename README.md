# A Peer-to-Peer Data Lake Analytics Framework

A fully decentralized analytics framework that runs entirely locally without cloud dependencies. Built with React.js, Tailwind CSS, Recharts for the frontend and Python FastAPI with DuckDB for the backend.

## Features

- **Decentralized Architecture**: Each peer runs independently on different ports
- **Local Data Storage**: CSV datasets stored locally on each peer  
- **SQL Query Engine**: DuckDB for high-performance SQL analytics
- **Cross Peer Queries**: Query multiple peers simultaneously and aggregate results
- **Modern React Dashboard**: Beautiful UI with Tailwind CSS
- **Interactive Data Visualization**: Charts and tables using Recharts
- **REST API**: FastAPI backend for each peer with full CORS support
- **Real-time Peer Status**: Monitor peer connectivity and health
- **Sample Queries**: Pre-built queries to get started quickly

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Peer 1:8001   │    │   Peer 2:8002   │    │   Peer 3:8003   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  FastAPI    │ │    │ │  FastAPI    │ │    │ │  FastAPI    │ │
│ │  Backend    │ │    │ │  Backend    │ │    │ │  Backend    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   DuckDB    │ │    │ │   DuckDB    │ │    │ │   DuckDB    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ CSV Dataset │ │    │ │ CSV Dataset │ │    │ │ CSV Dataset │ │
│ │ employees   │ │    │ │ orders      │ │    │ │ transactions│ │
│ │ products    │ │    │ │ customers   │ │    │ │ reviews     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  React Frontend │
                    │    :3000        │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Query Input │ │
                    │ │ Multi-Peer  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ Peer Select │ │
                    │ │ Health Mon. │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Results   │ │
                    │ │ Table/Chart │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Option 1: Automatic Setup (Recommended)

**Windows:**
```bash
setup.bat
start_all.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh start_all.sh
./setup.sh
./start_all.sh
```

### Option 2: Manual Setup

1. **Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Frontend Setup:**
```bash
cd frontend
npm install
```

3. **Start the Peers (separate terminals):**
```bash
# Terminal 1 - Peer 1 (Employee & Product data)
cd backend
python main.py 8001

# Terminal 2 - Peer 2 (Orders & Customer data)  
cd backend
python main.py 8002

# Terminal 3 - Peer 3 (Transactions & Reviews data)
cd backend
python main.py 8003
```

4. **Start Frontend:**
```bash
cd frontend
npm start
```

5. **Access the Application:**
Open http://localhost:3000 in your browser

## Sample Data

The framework comes with realistic sample datasets:

### Peer 1 (Port 8001)
- **employees.csv**: Employee information (id, name, age, city, salary)
- **products.csv**: Product catalog (product_id, name, category, price, stock)

### Peer 2 (Port 8002)  
- **orders.csv**: Order transactions (order_id, customer_id, product_id, quantity, date, amount)
- **customers.csv**: Customer details (customer_id, name, email, city, registration_date)

### Peer 3 (Port 8003)
- **transactions.csv**: Payment transactions (transaction_id, order_id, payment_method, amount, status)
- **reviews.csv**: Product reviews (review_id, product_id, customer_id, rating, review_text)

## Sample Queries

Try these queries to explore the distributed data:

### Single Table Queries
```sql
-- Get all employees
SELECT * FROM employees

-- Product categories and average prices
SELECT category, COUNT(*) as count, AVG(price) as avg_price 
FROM products GROUP BY category

-- Customer reviews by rating
SELECT rating, COUNT(*) as count 
FROM reviews GROUP BY rating ORDER BY rating
```

### Cross-Peer Analytics
```sql
-- Order summary across all peers
SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue 
FROM orders

-- Average salary by city
SELECT city, AVG(salary) as avg_salary 
FROM employees GROUP BY city ORDER BY avg_salary DESC

-- Payment method distribution
SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
FROM transactions GROUP BY payment_method
```

## API Documentation

### Peer Endpoints

Each peer exposes the following REST API endpoints:

#### Health & Info
- `GET /` - Basic peer information
- `GET /health` - Health check
- `GET /info` - Detailed peer information including tables

#### Data Operations  
- `GET /tables` - List available tables
- `GET /tables/{table_name}/schema` - Get table schema
- `POST /query` - Execute SQL query on this peer
- `POST /query/multi-peer` - Execute query across multiple peers
- `POST /upload` - Upload CSV file to peer

#### Example API Usage

```bash
# Check peer health
curl http://localhost:8001/health

# Get available tables
curl http://localhost:8001/tables

# Execute query on single peer
curl -X POST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM employees LIMIT 5"}'

# Execute multi-peer query
curl -X POST http://localhost:8001/query/multi-peer \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT COUNT(*) as count FROM orders", 
    "peers": ["http://localhost:8001", "http://localhost:8002"]
  }'
```

## Project Structure

```
P2P_DataLake/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── data_engine.py       # DuckDB query engine
│   ├── requirements.txt     # Python dependencies
│   ├── data/               # Peer 1 datasets
│   ├── peer2_data/         # Peer 2 datasets  
│   ├── peer3_data/         # Peer 3 datasets
│   └── start_peer*.bat     # Individual peer startup scripts
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── components/
│   │   │   ├── Header.js          # Application header
│   │   │   ├── PeerManager.js     # Peer selection & status
│   │   │   ├── QueryInterface.js  # SQL query input
│   │   │   └── ResultsDisplay.js  # Results table & charts
│   │   └── index.js        # React entry point
│   ├── package.json        # Node.js dependencies
│   └── tailwind.config.js  # Tailwind CSS configuration
├── setup.bat/.sh          # Automated setup scripts
├── start_all.bat/.sh      # Start all services
└── README.md              # This file
```

## Features Deep Dive

### 🔗 Decentralized Architecture
- No central coordinator required
- Each peer operates independently
- Fault-tolerant: system works even if some peers are offline
- Horizontal scaling: add more peers easily

### 📊 Query Engine
- **DuckDB**: Fast analytical database engine
- **SQL Support**: Full SQL query capabilities
- **Cross-Peer Queries**: Automatic result aggregation
- **Error Handling**: Graceful handling of peer failures

### 🎨 Modern Frontend
- **React 18**: Latest React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Responsive chart library
- **Real-time Updates**: Live peer status monitoring

### 🚀 Performance
- **In-Memory Processing**: DuckDB's columnar engine
- **Parallel Queries**: Simultaneous peer querying  
- **Efficient Aggregation**: Smart result merging
- **Minimal Overhead**: Lightweight REST communication

## Extending the Framework

### Adding New Peers
1. Create data directory with CSV files
2. Start peer on new port: `python main.py 8004`
3. Add peer URL to frontend peer list

### Adding New Data
- **Via Upload**: Use the frontend upload feature
- **Manually**: Add CSV files to peer's data directory
- **API**: Use the `/upload` endpoint

### Custom Queries
The system supports any valid SQL query that DuckDB can execute:
- JOINs across tables (within same peer)
- Aggregations (SUM, COUNT, AVG, etc.)
- Filtering (WHERE clauses)
- Sorting (ORDER BY)
- Grouping (GROUP BY)

## Troubleshooting

### Common Issues

**Peer Connection Failed:**
- Check if peer is running on expected port
- Verify firewall settings
- Ensure CORS is properly configured

**Query Errors:**
- Verify table names exist on target peers
- Check SQL syntax
- Ensure data types are compatible

**Frontend Not Loading:**
- Check if Node.js dependencies are installed
- Verify port 3000 is not in use
- Check browser console for errors

### Logs
- **Backend**: Check terminal output where peers are running
- **Frontend**: Check browser developer console
- **Network**: Use browser network tab to debug API calls

## Contributing

This is an educational project demonstrating P2P data analytics concepts. Feel free to:

1. Add new data sources
2. Implement additional visualizations  
3. Extend the query interface
4. Add more peers
5. Improve error handling

## License

This project is for educational purposes. Feel free to use and modify as needed.

---

**Built with ❤️ using React, FastAPI, DuckDB, and Tailwind CSS**

## Quick Start

### 1. Setup Backend (Each Peer)

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start Peer 1
python peer.py --port 8001 --name "Sales Data"

# Start Peer 2 (in new terminal)
python peer.py --port 8002 --name "Marketing Data"

# Start Peer 3 (in new terminal)
python peer.py --port 8003 --name "Finance Data"
```

### 2. Setup Frontend

```bash
# Install dependencies
cd frontend
npm install

# Start React app
npm start
```

### 3. Access the Dashboard

Open http://localhost:3000 in your browser.

## Usage

1. **Query Single Peer**: Select one peer and run SQL queries on its dataset
2. **Cross-Peer Queries**: Select multiple peers to run federated queries
3. **Visualize Results**: View results in both table and chart formats
4. **Real-time Analytics**: Get instant results from the decentralized network

## Sample Queries

```sql
-- Query sales data
SELECT region, SUM(revenue) as total_revenue 
FROM sales 
GROUP BY region 
ORDER BY total_revenue DESC;

-- Cross-peer analytics
SELECT * FROM marketing m 
JOIN sales s ON m.customer_id = s.customer_id;
```

## Technologies Used

- **Backend**: Python, FastAPI, DuckDB, Pandas
- **Frontend**: React.js, Tailwind CSS, Recharts
- **Data**: CSV files, SQL queries
- **Communication**: REST APIs, HTTP requests
