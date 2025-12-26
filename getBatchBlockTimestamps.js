/*
get batch block timestamps, used for calculate during

srcChain: ARB

get the srcChain block timestamps, and return the timestamps array

*/
const axios = require('axios');
const config = require('./config');
const network = config.network;

// Replace with your Infura project ID and secret
//const RPC_URL = `https://arbitrum-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
const RPC_URL = config[network].srcChain.url;

async function getBatchBlockTimestamps(rpcUrl, blockNumbers) {
    // 1. 构造批处理请求体
    const batchData = blockNumbers.map((num, index) => ({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['0x' + num.toString(16), false],
        id: index
    }));

    try {
        const response = await axios.post(
            RPC_URL, 
            batchData,
        );

        // 2. 解析返回的数组结果
        const results = response.data
            .sort((a, b) => a.id - b.id)
            .map(res => {
                if (res.result) {
                    const tsHex = res.result.timestamp;
                    const tsDecimal = parseInt(tsHex, 16);
                    return {
                        blockNumber: blockNumbers[res.id],
                        timestamp: tsDecimal,
                        date: new Date(tsDecimal * 1000).toISOString(),
                        hash: res.result.hash
                    };
                }
                return {
                    blockNumber: blockNumbers[res.id], 
                    error: res.error ? res.error.message : 'Fetch failed' 
                };
            });

        console.table(results);
        return results;
    } catch (error) {
        console.error('批处理请求失败:', error.response?.data || error.message);
        throw error;
    }
}

// 测试：一次获取 5 个区块的时间戳
async function test() {
    const blocksToFetch = [170000000, 170000010, 170000020, 170000030, 170000040];
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

// 根据src chain的hash 找到目标链上的hash
// "checkTransOnline checkHash"  AND "0x8e8be38f61ec40c943fa49e8bd5e4235e5eb976b9d9f69aff2e90f59cbd48f93"
