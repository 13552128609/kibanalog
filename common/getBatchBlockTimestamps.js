const axios = require('axios');
const util = require('../util/util');

/**
 * Fetches timestamps for multiple blocks in batches
 * @param {string} rpcUrl - The RPC endpoint URL
 * @param {string[]} blockNumbers - Array of block numbers (as hex strings)
 * @param {number} [batchSize=50] - Number of blocks to fetch in each batch
 * @returns {Promise<Object>} Object mapping block numbers to timestamps
 */
async function getBatchBlockTimestamps(rpcUrl, blockNumbers, batchSize = 20) {
    console.log(`getBatchBlockTimestamps blockNumbers: ${util.stringifyObject(blockNumbers)}`);
    console.log(`getBatchBlockTimestamps rpcUrl: ${util.stringifyObject(rpcUrl)}`);
    const blockTimestampMap = {};
    
    for (let i = 0; i < blockNumbers.length; i += batchSize) {
        const blockBatch = blockNumbers.slice(i, i + batchSize);
        const batchRequests = blockBatch.map((blockNumber, idx) => ({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockNumber, false],
            id: i + idx
        }));
        console.log(`getBatchBlockTimestamps batchRequests: ${(batchRequests)}`);
        try {
            const response = await axios.post(rpcUrl, batchRequests, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`getBatchBlockTimestamps response: ${util.stringifyObject(response.data)}`);
            // Process block responses
            response.data.forEach((blockResult, idx) => {
                const blockNumber = blockBatch[idx];
                if (blockResult.result) {
                    blockTimestampMap[blockNumber] = 
                        parseInt(blockResult.result.timestamp, 16);
                } else {
                    console.warn(`No result for block: ${blockNumber}`);
                    blockTimestampMap[blockNumber] = null;
                }
            });
        } catch (error) {
            console.error(`Error processing block batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            // Mark all blocks in this batch as failed
            blockBatch.forEach(blockNumber => {
                blockTimestampMap[blockNumber] = null;
            });
        }
        await util.sleep(2000);
    }

    return blockTimestampMap;
}

module.exports = {
    getBatchBlockTimestamps
};
