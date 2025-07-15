#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

const nodes = [
  { port: 3000, name: 'Bootstrap Node' },
  { port: 3001, name: 'Peer Node 1' },
  { port: 3002, name: 'Peer Node 2' }
];

console.log(chalk.blue('🌐 Starting P2P Data Lake Network...'));
console.log(chalk.yellow('───────────────────────────────────────'));

const processes = [];

// Start bootstrap node first
setTimeout(() => {
  const bootstrapNode = spawn('node', ['src/app.js', '--port', '3000'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  processes.push(bootstrapNode);
  console.log(chalk.green(`🚀 Started ${nodes[0].name} on port ${nodes[0].port}`));
}, 0);

// Start peer nodes after bootstrap
setTimeout(() => {
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const peerNode = spawn('node', ['src/peer.js', '--port', node.port.toString()], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    processes.push(peerNode);
    console.log(chalk.green(`🚀 Started ${node.name} on port ${node.port}`));
  }
}, 3000);

// Upload sample data after all nodes are started
setTimeout(() => {
  console.log(chalk.blue('\n📤 Uploading sample data...'));
  const uploader = spawn('node', ['scripts/upload-sample-data.js'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
}, 8000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🔄 Shutting down network...'));
  
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  });
  
  setTimeout(() => {
    console.log(chalk.green('✅ Network shutdown complete'));
    process.exit(0);
  }, 2000);
});

console.log(chalk.blue('\n📊 Network Status:'));
console.log(chalk.green('• Bootstrap Node: http://localhost:3000'));
console.log(chalk.green('• Peer Node 1: http://localhost:3001'));
console.log(chalk.green('• Peer Node 2: http://localhost:3002'));
console.log(chalk.yellow('\nPress Ctrl+C to shutdown the network'));
