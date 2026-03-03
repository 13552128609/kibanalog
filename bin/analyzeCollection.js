const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to count the number of 1s in binary representation
function countOnes(hexString) {
    // Remove '0x' prefix if present
    const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    // Convert hex to binary and count '1's
    return parseInt(hex, 16).toString(2).split('1').length - 1;
}

async function processLogFile(inputFile, outputFile) {
    console.log(`Analysis begin. Input: ${inputFile}`);
    const selfCollections = new Set();
    const peerCollections = new Set();
    const rcvCollections = new Set();
    
    const selfPattern = /self collection=(0x[0-9a-f]+)/i;
    const peerPattern = /peers collection=(0x[0-9a-f]+)/i;
    const rcvPattern = /rcvCollection=(0x[0-9a-f]+)/i;

    // Read the file line by line
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        // Extract self collection
        const selfMatch = line.match(selfPattern);
        if (selfMatch) {
            selfCollections.add(selfMatch[1].toLowerCase());
            console.log(`Self collection: ${selfMatch[1]}`);
        }

        // Extract peer collection
        const peerMatch = line.match(peerPattern);
        if (peerMatch) {
            peerCollections.add(peerMatch[1].toLowerCase());
        }

        // Extract rcvCollection
        const rcvMatch = line.match(rcvPattern);
        if (rcvMatch) {
            rcvCollections.add(rcvMatch[1].toLowerCase());
        }
    }

    // Process and write results
    let output = "=== Collection Analysis Report ===\n\n";
    
    // Self Collections
    output += "1. Self Collections:\n";
    output += "Hex\t\tBinary\t\t\t\tOnes Count\n";
    output += "--------------------------------------------------\n";
    for (const hex of Array.from(selfCollections).sort()) {
        const binary = parseInt(hex, 16).toString(2).padStart(32, '0');
        const ones = countOnes(hex);
        output += `${hex.padEnd(10)}\t${binary}\t${ones}\n`;
    }

    // Peer Collections
    output += "\n2. Peer Collections:\n";
    output += "Hex\t\tBinary\t\t\t\tOnes Count\n";
    output += "--------------------------------------------------\n";
    for (const hex of Array.from(peerCollections).sort()) {
        const binary = parseInt(hex, 16).toString(2).padStart(32, '0');
        const ones = countOnes(hex);
        output += `${hex.padEnd(10)}\t${binary}\t${ones}\n`;
    }

    // Received Collections
    output += "\n3. Received Collections:\n";
    output += "Hex\t\tBinary\t\t\t\tOnes Count\n";
    output += "--------------------------------------------------\n";
    for (const hex of Array.from(rcvCollections).sort()) {
        const binary = parseInt(hex, 16).toString(2).padStart(32, '0');
        const ones = countOnes(hex);
        output += `${hex.padEnd(10)}\t${binary}\t${ones}\n`;
    }

    // Bitwise AND analysis between self and peer collections
    output += "\n4. Bitwise AND Analysis (Self & Peer):\n";
    output += "Peer Collection\t\tAND Result\t\t1s Count\n";
    output += "--------------------------------------------------\n";
    
    if (selfCollections.size > 0) {
        const selfHex = Array.from(selfCollections)[0]; // Get the first self collection
        const selfValue = parseInt(selfHex, 16);
        
        for (const peerHex of Array.from(peerCollections).sort()) {
            const peerValue = parseInt(peerHex, 16);
            const andResult = selfValue & peerValue;
            const andHex = '0x' + andResult.toString(16).padStart(8, '0');
            const ones = countOnes(andHex);
            output += `${peerHex.padEnd(16)}\t${andHex.padEnd(16)}\t${ones}\n`;
        }
    } else {
        output += "No self collections found for AND operation\n";
    }

    // Summary
    output += "\n=== Summary ===\n";
    output += `Total Self Collections: ${selfCollections.size}\n`;
    output += `Total Peer Collections: ${peerCollections.size}\n`;
    output += `Total Received Collections: ${rcvCollections.size}\n`;

    // Write to output file
    fs.writeFileSync(outputFile, output);
    console.log(`Analysis complete. Results written to: ${outputFile}`);
    console.log(`- Self Collections: ${selfCollections.size}`);
    console.log(`- Peer Collections: ${peerCollections.size}`);
    console.log(`- Received Collections: ${rcvCollections.size}`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.log('Usage: node analyzeCollection.js <input_file>');
    process.exit(1);
}

const inputFile = path.resolve(args[0]);  // Get absolute path
const outputFile = path.join(
    path.dirname(inputFile),
    `${path.basename(inputFile, path.extname(inputFile))}_analysis.txt`
);

// Run the analysis
processLogFile(inputFile, outputFile).catch(err => {
    console.error('Error processing file:', err);
    process.exit(1);
});