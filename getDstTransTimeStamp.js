const axios = require('axios');
const { getBatchBlockTimestamps } = require('./getBatchBlockTimestamps');

async function getTransactionTimestamp(network, dstTxHashes) {
    if (!dstTxHashes || !dstTxHashes.length) {
        return [];
    }

    const config = require('./config').config;
    const rpcUrl = config[network].dstChain.url;
    const batchSize = 50;
    const results = {};

    // Process transaction hashes in batches
    for (let i = 0; i < dstTxHashes.length; i += batchSize) {
        const batch = dstTxHashes.slice(i, i + batchSize);
        const batchRequests = batch.map((txHash, index) => ({
            jsonrpc: "2.0",
            method: "eth_getTransactionByHash",
            params: [txHash],
            id: i + index
        }));

        try {
            const response = await axios.post(rpcUrl, batchRequests, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

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
        }
    }

    // Get unique block numbers
    const blockNumbers = [...new Set(
        Object.values(results)
            .filter(r => r && r.blockNumber)
            .map(r => r.blockNumber)
    )];

    // Get block timestamps using the batch function
    const blockTimestampMap = await getBatchBlockTimestamps(rpcUrl, blockNumbers);

    // Combine the results
    return dstTxHashes.map(txHash => {
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