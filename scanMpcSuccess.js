const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config')
const network = config.network;

const filename=`./result/logs_${network}_mpcsuccess.csv`;

// Helper function to parse duration strings like "1m2s" to seconds
function parseDuration(durationStr) {
  if (!durationStr) return 'N/A';

  // Handle XmYs format (e.g., 1m2s)
  const minutesMatch = durationStr.match(/(\d+)m/);
  const secondsMatch = durationStr.match(/(\d+\.?\d*)s/);

  let totalSeconds = 0;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseFloat(secondsMatch[1]);

  return totalSeconds.toFixed(6); // Keep 6 decimal places for consistency
}


async function getTransactionTimestamp(originBlock) {
  const blockNumber = originBlock.toString().slice(0,2).toUpperCase() !== '0X' ? '0x' + originBlock.toString(16) : originBlock;
  console.log(`originBlock: ${originBlock}`);    
    console.log(`blockNumber: ${blockNumber}`);
  try {   
    
      const blockResponse = await axios.post(config[network].srcChain.url, {
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",        
        params: [0x01, false],
        id: 1
      });

      if (blockResponse.data.result) {
        return new Date(parseInt(blockResponse.data.result.timestamp) * 1000).toISOString();
      }   
    
  } catch (error) {
    //console.error(`Error fetching timestamp for block ${blockNumber}:`, error.message);
    console.error(`Error fetching timestamp for block ${blockNumber}:`, error);
    return 'N/A';
  }
}


async function getLogs(net, keywords, query_period, size) {
  const url = 'http://log.wanchain.org:9200/_search?pretty';
  const queryData = {
    size: size,
    sort: [{ "@timestamp": { "order": "desc" } }],
    query: {
      bool: {
        must: [
          { match_phrase: { "message": keywords[0] } },
          { match_phrase: { "type": net } },
          { match_phrase: { "message": keywords[1] } }
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

  try {
    const response = await axios.post(url, queryData, {
      auth: {
        username: 'wandevs',
        password: 'wanswap20210401'
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
      const originTxMatch = message.match(/"originTx"\s*:\s*"(0x[a-fA-F0-9]+)"/);
      const hashDataMatch = message.match(/HashData:\s*(0x[a-fA-F0-9]+)/);
      const duringMatch = message.match(/during\(sec\)=([\d.m]+s?)/);
      const duringActMatch = message.match(/duringAct\(sec\)=([\d.m]+s?)/);
      
      const originBlockMatch = message.match(/"originBLock":\s*(\d+)/);
      const originBlock = originBlockMatch ? originBlockMatch[1] : 'N/A';

      // Get the on-chain timestamp
      const onChainTimestamp = originBlockMatch ? await getTransactionTimestamp(originBlock) : 'N/A';
      results.push({
        timestamp,
        originTx: originTxMatch ? originTxMatch[1] : 'N/A',
        originBlock,
        onChainTimestamp,
        hashData: hashDataMatch ? hashDataMatch[1] : 'N/A',
        during: duringMatch ? parseDuration(duringMatch[1]) : 'N/A',
        duringAct: duringActMatch ? parseDuration(duringActMatch[1]) : 'N/A',
        rawMessage: message
      });
    }

    // Generate CSV content    
    const csvHeader = 'Timestamp,OriginTx,OriginBlock,OnChainTimestamp,HashData,During(s),DuringAct(s),RawMessage\n';
    const csvRows = results.map(log => {
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.originTx}","${log.originBlock}","${log.onChainTimestamp}","${log.hashData}","${log.during}","${log.duringAct}","${cleanMessage}"`;
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
getLogs("main", ["SignMpcTransaction", "successfully"], 86400, 1)
  .catch(console.error);