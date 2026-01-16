const scanMpcSuccess = require('./scanMpcSuccess').scanMpcSuccess;
const config = require('../cfg/config').config;
const kibanaConfig = require('../cfg/config').kibanaConfig;
console.log("1");
(async () => {
    try {
        const config = require('../cfg/config').config;
        const kibanaConfig = require('../cfg/config').kibanaConfig;
        //const network = "test";
        const network = "debug";
        console.log("2");
        console.log(`network: ${network}`);
        //console.log(`keywords: ${kibanaConfig.keywords[network].successMpc}`);
        console.log(`keywords: ${kibanaConfig.keywords["test"].successMpc}`);
        const fromDateTime = '2026-01-05T00:00:00Z';
        const toDateTime = '2026-01-06T23:59:59Z';
        //let ret = await scanMpcSuccess(network, kibanaConfig.keywords[network].successMpc, fromDateTime, toDateTime,1);
        let ret = await scanMpcSuccess(network, kibanaConfig.keywords["test"].successMpc, fromDateTime, toDateTime,1);
        console.log('Results:', ret);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();