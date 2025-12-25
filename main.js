const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getLogs(net, keywords, query_period) {
  const url = 'http://log.wanchain.org:9200/_search?pretty';
  const queryData = {
    size: 200,
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
      const hashXMatch = message.match(/pk:\s*(0x[a-fA-F0-9]+)/);
      const hashDataMatch = message.match(/HashData:\s*(0x[a-fA-F0-9]+)/);
      const duringMatch = message.match(/during\(sec\)=([\d.]+)s/);
      const duringActMatch = message.match(/duringAct\(sec\)=([\d.]+)s/);

      results.push({
        timestamp,
        hashX: hashXMatch ? hashXMatch[1] : 'N/A',
        hashData: hashDataMatch ? hashDataMatch[1] : 'N/A',
        during: duringMatch ? duringMatch[1] : 'N/A',
        duringAct: duringActMatch ? duringActMatch[1] : 'N/A',
        rawMessage: message
      });
    });

    // Generate CSV content
    const csvHeader = 'Timestamp,HashX,HashData,During(s),DuringAct(s),RawMessage\n';
    const csvRows = results.map(log => {
      // Replace newlines in the message with a space to prevent line breaks in CSV
      const cleanMessage = log.rawMessage.replace(/\n/g, '').replace(/"/g, '""');
      return `"${log.timestamp}","${log.hashX}","${log.hashData}","${log.during}","${log.duringAct}","${cleanMessage}"`;
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
getLogs("main", ["SignMpcTransaction", "successfully"], 86400)
  .catch(console.error);