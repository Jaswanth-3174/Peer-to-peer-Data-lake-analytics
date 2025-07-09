# P2P Data Lake Analytics Framework - Quick Start Guide

## 🚀 System Status: READY TO USE!

Your Peer-to-Peer Data Lake Analytics Framework is now fully deployed and running!

### Current Setup:
- **Peer 1** (port 8011): Employee & Product data
- **Peer 2** (port 8012): Orders & Customer data  
- **Peer 3** (port 8013): Transactions & Reviews data
- **Frontend** (port 3000): React dashboard

### Access the System:
🌐 **Open your browser to:** http://localhost:3000

## ✅ What's Working:

### Backend Features:
- ✅ FastAPI servers running on each peer
- ✅ DuckDB SQL engine with CSV data loading
- ✅ Cross-peer query aggregation
- ✅ REST API endpoints for all operations
- ✅ Real-time health monitoring

### Frontend Features:
- ✅ Modern React dashboard with Tailwind CSS
- ✅ SQL query interface with sample queries
- ✅ Peer selection and status monitoring
- ✅ Results display in table and chart format
- ✅ Interactive data visualization with Recharts

## 🎯 Try These Sample Queries:

### 1. View All Employees
```sql
SELECT * FROM employees
```

### 2. Product Analysis by Category
```sql
SELECT category, COUNT(*) as count, AVG(price) as avg_price 
FROM products GROUP BY category
```

### 3. Customer Order Summary
```sql
SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue 
FROM orders
```

### 4. Payment Method Distribution
```sql
SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
FROM transactions GROUP BY payment_method
```

### 5. Review Ratings Analysis
```sql
SELECT rating, COUNT(*) as count 
FROM reviews GROUP BY rating ORDER BY rating
```

## 🔧 System Architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Peer 1:8011   │    │   Peer 2:8012   │    │   Peer 3:8013   │
│                 │    │                 │    │                 │
│ employees.csv   │    │ orders.csv      │    │ transactions.csv│
│ products.csv    │    │ customers.csv   │    │ reviews.csv     │
│                 │    │                 │    │                 │
│ FastAPI + DuckDB│    │ FastAPI + DuckDB│    │ FastAPI + DuckDB│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  React Frontend │
                    │    :3000        │
                    └─────────────────┘
```

## 🛠️ Manual Control:

### Start Individual Peers:
```bash
# Peer 1
cd backend && python main.py 8011

# Peer 2  
cd backend && set DATA_DIR=data_peer2 && python main.py 8012

# Peer 3
cd backend && set DATA_DIR=data_peer3 && python main.py 8013
```

### Start Frontend:
```bash
cd frontend && npm start
```

## 📊 Test APIs Directly:

### Health Check:
```bash
curl http://localhost:8011/health
```

### Get Tables:
```bash
curl http://localhost:8011/tables
```

### Execute Query:
```bash
curl -X POST http://localhost:8011/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) FROM employees"}'
```

## 🎉 Success Indicators:

- ✅ All 3 peers show "online" status in the dashboard
- ✅ Sample queries return data in both table and chart views
- ✅ Cross-peer queries aggregate results from multiple sources
- ✅ Real-time peer health monitoring works
- ✅ Interactive charts display numeric data

## 🚀 Next Steps:

1. **Add Your Own Data**: Upload CSV files via the frontend or API
2. **Create Custom Queries**: Use any valid SQL syntax
3. **Scale the Network**: Add more peers on different ports
4. **Extend Functionality**: Modify the code to add new features

---

**🎯 Your P2P Data Lake is now fully operational and ready for distributed analytics!**
