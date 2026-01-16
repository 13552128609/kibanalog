const fs = require('fs');
const path = require('path');
const config = require('../cfg/config');
const getCommonLogs = require('../common/getLogs').getCommonLogs;
const formatDateTime = require('../util/util').formatDateTime;

async function getLogs(net, keywords, fromDateTime, toDateTime, size) {
  const resultDir = path.join(__dirname, '../result');
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }
  const filename = path.join(resultDir, `mpc_rieve_${net}_${formatDateTime()}.csv`);

  console.log(`net: ${net}`);
  console.log(`keywords: ${keywords}`);
  console.log(`fromDateTime: ${fromDateTime}`);
  console.log(`toDateTime: ${toDateTime}`);
  console.log(`size: ${size}`);

  try {
    const logs = await getCommonLogs(net, keywords, fromDateTime, toDateTime, size);
    const results = [];
    const seenOriginTxs = new Set(); // To track unique originTx values

    // Process each log entry
    for (const log of logs) {
      const message = log._source.message;
      const timestamp = log._source['@timestamp'];
      
      // Extract fields using regex
      const hashXMatch = message.match(/"hashX":"(0x[a-fA-F0-9]+)"/);
      const originTxMatch = message.match(/"originTx":"(0x[a-fA-F0-9]+)"/);
      const originBlockMatch = message.match(/"originBLock":(\d+)/);
      const rcvTimeMatch = message.match(/rcvTime=([^\s]+)/);
      const workingAddressMatch = message.match(/workingAddress\s*=\s*(0x[a-fA-F0-9]+)/);

      const originTx = originTxMatch ? originTxMatch[1] : null;
      
      // Skip if originTx is missing or already seen
      if (!originTx || seenOriginTxs.has(originTx)) {
        continue;
      }
      
      // Add to seen set and results
      seenOriginTxs.add(originTx);
      results.push({
        timestamp,
        hashX: hashXMatch ? hashXMatch[1] : 'N/A',
        originTx,
        originBlock: originBlockMatch ? originBlockMatch[1] : 'N/A',
        rcvTime: rcvTimeMatch ? rcvTimeMatch[1] : 'N/A',
        workingAddress: workingAddressMatch ? workingAddressMatch[1] : 'N/A',
        rawMessage: message
      });
    }

    // Generate CSV content
    const csvHeader = 'Timestamp,HashX,OriginTx,OriginBlock,ReceiveTime,WorkingAddress,RawMessage\n';
    const csvRows = results.map(log => {
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.hashX}","${log.originTx}","${log.originBlock}","${log.rcvTime}","${log.workingAddress}","${cleanMessage}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file
    fs.writeFileSync(filename, csvContent);

    console.log(`Found ${logs.length} logs, ${results.length} unique entries. Data saved to ${filename}`);
    return results;

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { scanMpcRieve: getLogs };