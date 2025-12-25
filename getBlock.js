const axios = require('axios');

async function getArbBlockTimestamp(blockNumber) {
    // Arbitrum 官方公共 RPC 节点
    const RPC_URL = 'https://arb1.arbitrum.io/rpc';

    // 将十进制区块号转换为十六进制 (JSON-RPC 标准要求)
    const hexBlockNumber = '0x' + blockNumber.toString(16);

    const data = {
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [hexBlockNumber, false], // false 表示不获取完整的交易列表
        id: 1
    };

    try {
        const response = await axios.post(RPC_URL, data);

        if (response.data.result) {
            const block = response.data.result;
            // 返回的 timestamp 是十六进制秒数，需要转为十进制
            const timestampHex = block.timestamp;
            const timestampDecimal = parseInt(timestampHex, 16);

            console.log(`区块号: ${blockNumber}`);
            console.log(`十六进制时间戳: ${timestampHex}`);
            console.log(`Unix 时间戳 (秒): ${timestampDecimal}`);
            console.log(`本地时间: ${new Date(timestampDecimal * 1000).toLocaleString()}`);

            return timestampDecimal;
        } else {
            console.error('未找到区块信息:', response.data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

// 测试：查询 Arbitrum 主网的一个区块
getArbBlockTimestamp(170000000);