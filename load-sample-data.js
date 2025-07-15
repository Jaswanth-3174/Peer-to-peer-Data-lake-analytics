const fs = require('fs');

// Simple script to load sample data via API
async function loadSampleData(port = 3030) {
    const employeesData = fs.readFileSync('sample-data/employees.csv', 'utf8');
    const productsData = fs.readFileSync('sample-data/products.csv', 'utf8');
    
    console.log(`📤 Uploading data to localhost:${port}...`);
    
    try {
        console.log('📤 Uploading employees data...');
        
        const employeesResponse = await fetch(`http://localhost:${port}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'employees.csv',
                data: employeesData,
                metadata: {
                    description: 'Employee database',
                    source: 'Sample data',
                    tags: ['employees', 'hr', 'sample']
                }
            })
        });
        
        if (employeesResponse.ok) {
            console.log('✅ Employees data uploaded successfully');
        } else {
            console.error('❌ Failed to upload employees data:', await employeesResponse.text());
        }
        
        console.log('📤 Uploading products data...');
        
        const productsResponse = await fetch(`http://localhost:${port}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'products.csv',
                data: productsData,
                metadata: {
                    description: 'Product catalog',
                    source: 'Sample data',
                    tags: ['products', 'inventory', 'sample']
                }
            })
        });
        
        if (productsResponse.ok) {
            console.log('✅ Products data uploaded successfully');
        } else {
            console.error('❌ Failed to upload products data:', await productsResponse.text());
        }
        
        console.log(`🎉 Sample data loading complete for port ${port}!`);
        
    } catch (error) {
        console.error(`❌ Error loading sample data to port ${port}:`, error);
    }
}

// Get port from command line argument or default to 3030
const port = process.argv[2] || 3030;
loadSampleData(port);
