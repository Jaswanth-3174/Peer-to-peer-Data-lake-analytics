import React from 'react';

const Header = () => {
  return (
    <header className="bg-primary-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">P2P Data Lake Analytics</h1>
            <p className="text-primary-100 mt-1">
              Decentralized analytics framework for distributed datasets
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary-600 px-3 py-1 rounded-full text-sm">
              <span className="text-green-300">●</span> Connected
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
