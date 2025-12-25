const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    logs.forEach(log => {
      const message = log._source.message;
      const timestamp = log._source['@timestamp'];

      // Extract fields using regex
      const originTxMatch = message.match(/"originTx"\s*:\s*"(0x[a-fA-F0-9]+)"/);
      const hashDataMatch = message.match(/HashData:\s*(0x[a-fA-F0-9]+)/);
      const duringMatch = message.match(/during\(sec\)=([\d.m]+s?)/);
      const duringActMatch = message.match(/duringAct\(sec\)=([\d.m]+s?)/);

      results.push({
        timestamp,
        originTx: originTxMatch ? originTxMatch[1] : 'N/A',
        hashData: hashDataMatch ? hashDataMatch[1] : 'N/A',
        during: duringMatch ? parseDuration(duringMatch[1]) : 'N/A',
        duringAct: duringActMatch ? parseDuration(duringActMatch[1]) : 'N/A',
        rawMessage: message
      });
    });

    // Generate CSV content    
    const csvHeader = 'Timestamp,OriginTx,HashData,During(s),DuringAct(s),RawMessage\n';
    const csvRows = results.map(log => {
      // Replace newlines in the message with a space to prevent line breaks in CSV
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.originTx}","${log.hashData}","${log.during}","${log.duringAct}","${cleanMessage}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file
    const filename = `logs_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
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