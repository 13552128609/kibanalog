
const { getBatchBlockTimestamps } = require('./getBatchBlockTimestamps');
(async () => {
    try {
        const config = require('../cfg/config').config;
        const network = "test";
        //const RPC_URL = config[network].srcChain.url;
        const RPC_URL = config[network].dstChain.url;
        console.log(`RPC_URL: ${RPC_URL}`);
        const blocksToFetch = ['0x'+parseInt(40525320).toString(16)];
        const results = await getBatchBlockTimestamps(RPC_URL,blocksToFetch);
        console.log('Results:', results);


        const RPC_URL2 = config[network].srcChain.url;
        const blocksToFetch2 = ['0x'+parseInt(228969549).toString(16)];
        const results2 = await getBatchBlockTimestamps(RPC_URL2,blocksToFetch2);
        console.log('Results2:', results2);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();