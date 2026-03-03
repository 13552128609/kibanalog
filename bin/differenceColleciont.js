const fs = require('fs');
const readline = require('readline');

// Function to extract peer IDs from log1 (PeerId:0x...)
function extractPeerIdsFromLog1(line) {
    const match = line.match(/PeerId:(0x[0-9a-f]+)/i);
    return match ? [match[1].toLowerCase()] : [];
}

// Function to extract node IDs from log2 (nodeId=0x...)
function extractNodeIdsFromLog2(line) {
    const match = line.match(/nodeId=(0x[0-9a-f]+)/i);
    return match ? [match[1].toLowerCase()] : [];
}

// Function to read IDs from a file using the provided extractor
async function readIds(filePath, extractor) {
    const ids = new Set();
    const fileStream = fs.createReadStream(filePath);
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const extracted = extractor(line);
        extracted.forEach(id => ids.add(id));
    }

    return ids;
}

// Function to parse log3.txt and create a map of nodeId to index
async function parseLog3(filePath) {
    const nodeIdToIndex = new Map();
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Extract nodeId and index from the first group's grpElms
    const grpElms = data.grpInfo[0].grpElms;
    grpElms.forEach(elm => {
        const nodeId = elm.nodeId.toLowerCase();
        nodeIdToIndex.set(nodeId, elm.index);
    });

    return nodeIdToIndex;
}

async function main() {
    if (process.argv.length !== 5) {
        console.log('Usage: node findDifferences.js <log1_file> <log2_file> <log3_file>');
        process.exit(1);
    }

    const [log1Path, log2Path, log3Path] = process.argv.slice(2);

    try {
        // Read and process all files
        const [set1, set2, nodeIdToIndex] = await Promise.all([
            readIds(log1Path, extractPeerIdsFromLog1),
            readIds(log2Path, extractNodeIdsFromLog2),
            parseLog3(log3Path)
        ]);

        // Calculate differences
        const inSet1NotInSet2 = [...set1].filter(id => !set2.has(id));
        const inSet2NotInSet1 = [...set2].filter(id => !set1.has(id));

        // Find matching indices in log3.txt for differences
        function findMatchingIndices(ids) {
            const results = [];
            for (const id of ids) {
                // Try to match the full ID first
                if (nodeIdToIndex.has(id)) {
                    results.push({ 
                        id, 
                        index: nodeIdToIndex.get(id),
                        fullId: id
                    });
                } else {
                    // If no direct match, try to find a partial match
                    for (const [nodeId, index] of nodeIdToIndex.entries()) {
                        if (nodeId.includes(id.toLowerCase()) || 
                            id.toLowerCase().includes(nodeId)) {
                            results.push({ id, index, fullId: nodeId });
                            break;
                        }
                    }
                }
            }
            return results;
        }

        // Get matching indices for differences
        const set1OnlyMatches = findMatchingIndices(inSet1NotInSet2);
        const set2OnlyMatches = findMatchingIndices(inSet2NotInSet1);

        // Output results
        console.log('=== Differences and Matching Indices ===\n');
        
        console.log('=== In Set 1 but not in Set 2 ===');
        if (set1OnlyMatches.length > 0) {
            set1OnlyMatches.forEach(({ id, index, fullId }) => {
                console.log(`ID: ${id} -> Index: ${index}, Full nodeId: ${fullId}`);
            });
        } else {
            console.log('No differences found (all IDs in Set 1 exist in Set 2)');
        }
        console.log(`\nTotal: ${set1OnlyMatches.length}\n`);

        console.log('=== In Set 2 but not in Set 1 ===');
        if (set2OnlyMatches.length > 0) {
            set2OnlyMatches.forEach(({ id, index, fullId }) => {
                console.log(`ID: ${id} -> Index: ${index}, Full nodeId: ${fullId}`);
            });
        } else {
            console.log('No differences found (all IDs in Set 2 exist in Set 1)');
        }
        console.log(`\nTotal: ${set2OnlyMatches.length}`);

    } catch (error) {
        console.error('Error processing files:', error);
        process.exit(1);
    }
}

main();

// node differenceColleciont.js  ./collection2.txt ./collection1.txt  ./log3.txt