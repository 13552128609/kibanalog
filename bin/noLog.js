const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

async function findMissingRecords(receiveFile, successFile, outputFilename) {
    try {
        // Ensure result directory exists
        const resultDir = path.join(__dirname, '../result');
        if (!fs.existsSync(resultDir)) {
            fs.mkdirSync(resultDir, { recursive: true });
        }
        
        const outputFile = path.join(resultDir, outputFilename);

        // Read and parse both CSV files
        const receiveData = parse(fs.readFileSync(receiveFile, 'utf8'), { 
            columns: true,
            skip_empty_lines: true
        });

        const successData = parse(fs.readFileSync(successFile, 'utf8'), { 
            columns: true,
            skip_empty_lines: true
        });

        // Create a Set of all OriginTx values from success file for quick lookup
        const successOriginTxs = new Set(successData.map(row => row.OriginTx));

        // Find records in receiveData that don't exist in successData
        const missingRecords = receiveData.filter(row => {
            const originTx = row.OriginTx;
            return !successOriginTxs.has(originTx);
        });

        if (missingRecords.length === 0) {
            console.log('No missing records found.');
            return;
        }

        // Prepare output data with headers
        const outputData = stringify(missingRecords, {
            header: true,
            columns: Object.keys(receiveData[0]) // Use the same columns as input
        });

        // Write to output file
        fs.writeFileSync(outputFile, outputData);
        console.log(`Found ${missingRecords.length} missing records. Output saved to ${outputFile}`);

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node noLog.js <receive_file> <success_file> <output_filename>');
    console.log('Example: node noLog.js mpc_recieve.csv mpcsuccess.csv missing_records.csv');
    process.exit(1);
}

const [receiveFile, successFile, outputFilename] = args;

// Run the function
findMissingRecords(receiveFile, successFile, outputFilename)
    .catch(console.error);

//node noLog.js ../result/mpc_rieve_test_2026-01-06_11.csv ../result/mpcsuccess_test_2026-01-06_12.csv missing_records.csv    