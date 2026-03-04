const axios = require('axios');
const util = require('../util/util');

/**
 * Fetches timestamps for multiple blocks in batches
 * @param {string} rpcUrl - The RPC endpoint URL
 * @param {string[]} blockNumbers - Array of block numbers (as hex strings)
 * @param {number} [batchSize=50] - Number of blocks to fetch in each batch
 * @returns {Promise<Object>} Object mapping block numbers to timestamps
 */

async function getBatchBlockTimestamps(rpcUrl, type, blockNumbers, batchSize = 20) {
    if (!type || String(type).toLowerCase() !== 'ada') {
        return getBatchBlockTimestampsEth(rpcUrl,blockNumbers,batchSize);
    }else{
        return getBatchBlockTimestampsAda(rpcUrl,blockNumbers,batchSize);
    }
}



async function getBatchBlockTimestampsAdaByHeights(rpcUrl,heightsArray) {
  let baseUrl = rpcUrl + "/blocks";
  const heightsStr = heightsArray.join(',');
  const url = `${baseUrl}?block_height=in.(${heightsStr})`;

  try {
    const response = await axios.get(url);
    // 返回的是一个数组，包含所有匹配的区块信息
    return response.data.map(b => ({      
      blockNumber: b.block_height,
      time: b.block_time
    }));
  } catch (error) {
    console.error("批量查询失败:", error.message);
  }
}

async function getBatchBlockTimestampsAda(rpcUrl,blockNumbers, batchSize = 20) {
  console.log(`getBatchBlockTimestampsAda blockNumbers: ${util.stringifyObject(blockNumbers)}`);
  console.log(`getBatchBlockTimestampsAda rpcUrl: ${util.stringifyObject(rpcUrl)}`);
  
  const baseUrl = rpcUrl + "/blocks";
  console.log(`getBatchBlockTimestampsAda baseUrl: ${util.stringifyObject(baseUrl)}`);

  //const baseUrl = (rpcUrl && typeof rpcUrl === 'string') ? rpcUrl : 'https://preprod.koios.rest/api/v1/blocks';
  const blockTimestampMap = {};
  const blocks = Array.isArray(blockNumbers) ? blockNumbers : [];

  const toBlockHeight = (blockNumber) => {
    if (blockNumber === null || blockNumber === undefined) return null;
    const s = String(blockNumber).trim();
    if (!s) return null;
    if (s.startsWith('0x') || s.startsWith('0X')) {
      const n = Number.parseInt(s, 16);
      return Number.isNaN(n) ? null : n;
    }
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };

  const heights = blocks.map(toBlockHeight).filter(h => h !== null);
  console.log(`getBatchBlockTimestampsAda heights: ${util.stringifyObject(heights)}`);

  for (let i = 0; i < heights.length; i += batchSize) {
    const batch = heights.slice(i, i + batchSize);
    let results = await getBatchBlockTimestampsAdaByHeights(rpcUrl, batch);
    console.log(`getBatchBlockTimestampsAda results: ${util.stringifyObject(results)}`);

    if (!results || !Array.isArray(results)) {
      results = [];
    }

    for (const result of results) {
      if (!result || result.blockNumber === null || result.blockNumber === undefined) continue;
      const height = Number.parseInt(String(result.blockNumber), 10);
      const hexKey = Number.isNaN(height) ? null : `0x${height.toString(16)}`;

      if (hexKey) {
        blockTimestampMap[hexKey] = result.time;
      }
      blockTimestampMap[String(result.blockNumber)] = result.time;
    }
    if (i + batchSize < heights.length) {
      await util.sleep(2000);
    }
  }

  return blockTimestampMap;
}

async function getBlockTimeByHeightAda(blockHeight) {
  // Koios Preprod 网络地址
  // 如果是主网，请改为 https://api.koios.rest/api/v1/blocks
  const baseUrl = 'https://preprod.koios.rest/api/v1/blocks';

  try {
    const response = await axios.get(baseUrl, {
      params: {
        block_height: `eq.${blockHeight}`, // 这里的 eq. 是 Koios 的过滤语法
        select: 'block_time,hash'          // 只选择需要的字段
      }
    });

    if (response.data && response.data.length > 0) {
      const block = response.data[0];
      const timestamp = block.block_time;
      const date = new Date(timestamp * 1000);

      console.log(`--- 区块信息 ---`);
      console.log(`块高: ${blockHeight}`);
      console.log(`哈希: ${block.hash}`);
      console.log(`Unix 时间戳: ${timestamp}`);
      console.log(`可读时间: ${date.toLocaleString()}`);
      
      return timestamp;
    } else {
      console.log(`未找到块高为 ${blockHeight} 的区块。`);
    }
  } catch (error) {
    console.error("查询出错:", error.message);
  }
}

async function getBatchBlockTimestampsEth(rpcUrl,blockNumbers, batchSize = 20) {
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
