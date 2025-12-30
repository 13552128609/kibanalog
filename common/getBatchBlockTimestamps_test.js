const config = require('../cfg/config').config;
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