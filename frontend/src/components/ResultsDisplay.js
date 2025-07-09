import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultsDisplay = ({ results }) => {
  const [viewMode, setViewMode] = useState('table');

  if (!results) return null;

  const { success, aggregated_data, columns, total_rows, results: peerResults, error } = results;

  if (!success) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Query Error</h3>
          <p className="text-red-700">{error || 'An error occurred while executing the query'}</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const prepareChartData = () => {
    if (!aggregated_data || aggregated_data.length === 0) return [];
    
    // Take first 10 rows for chart
    return aggregated_data.slice(0, 10).map((row, index) => {
      const dataPoint = { index: index + 1 };
      columns.forEach((col, colIndex) => {
        dataPoint[col] = row[colIndex];
      });
      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  // Get numeric columns for chart
  const getNumericColumns = () => {
    if (!aggregated_data || aggregated_data.length === 0) return [];
    
    return columns.filter((col, colIndex) => {
      const sampleValue = aggregated_data[0][colIndex];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    });
  };

  const numericColumns = getNumericColumns();

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Query Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {total_rows} rows across {peerResults?.length || 0} peers
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('chart')}
              disabled={numericColumns.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-primary-600 text-white'
                  : numericColumns.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chart View
            </button>
          </div>
        </div>
      </div>

      {/* Peer Results Summary */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Peer Results Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {peerResults?.map((peerResult, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                peerResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {peerResult.peer_id || `Peer ${index + 1}`}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    peerResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {peerResult.success ? 'Success' : 'Error'}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {peerResult.success
                  ? `${peerResult.row_count} rows`
                  : peerResult.error?.substring(0, 50) + '...'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            {aggregated_data && aggregated_data.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregated_data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {cell !== null && cell !== undefined ? String(cell) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data to display
              </div>
            )}
          </div>
        ) : (
          <div className="h-96">
            {chartData.length > 0 && numericColumns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={columns[0]} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {numericColumns.slice(0, 3).map((column, index) => (
                    <Bar
                      key={column}
                      dataKey={column}
                      fill={['#3b82f6', '#10b981', '#f59e0b'][index]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-lg mb-2">📊</div>
                  <div>No numeric data available for visualization</div>
                  <div className="text-sm mt-1">Try a query with numeric columns</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
