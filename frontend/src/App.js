import React, { useState, useEffect } from 'react';
import QueryInterface from './components/QueryInterface';
import PeerManager from './components/PeerManager';
import ResultsDisplay from './components/ResultsDisplay';
import Header from './components/Header';

function App() {
  const [peers, setPeers] = useState([
    'http://localhost:8011',
    'http://localhost:8012',
    'http://localhost:8013'
  ]);
  
  const [selectedPeers, setSelectedPeers] = useState([]);
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with all peers selected
    setSelectedPeers(peers);
  }, []);

  const handlePeerToggle = (peer) => {
    setSelectedPeers(prev => 
      prev.includes(peer) 
        ? prev.filter(p => p !== peer)
        : [...prev, peer]
    );
  };

  const handleQueryExecute = async (query) => {
    if (selectedPeers.length === 0) {
      alert('Please select at least one peer to query');
      return;
    }

    setLoading(true);
    try {
      console.log("Executing query:", query);
      console.log("Selected peers:", selectedPeers);
      
      // Clean the query - remove trailing semicolon if present
      const cleanedQuery = query.trim().endsWith(';') ? query.trim().slice(0, -1) : query.trim();
      
      const response = await fetch('http://localhost:8011/query/multi-peer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: cleanedQuery,
          peers: selectedPeers
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Query response:", data);
      setQueryResults(data);
    } catch (error) {
      console.error('Error executing query:', error);
      setQueryResults({
        success: false,
        error: `Failed to execute query: ${error.message}. Please check that all selected peers are online.`,
        results: [],
        aggregated_data: [],
        columns: [],
        total_rows: 0
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <PeerManager 
              peers={peers}
              selectedPeers={selectedPeers}
              onPeerToggle={handlePeerToggle}
            />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <QueryInterface 
              onExecuteQuery={handleQueryExecute}
              loading={loading}
            />
            
            {queryResults && (
              <ResultsDisplay results={queryResults} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
