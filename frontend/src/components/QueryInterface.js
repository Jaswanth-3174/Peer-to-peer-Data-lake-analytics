import React, { useState } from 'react';

const QueryInterface = ({ onExecuteQuery, loading }) => {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);

  const sampleQueries = [
    {
      name: "All Employees",
      query: "SELECT * FROM employees"
    },
    {
      name: "Product Categories",
      query: "SELECT category, COUNT(*) as count, AVG(price) as avg_price FROM products GROUP BY category"
    },
    {
      name: "Order Summary",
      query: "SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders"
    },
    {
      name: "Customer Reviews",
      query: "SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating"
    },
    {
      name: "Top Cities by Salary",
      query: "SELECT city, AVG(salary) as avg_salary FROM employees GROUP BY city ORDER BY avg_salary DESC"
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onExecuteQuery(query);
      setQueryHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 queries
    }
  };

  const handleSampleQuery = (sampleQuery) => {
    setQuery(sampleQuery);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        SQL Query Interface
      </h2>
      
      {/* Sample Queries */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Queries:</h3>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuery(sample.query)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            SQL Query
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Query will be executed across all selected peers
          </div>
          
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              loading || !query.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executing...
              </div>
            ) : (
              'Execute Query'
            )}
          </button>
        </div>
      </form>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Queries:</h3>
          <div className="space-y-1">
            {queryHistory.slice(0, 3).map((historyQuery, index) => (
              <div
                key={index}
                onClick={() => setQuery(historyQuery)}
                className="text-xs text-gray-600 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100 font-mono truncate"
              >
                {historyQuery}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryInterface;
