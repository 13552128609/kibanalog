const axios = require('axios');
const { getBatchBlockTimestamps } = require('./getBatchBlockTimestamps');
const util = require('../util/util');
const { config, urlConfig } = require('../cfg/config');

async function getTransactionTimestampByChaintype(rpcUrl, txHashes,chainType,batchSize = 50){
    if (!chainType || String(chainType).toLowerCase() !== 'ada') {
        return getTransactionTimestamp(rpcUrl, txHashes,batchSize)
    }else{
        return getTransactionTimestampAda(rpcUrl, txHashes,batchSize)
    }

}


async function getTransactionTimestampAda(rpcUrl, txHashes,batchSize){
    let  url;
    //url = 'https://preprod.koios.rest/api/v1/tx_info';
    url = rpcUrl+"/tx_info"
    const hashes = (Array.isArray(txHashes) ? txHashes : []).filter(h => h && h !== 'N/A');
    if (!hashes.length) {
        return (Array.isArray(txHashes) ? txHashes : []).map((h) => ({
            txHash: h || null,
            timestamp: null,
            error: 'Missing txHash'
        }));
    }

    const size = batchSize || 20;
    const resultByTxHash = {};

    const strip0x = (h) => (typeof h === 'string' && h.startsWith('0x')) ? h.slice(2) : h;
    const ensure0x = (h) => {
        if (!h) return h;
        return (typeof h === 'string' && h.startsWith('0x')) ? h : `0x${h}`;
    };

    const keyByStripped = {};
    hashes.forEach((h) => {
        const stripped = strip0x(h);
        if (stripped) {
            keyByStripped[stripped] = ensure0x(h);
        }
    });

    for (let i = 0; i < hashes.length; i += size) {
        const batch = hashes.slice(i, i + size);
        try {
            const response = await axios.post(url, {
                _tx_hashes: batch.map(strip0x)
            });

            const rows = Array.isArray(response.data) ? response.data : [];
            rows.forEach((txData) => {
                const strippedTxHash = txData?.tx_hash;
                const timestamp = txData?.tx_timestamp ?? null;
                if (strippedTxHash) {
                    const keyTxHash = keyByStripped[strippedTxHash] || ensure0x(strippedTxHash);
                    resultByTxHash[keyTxHash] = {
                        txHash: keyTxHash,
                        blockNumber: txData?.block_height ?? null,
                        timestamp,
                        error: timestamp === null ? 'Timestamp not found' : null
                    };
                }
            });

            batch.forEach((txHash) => {
                if (!resultByTxHash[txHash]) {
                    resultByTxHash[txHash] = { txHash, timestamp: null, error: 'Tx not found' };
                }
            });
        } catch (error) {
            batch.forEach((txHash) => {
                resultByTxHash[txHash] = { txHash, timestamp: null, error: error.message };
            });
        }

        if (i + size < hashes.length) {
            await util.sleep(2000);
        }
    }

    return (Array.isArray(txHashes) ? txHashes : []).map((h) => {
        if (!h || h === 'N/A') {
            return { txHash: h || null, timestamp: null, error: 'Missing txHash' };
        }
        return resultByTxHash[h] || { txHash: h, timestamp: null, error: 'Tx not found' };
    });
}

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

    await util.sleep(2000);

    console.log(`getTransactionTimestamp blockNumber of txhashes results: ${util.stringifyObject(results)}`);
    // Get unique block numbers
    const blockNumbers = [...new Set(
        Object.values(results)
            .filter(r => r && r.blockNumber)
            .map(r => r.blockNumber)
    )];

    console.log(`getTransactionTimestamp blockNumbers: ${util.stringifyObject(blockNumbers)}`);
    // Get block timestamps using the batch function
    const blockTimestampMap = await getBatchBlockTimestamps(rpcUrl, '', blockNumbers);

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


