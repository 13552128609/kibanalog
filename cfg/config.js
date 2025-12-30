/*
only support ARB->OPT
srcChain: ARB
dstChain: OPT
*/

const apiKey = "6d2ab3e9ef104bb58df101a3c4509469";
const  config = {
  "network":"main",  
  "main": {
    "srcChain":{
      "url": `https://arbitrum-mainnet.infura.io/v3/${apiKey}`, // arb
    },
    "dstChain":{
        //"url": `https://optimism.infura.io/v3/${apiKey}`, // opt
        "url": `https://gwan-ssl.wandevs.org:56891`, // wanchain`, // wanchain
    }    
  },
  "test": {
    "srcChain":{
      "url": `https://arbitrum-sepolia.infura.io/v3/${apiKey}`, // arb
    },
    "dstChain":{
      //"url": `https://optimism-sepolia.infura.io/v3/${apiKey}`, // opt      
      "url": `http://gwan-testnet.wandevs.org:36891`, // wanchain
    }
  }
}

var kibanaConfig = {
    usename: 'wandevs',
    password: 'wanswap20210401',
    keywords: {
      "main":{
          successMpc:["SignMpcTransaction", "successfully"],
          recievedMpc:[],
          dstTxHashes:["checkTransOnline checkHash", "storeman0xb03a7416e0793e77169845ca81303781096e4c03"],
          metrics:["ip-10-1-1-30", "cpu_usage", "cpu_cores", "mem_total", "mem_used", "mem_free", "disk_total", "disk_used", "disk_usage", "load_avg"],
      },
      "test":{
          successMpc:["SignMpcTransaction", "successfully"],
          recievedMpc:[],
          dstTxHashes:["checkTransOnline checkHash", "storeman0x5c770cbf582d770b93ca90adad7e6bd33fabc44c"],
          metrics:["ip-10-1-1-30", "cpu_usage", "cpu_cores", "mem_total", "mem_used", "mem_free", "disk_total", "disk_used", "disk_usage", "load_avg"],
      }
    },
    fromTime:'',
    toTime:'',
    size:'', 
}
module.exports = {
    config,
    kibanaConfig
};
