import React, { useState, useEffect } from 'react';

const PeerManager = ({ peers, selectedPeers, onPeerToggle }) => {
  const [peerStatus, setPeerStatus] = useState({});

  useEffect(() => {
    // Check peer status
    checkPeerStatus();
    const interval = setInterval(checkPeerStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [peers]);

  const checkPeerStatus = async () => {
    const status = {};
    
    for (const peer of peers) {
      try {
        const response = await fetch(`${peer}/health`, {
          timeout: 5000
        });
        status[peer] = response.ok ? 'online' : 'offline';
      } catch (error) {
        status[peer] = 'offline';
      }
    }
    
    setPeerStatus(status);
  };

  const getPeerInfo = (peer) => {
    const port = peer.split(':')[2];
    return {
      name: `Peer ${parseInt(port) - 8000}`,
      port: port,
      url: peer
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Peer Network
      </h2>
      
      <div className="space-y-3">
        {peers.map((peer) => {
          const info = getPeerInfo(peer);
          const isSelected = selectedPeers.includes(peer);
          const status = peerStatus[peer] || 'checking';
          
          return (
            <div
              key={peer}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onPeerToggle(peer)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onPeerToggle(peer)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {info.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Port: {info.port}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : status === 'offline'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1 ${
                        status === 'online'
                          ? 'bg-green-400'
                          : status === 'offline'
                          ? 'bg-red-400'
                          : 'bg-yellow-400'
                      }`}
                    />
                    {status === 'checking' ? 'Checking...' : status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Selected Peers:</span>
            <span className="font-medium">{selectedPeers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Online Peers:</span>
            <span className="font-medium text-green-600">
              {Object.values(peerStatus).filter(s => s === 'online').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerManager;