async function getTransactionTimestampTemp(rpcUrl, txHash) {
    console.log(`getTransactionTimestamp rpcUrl: ${util.stringifyObject(rpcUrl)}`);
    
    const results = {};
    let request = {
            jsonrpc: "2.0",
            method: "eth_getTransactionByHash",
            params: txHash,
    }
     const response = await axios.post(rpcUrl, request, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    console.log(`getTransactionTimestamp response: ${util.stringifyObject(response)}`);
    
}

async function getTransactionTimestampsFromInfoByBock(network,txInfos,batchSize = 50) {
    console.log(`getTransactionTimestampFromInfo network: ${util.stringifyObject(network)}`);
    console.log(`getTransactionTimestampFromInfo txInfos length: ${txInfos ? txInfos.length : 0}`);
    if (!txInfos || !txInfos.length) {
        return [];
    }

    const sanitizeRpcUrl = (value) => {
        if (!value) return value;
        if (typeof value !== 'string') return value;
        return value.replace(/[`"']/g, '').replace(/,+\s*$/, '').trim();
    };

    const toHexBlockNumber = (blockNumber) => {
        if (blockNumber === null || blockNumber === undefined) return null;
        const s = String(blockNumber).trim();
        if (!s) return null;
        if (s.startsWith('0x') || s.startsWith('0X')) return s;
        const n = Number.parseInt(s, 10);
        if (Number.isNaN(n)) return null;
        return '0x' + n.toString(16);
    };

    const blockNumbersByChain = {};
    const txMeta = {};

    for (const txInfo of txInfos) {
        if (!txInfo || !txInfo.originTx) continue;

        const txHash = txInfo.originTx;
        const originChain = txInfo.originChain;
        const originBlock = txInfo.originBlock ?? txInfo.originBLock;
        const blockNumber = toHexBlockNumber(originBlock);

        txMeta[txHash] = { originChain, blockNumber };

        if (!originChain || !blockNumber) continue;
        if (!blockNumbersByChain[originChain]) blockNumbersByChain[originChain] = new Set();
        blockNumbersByChain[originChain].add(blockNumber);
    }

    const blockTimestampByChain = {};
    for (const [originChain, blockSet] of Object.entries(blockNumbersByChain)) {
        const rpcUrlRaw = urlConfig?.[network]?.[originChain];
        const rpcUrl = sanitizeRpcUrl(rpcUrlRaw);
        if (!rpcUrl) {
            console.warn(`getTransactionTimestampFromInfo missing rpcUrl for network=${network}, originChain=${originChain}`);
            blockTimestampByChain[originChain] = {};
            continue;
        }

        const blockNumbers = Array.from(blockSet);
        const map = await getBatchBlockTimestamps(rpcUrl, originChain, blockNumbers, batchSize);
        blockTimestampByChain[originChain] = map || {};
        await util.sleep(2000);
    }

    return txInfos.map((txInfo) => {
        const txHash = txInfo?.originTx;
        if (!txHash) {
            return { txHash: null, timestamp: null, error: 'Missing txHash' };
        }

        const meta = txMeta[txHash] || {};
        const originChain = meta.originChain;
        const blockNumber = meta.blockNumber;
        const timestampMap = originChain ? blockTimestampByChain[originChain] : null;
        const timestamp = (timestampMap && blockNumber) ? (timestampMap[blockNumber] ?? null) : null;

        return {
            txHash,
            blockNumber: blockNumber || null,
            timestamp,
            error: timestampMap && blockNumber && timestampMap[blockNumber] === undefined ? 'Block timestamp not found' : null
        };
    });
}



async function getTransactionTimestampsFromInfoTxHash(network, txInfosWithDstTxHash,batchSize = 50) {
    console.log(`getTransactionTimestampsFromInfoTxHash network: ${util.stringifyObject(network)}`);
    console.log(`getTransactionTimestampsFromInfoTxHash txInfos length: ${txInfosWithDstTxHash ? txInfosWithDstTxHash.length : 0}`);
    if (!txInfosWithDstTxHash || !txInfosWithDstTxHash.length) {
        return [];
    }

    const sanitizeRpcUrl = (value) => {
        if (!value) return value;
        if (typeof value !== 'string') return value;
        return value.replace(/[`"']/g, '').replace(/,+\s*$/, '').trim();
    };

    const txHashesByChainType = {};
    for (const txInfo of txInfosWithDstTxHash) {
        const chainType = txInfo?.chainType;
        const dstTxHash = txInfo?.dstTxHash;
        if (!chainType || !dstTxHash || dstTxHash === 'N/A') continue;
        if (!txHashesByChainType[chainType]) txHashesByChainType[chainType] = [];
        txHashesByChainType[chainType].push(dstTxHash);
    }

    const resultByTxHash = {};
    for (const [chainType, txHashes] of Object.entries(txHashesByChainType)) {
        const rpcUrlRaw = urlConfig?.[network]?.[chainType];
        const rpcUrl = sanitizeRpcUrl(rpcUrlRaw);
        if (!rpcUrl) {
            console.warn(`getTransactionTimestampsFromInfoTxHash missing rpcUrl for network=${network}, chainType=${chainType}`);
            txHashes.forEach((h) => {
                resultByTxHash[h] = { txHash: h, timestamp: null, error: 'Missing rpcUrl' };
            });
            continue;
        }

        const timestamps = await getTransactionTimestampByChaintype(rpcUrl, txHashes, chainType, batchSize);
        (timestamps || []).forEach((r) => {
            if (r && r.txHash) {
                resultByTxHash[r.txHash] = r;
            }
        });

        await util.sleep(2000);
    }

    return txInfosWithDstTxHash.map((txInfo) => {
        const dstTxHash = txInfo?.dstTxHash;
        if (!dstTxHash || dstTxHash === 'N/A') {
            return { txHash: dstTxHash || null, timestamp: null, error: 'Missing dstTxHash' };
        }
        return resultByTxHash[dstTxHash] || { txHash: dstTxHash, timestamp: null, error: 'Tx not found' };
    });
}

module.exports = { getTransactionTimestamp, getTransactionTimestampsFromInfoByBock,getTransactionTimestampsFromInfoTxHash,getTransactionTimestampTemp };