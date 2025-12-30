
const { getTransactionTimestamp } = require('./getTransTimeStamp');
(async () => {
    try {
        const config = require('../cfg/config').config;
        const util = require('../util/util');
        const network = "test";
        const rpcUrl = config[network].dstChain.url;
        let retGetTransactionTimestamp = await getTransactionTimestamp(rpcUrl, ["0xf2e56f50bbb7fd1d8304e909b1226d70c21a3d8b9c2881247b1b705b9116f69d"])
        console.log(`retGetTransactionTimestamp: ${util.stringifyObject(retGetTransactionTimestamp)}`);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();