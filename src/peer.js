const P2PDataLakeApp = require('./app');
const { Command } = require('commander');
const chalk = require('chalk');

const program = new Command();

program
  .option('-p, --port <number>', 'Port to run on', '3001')
  .option('-b, --bootstrap <host:port>', 'Bootstrap node to connect to')
  .option('-n, --name <name>', 'Node name')
  .parse();

const options = program.opts();
const port = parseInt(options.port);

console.log(chalk.blue('🚀 Starting P2P Data Lake Peer Node'));
console.log(chalk.green(`Port: ${port}`));

if (options.bootstrap) {
  console.log(chalk.green(`Bootstrap: ${options.bootstrap}`));
}

if (options.name) {
  console.log(chalk.green(`Name: ${options.name}`));
}

const app = new P2PDataLakeApp(port, options.bootstrap);
app.start();
