#!/usr/bin/env node

const io = require('socket.io-client');
const chalk = require('chalk');

async function connectPeers() {
  console.log(chalk.blue('🔗 Connecting P2P Network Peers...'));
  
  // Check which nodes are running
  const nodes = [
    { port: 3000, name: 'Bootstrap Node' },
    { port: 3001, name: 'Peer Node 1' },
    { port: 3002, name: 'Peer Node 2' }
  ];

  const activeNodes = [];
  
  for (const node of nodes) {
    try {
      const response = await fetch(`http://localhost:${node.port}/api/health`);
      if (response.ok) {
        const status = await response.json();
        activeNodes.push({ ...node, nodeId: status.nodeId });
        console.log(chalk.green(`✅ ${node.name} (${node.port}) - ${status.nodeId.substring(0, 8)}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${node.name} (${node.port}) - Not responding`));
    }
  }

  console.log(chalk.blue(`\n📊 Found ${activeNodes.length} active nodes:`));
  
  // Display datasets on each node
  for (const node of activeNodes) {
    try {
      const response = await fetch(`http://localhost:${node.port}/api/status`);
      const status = await response.json();
      console.log(chalk.cyan(`  ${node.name}: ${status.datasetsCount} datasets, ${status.peersCount} peers`));
    } catch (error) {
      console.log(chalk.red(`  ${node.name}: Error getting status`));
    }
  }

  console.log(chalk.blue('\n🌐 P2P Network Summary:'));
  console.log(chalk.yellow('  • Each node operates independently'));
  console.log(chalk.yellow('  • Data is stored locally on each node'));
  console.log(chalk.yellow('  • Queries can be run on any node'));
  console.log(chalk.yellow('  • To enable true P2P, implement peer discovery protocol'));
}

connectPeers().catch(console.error);
