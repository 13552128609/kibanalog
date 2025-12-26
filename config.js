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
      "url": `https://arbitrum-mainnet.infura.io/v3/${apiKey}`,
    },
    "dstChain":{
      "url": `https://optimism.infura.io/v3/${apiKey}`,
    }    
  },
  "test": {
    "srcChain":{
      "url": `https://arbitrum-sepolia.infura.io/v3/${apiKey}`,
    },
    "dstChain":{
      "url": `https://optimism-sepolia.infura.io/v3/${apiKey}`,
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
      },
      "test":{
          successMpc:["SignMpcTransaction", "successfully"],
          recievedMpc:[],
          dstTxHashes:["checkTransOnline checkHash", "storeman0x5c770cbf582d770b93ca90adad7e6bd33fabc44c"],
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
