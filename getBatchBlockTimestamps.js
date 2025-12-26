const axios = require('axios');

/**
 * Fetches timestamps for multiple blocks in batches
 * @param {string} rpcUrl - The RPC endpoint URL
 * @param {string[]} blockNumbers - Array of block numbers (as hex strings)
 * @param {number} [batchSize=50] - Number of blocks to fetch in each batch
 * @returns {Promise<Object>} Object mapping block numbers to timestamps
 */
async function getBatchBlockTimestamps(rpcUrl, blockNumbers, batchSize = 50) {
    const blockTimestampMap = {};
    
    for (let i = 0; i < blockNumbers.length; i += batchSize) {
        const blockBatch = blockNumbers.slice(i, i + batchSize);
        const batchRequests = blockBatch.map((blockNumber, idx) => ({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockNumber, false],
            id: i + idx
        }));
console.log(`batchRequests: ${batchRequests}`);
        try {
            const response = await axios.post(rpcUrl, batchRequests, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
console.log(`response: ${response}`);
            // Process block responses
            response.data.forEach((blockResult, idx) => {
                const blockNumber = blockBatch[idx];
                if (blockResult.result) {
                    blockTimestampMap[blockNumber] = 
                        parseInt(blockResult.result.timestamp, 16) * 1000;
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
    }

    return blockTimestampMap;
}

module.exports = {
    getBatchBlockTimestamps
};

const config = require('./config').config;
const network = "main";
const RPC_URL = config[network].srcChain.url;
console.log(`RPC_URL: ${RPC_URL}`);

// 测试：一次获取 5 个区块的时间戳
async function test() {
    //const blocksToFetch = [227814360, 227814361, 227814362, 227814363, 227814364];
    const blocksToFetch = ['0x01', '0x02', '0x03', '0x04', '0x05'];
    try {
        const results = await getBatchBlockTimestamps(RPC_URL,blocksToFetch);
        console.log('Results:', results);
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// 取消下面的注释以运行测试
test();

module.exports = {
    getBatchBlockTimestamps
};
