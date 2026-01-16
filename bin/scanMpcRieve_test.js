const scanMpcRieve = require('./scanMpcRieve').scanMpcRieve;
console.log("scanMpcRieve:", scanMpcRieve);
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
        console.log(`keywords: ${kibanaConfig.keywords[network].recievedMpc}`);        
        const fromDateTime = '2026-01-05T00:00:00Z';
        const toDateTime = '2026-01-05T23:59:59Z';
        let ret = await scanMpcRieve(network, kibanaConfig.keywords[network].recievedMpc, fromDateTime, toDateTime,100);
        console.log('Results:', ret);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();