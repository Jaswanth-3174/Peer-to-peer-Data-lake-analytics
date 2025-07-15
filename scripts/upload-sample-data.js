#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function uploadSampleData() {
  const sampleFiles = [
    'sample-data/employees.csv',
    'sample-data/products.csv'
  ];

  console.log(chalk.blue('📤 Uploading sample data to P2P network...'));

  for (const filePath of sampleFiles) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      const filename = path.basename(filePath);

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data,
          metadata: {
            description: `Sample dataset: ${filename}`,
            source: 'P2P Data Lake Setup',
            tags: ['sample', 'demo']
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(chalk.green(`✅ Uploaded: ${filename} (ID: ${result.datasetId})`));
      } else {
        console.log(chalk.red(`❌ Failed to upload: ${filename}`));
      }

    } catch (error) {
      console.error(chalk.red(`Error uploading ${filePath}:`), error.message);
    }
  }

  console.log(chalk.blue('📊 Sample data upload complete!'));
}

// Run if script is executed directly
if (require.main === module) {
  uploadSampleData();
}

module.exports = { uploadSampleData };
