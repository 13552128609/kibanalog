
const { getTransactionTimestamp, getTransactionTimestampTemp } = require('./getTransTimeStamp');

// for wanchain
// (async () => {
//     try {
//         const urlConfig = require('../cfg/config').urlConfig;
//         const util = require('../util/util');
//         const network = "test";
//         const rpcUrl = urlConfig[network]['WAN'];
//         let retGetTransactionTimestamp = await getTransactionTimestamp(rpcUrl, ["0xf2e56f50bbb7fd1d8304e909b1226d70c21a3d8b9c2881247b1b705b9116f69d"])
//         console.log(`retGetTransactionTimestamp: ${util.stringifyObject(retGetTransactionTimestamp)}`);
//     } catch (error) {
//         console.log(`error: ${error}`);
//     }

// })();


// for other ARB
// (async () => {
//     try {
//         const urlConfig = require('../cfg/config').urlConfig;
//         const util = require('../util/util');
//         const network = "test";
//         const rpcUrl = urlConfig[network]['ARB'];
//         let retGetTransactionTimestamp = await getTransactionTimestamp(rpcUrl, ["0x22333add668d4053a79e346e62e2db1a68ccf6bf54763bfc4d5a332ae4d7efdc"])
//         console.log(`retGetTransactionTimestamp: ${util.stringifyObject(retGetTransactionTimestamp)}`);
//     } catch (error) {
//         console.log(`error: ${error}`);
//     }

// })();



(async () => {
    try {
        const urlConfig = require('../cfg/config').urlConfig;
        const util = require('../util/util');
        const network = "test";
        const rpcUrl = urlConfig[network]['WAN'];
        let retGetTransactionTimestamp = await getTransactionTimestampTemp(rpcUrl, "0xf2e56f50bbb7fd1d8304e909b1226d70c21a3d8b9c2881247b1b705b9116f69d")
        console.log(`retGetTransactionTimestamp: ${util.stringifyObject(retGetTransactionTimestamp)}`);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();