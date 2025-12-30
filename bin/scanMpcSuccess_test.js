const scanMpcSuccess = require('./scanMpcSuccess').scanMpcSuccess;
const config = require('../cfg/config').config;
const kibanaConfig = require('../cfg/config').kibanaConfig;
console.log("1");
(async () => {
    try {
        const config = require('../cfg/config').config;
        const kibanaConfig = require('../cfg/config').kibanaConfig;
        const network = "test";
        console.log("2");
        console.log(`network: ${network}`);
        console.log(`keywords: ${kibanaConfig.keywords[network].successMpc}`);        
        let ret = await scanMpcSuccess(network, kibanaConfig.keywords[network].successMpc, 86400, 1);
        console.log('Results:', ret);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();