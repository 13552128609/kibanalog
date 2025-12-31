const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../cfg/config')
const getCommonLogs = require('../common/getLogs').getCommonLogs;
const formatDateTime = require('../util/util').formatDateTime;

// Helper function to parse duration strings like "1m2s" to seconds

function parseDuration(durationStr) {
  if (!durationStr) return '0.000000';
  // Handle milliseconds (e.g., 775.484656ms)
  const millisMatch = durationStr.match(/(\d+\.?\d*)ms/);
  if (millisMatch) {
    return (parseFloat(millisMatch[1]) / 1000).toFixed(6);
  }
  // Handle seconds (e.g., 1.5s)
  const secondsMatch = durationStr.match(/(\d+\.?\d*)s/);
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]).toFixed(6);
  }
  // Handle minutes (e.g., 1m30s)
  const minutesMatch = durationStr.match(/(\d+)m/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    const secondsMatchAfterMin = durationStr.match(/(\d+\.?\d*)s/);
    const seconds = secondsMatchAfterMin ? parseFloat(secondsMatchAfterMin[1]) : 0;
    return (minutes * 60 + seconds).toFixed(6);
  }
  return '0.000000';
}

async function getLogs(net, keywords, query_period, size) {

  const resultDir = path.join(__dirname, '../result');
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }
  const filename = path.join(resultDir, `mpcsuccess_${net}_${formatDateTime()}.csv`);


  console.log(`net: ${net}`);
  console.log(`keywords: ${keywords}`);
  console.log(`query_period: ${query_period}`);
  console.log(`size: ${size}`);
  try {
    const logs = await getCommonLogs(net, keywords, query_period, size);
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


      results.push({
        timestamp,
        originTx: originTxMatch ? originTxMatch[1] : 'N/A',
        originBlock,
        hashData: hashDataMatch ? hashDataMatch[1] : 'N/A',
        during: duringMatch ? parseDuration(duringMatch[1]) : 'N/A',
        duringAct: duringActMatch ? parseDuration(duringActMatch[1]) : 'N/A',
        rawMessage: message
      });
    }

    // Generate CSV content    
    const csvHeader = 'Timestamp,OriginTx,OriginBlock,HashData,During(s),DuringAct(s),RawMessage\n';
    const csvRows = results.map(log => {
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.originTx}","${log.originBlock}","${log.hashData}","${log.during}","${log.duringAct}","${cleanMessage}"`;
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

module.exports = { scanMpcSuccess: getLogs };