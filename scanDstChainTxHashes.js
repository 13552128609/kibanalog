// 根据src chain的hash 找到目标链上的hash
// "checkTransOnline checkHash"  AND "0x8e8be38f61ec40c943fa49e8bd5e4235e5eb976b9d9f69aff2e90f59cbd48f93"

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config').config;
const network = config.network;
const kibanaConfig = require('./config').kibanaConfig;

console.log(`network.....: ${network}`);
console.log(`config.....: ${config}`);
console.log(`kibanaConfig.....: ${kibanaConfig}`);



const filename=`./result/logs_${network}_dstChainTxHashes.csv`;

async function getLogs(net, keywords, query_period, size) {
  const url = 'http://log.wanchain.org:9200/_search?pretty';
  const queryData = {
    size: size,
    sort: [{ "@timestamp": { "order": "desc" } }],
    query: {
      bool: {
        must: [          
          { match_phrase: { "type": net } },          
        ],
        filter: [{
          range: {
            "@timestamp": {
              "gte": `now-${query_period}s`,
              "lte": "now"
            }
          }
        }]
      }
    }
  };
  
  for(let keyword of keywords){
      queryData.query.bool.must.push({ match_phrase: { "message": keyword } });
  }

  try {
    const response = await axios.post(url, queryData, {
      auth: {
        username: kibanaConfig.usename,
        password: kibanaConfig.password,
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const logs = response.data.hits.hits;
    const results = [];

    // Process each log entry
    for (const log of logs) {
      const message = log._source.message;
      const timestamp = log._source['@timestamp'];
      // Extract fields using regex

      const originTxMatch = message.match(/checkTransOnline checkHash[^\w]*(0x[0-9a-fA-F]+)/);
      const dstTxHash = message.match(/storemanLockTxHash\s+(0x[0-9a-fA-F]+)/);
      
      
      // Get the on-chain timestamp      
      results.push({
        timestamp,
        originTx: originTxMatch ? originTxMatch[1] : 'N/A',
        dstTxHash:dstTxHash ? dstTxHash[1] : 'N/A',
        rawMessage: message
      });
    }

    // Generate CSV content    
    const csvHeader = 'Timestamp,OriginTx,dstTxHash,RawMessage\n';
    const csvRows = results.map(log => {
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.originTx}","${log.dstTxHash}","${cleanMessage}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file    
    fs.writeFileSync(filename, csvContent);

    console.log(`Found ${logs.length} logs. Data saved to ${filename}`);
    return results;

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Example usage

/*getLogs(network, ["checkTransOnline checkHash", "0x8e8be38f61ec40c943fa49e8bd5e4235e5eb976b9d9f69aff2e90f59cbd48f93"], 86400, 1)
  .catch(console.error);*/
  
  console.log(`keywords: ${kibanaConfig}`);
getLogs(network, kibanaConfig.keywords[network].dstTxHashes, 86400, 1)
  .catch(console.error);