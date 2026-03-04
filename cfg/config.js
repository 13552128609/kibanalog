/*
only support ARB->wanchain
srcChain: ARB
dstChain: wanchain
*/

const apiKey = "6d2ab3e9ef104bb58df101a3c4509469";
var  config = {
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
      //"url": `https://arbitrum-sepolia.infura.io/v3/${apiKey}`, // arb
      "url": `https://arbitrum-sepolia-rpc.publicnode.com`, // arb
    },
    "dstChain":{
      //"url": `https://optimism-sepolia.infura.io/v3/${apiKey}`, // opt
      "url": `http://gwan-testnet.wandevs.org:36891`, // wanchain
    }
  }
}

var  urlConfig = {  
  "main": {
    "WAN":'`https://gwan-ssl.wandevs.org:56891`,',
    "ARB":'',
    "ADA":'',
    "OPT":''
  },
  "test":{
    "WAN":`http://gwan-ssl.wandevs.org:36891`,
    "ARB":`https://arbitrum-sepolia-rpc.publicnode.com`,
    "ADA":`https://preprod.koios.rest/api/v1`,
    "OPT":'',
  }
}

// var kibanaConfig = {
//     usename: 'wandevs',
//     password: 'wanswap20210401',
//     keywords: {
//       "main":{
//           successMpc:["SignMpcTransaction", "successfully","\"originChain\":\"ARB\"","\"chainType\":\"WAN\""],
//           recievedMpc:["@@@@@SignByApprove begin","\"originChain\":\"ARB\"","\"chainType\":\"WAN\""],
//           dstTxHashes:["checkTransOnline checkHash", "storeman0xb03a7416e0793e77169845ca81303781096e4c03"],
//           metrics:["ip-10-1-1-30", "cpu_usage", "cpu_cores", "mem_total", "mem_used", "mem_free", "disk_total", "disk_used", "disk_usage", "load_avg"],
//       },
//       "test":{
//           successMpc:["SignMpcTransaction", "successfully","\"originChain\":\"ARB\"","\"chainType\":\"WAN\""],          
//           recievedMpc:["@@@@@SignByApprove begin","\"originChain\":\"ARB\"","\"chainType\":\"WAN\""],
//           dstTxHashes:["checkTransOnline checkHash", "storeman0x5c770cbf582d770b93ca90adad7e6bd33fabc44c"],
//           metrics:["ip-10-1-1-30", "cpu_usage", "cpu_cores", "mem_total", "mem_used", "mem_free", "disk_total", "disk_used", "disk_usage", "load_avg"],
//       }
//     },
//     fromTime:'',
//     toTime:'',
//     size:'', 
// }

var kibanaConfig = {
    usename: 'wandevs',
    password: 'wanswap20210401',
    keywords: {
      "main":{
          successMpc:["SignMpcTransaction", "successfully"],
          recievedMpc:["@@@@@SignByApprove begin"],
          dstTxHashes:["checkTransOnline checkHash", "storeman0xb03a7416e0793e77169845ca81303781096e4c03"],
          metrics:["ip-10-1-1-30", "cpu_usage", "cpu_cores", "mem_total", "mem_used", "mem_free", "disk_total", "disk_used", "disk_usage", "load_avg"],
      },
      "test":{
          successMpc:["SignMpcTransaction", "successfully"],          
          recievedMpc:["@@@@@SignByApprove begin"],
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
    urlConfig,
    kibanaConfig,
    //kibanaAllConfig,
};
