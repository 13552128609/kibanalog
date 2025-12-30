const axios = require('axios');
const { getBatchBlockTimestamps } = require('./getBatchBlockTimestamps');
const util = require('../util/util');
async function getTransactionTimestamp(rpcUrl, txHashes,batchSize = 50) {
    console.log(`getTransactionTimestamp rpcUrl: ${util.stringifyObject(rpcUrl)}`);
    console.log(`getTransactionTimestamp txHashes: ${util.stringifyObject(txHashes)}`);
    if (!txHashes || !txHashes.length) {
        return [];
    }
    
    const results = {};

    // Process transaction hashes in batches
    for (let i = 0; i < txHashes.length; i += batchSize) {
        const batch = txHashes.slice(i, i + batchSize);
        const batchRequests = batch.map((txHash, index) => ({
            jsonrpc: "2.0",
            method: "eth_getTransactionByHash",
            params: [txHash],
            id: i + index
        }));
        console.log(`getTransactionTimestamp batchRequests: ${util.stringifyObject(batchRequests)}`);
        try {
            const response = await axios.post(rpcUrl, batchRequests, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`getTransactionTimestamp response: ${util.stringifyObject(response)}`);
            // Process the batch response
            response.data.forEach((txResult, idx) => {
                const txHash = batch[idx];
                if (txResult.result) {
                    const blockNumber = txResult.result.blockNumber;
                    results[txHash] = {
                        blockNumber,
                        timestamp: null
                    };
                } else {
                    console.warn(`No result for tx: ${txHash}`);
                    results[txHash] = { error: 'Transaction not found' };
                }
            });
        } catch (error) {
            console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            batch.forEach(txHash => {
                results[txHash] = { error: error.message };
            });
            return null;
        }
    }

    console.log(`getTransactionTimestamp blockNumber of txhashes results: ${util.stringifyObject(results)}`);
    // Get unique block numbers
    const blockNumbers = [...new Set(
        Object.values(results)
            .filter(r => r && r.blockNumber)
            .map(r => r.blockNumber)
    )];

    console.log(`getTransactionTimestamp blockNumbers: ${util.stringifyObject(blockNumbers)}`);
    // Get block timestamps using the batch function
    const blockTimestampMap = await getBatchBlockTimestamps(rpcUrl, blockNumbers);

    // Combine the results
    return txHashes.map(txHash => {
        const result = results[txHash];
        if (!result || result.error) {
            return { 
                txHash, 
                timestamp: null, 
                error: result?.error || 'Unknown error'
            };
        }
        return {
            txHash,
            blockNumber: result.blockNumber,
            timestamp: blockTimestampMap[result.blockNumber] || null,
            error: blockTimestampMap[result.blockNumber] === undefined ? 'Block timestamp not found' : null
        };
    });
}

module.exports = { getTransactionTimestamp };