// 根据src chain的hash 找到目标链上的hash
// "checkTransOnline checkHash"  AND "0x8e8be38f61ec40c943fa49e8bd5e4235e5eb976b9d9f69aff2e90f59cbd48f93"

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config').config;
const network = config.network;
const kibanaConfig = require('./config').kibanaConfig;

const { default: axios } = require('axios');

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

    // Process block numbers in batches
    const blockTimestampMap = {};
    for (let i = 0; i < blockNumbers.length; i += batchSize) {
        const blockBatch = blockNumbers.slice(i, i + batchSize);
        const batchRequests = blockBatch.map((blockNumber, idx) => ({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockNumber, false],
            id: i + idx
        }));

        try {
            const response = await axios.post(rpcUrl, batchRequests, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

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