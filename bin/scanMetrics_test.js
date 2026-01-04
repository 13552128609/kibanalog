
const scanMetrics = require('./scanMetrics').scanMetrics;
console.log("1");
(async () => {
    try {
        const config = require('../cfg/config').config;
        const kibanaConfig = require('../cfg/config').kibanaConfig;
        const network = "test";
        console.log("2");
        console.log(`network: ${network}`);
        console.log(`keywords: ${kibanaConfig.keywords[network].metrics}`);
        const fromDateTime = '2025-12-30T00:00:00Z';
        const toDateTime = '2025-12-31T23:59:59Z';
        let ret = await scanMetrics(network, kibanaConfig.keywords[network].metrics, fromDateTime, toDateTime, 1);
        console.log('Results:', ret);
    } catch (error) {
        console.log(`error: ${error}`);
    }

})();