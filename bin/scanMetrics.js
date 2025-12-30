// 根据src chain的hash 找到目标链上的hash
// "checkTransOnline checkHash"  AND "0x8e8be38f61ec40c943fa49e8bd5e4235e5eb976b9d9f69aff2e90f59cbd48f93"

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config').config;
const network = config.network;
const kibanaConfig = require('./config').kibanaConfig;
const util = require('./util/util');

console.log(`network.....: ${network}`);
console.log(`config.....: ${config}`);
console.log(`kibanaConfig.....: ${kibanaConfig}`);



const filename = `./result/logs_${network}_metrics.csv`;

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

  for (let keyword of keywords) {
    queryData.query.bool.must.push({ match_phrase: { "message": keyword } });
  }

  console.log(`queryData: ${util.stringifyObject(queryData)}`);
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
      console.log('Raw message:', message);  // Add this before the metrics extraction           
      const metrics = {
        cpu_usage: message.match(/cpu_usage=([\d.]+)%/)?.[1] || 'N/A',
        cpu_cores: message.match(/cpu_cores=(\d+)/)?.[1] || 'N/A',
        mem_total: message.match(/mem_total=(\d+)MB/)?.[1] || 'N/A',
        mem_used: message.match(/mem_used=(\d+)MB/)?.[1] || 'N/A',
        mem_free: message.match(/mem_free=(\d+)MB/)?.[1] || 'N/A',
        disk_total: message.match(/disk_total=(\d+[GMK]?B?)/)?.[1] || 'N/A',
        disk_used: message.match(/disk_used=(\d+[GMK]?B?)/)?.[1] || 'N/A',
        disk_usage: message.match(/disk_usage=(\d+%)/)?.[1] || 'N/A',
        load_avg: message.match(/load_avg=([\d.]+)/)?.[1] || 'N/A'
      };
      console.log('Extracted metrics:', JSON.stringify(metrics, null, 2));  // Add this after

      results.push({
        timestamp,
        ...metrics,
        rawMessage: message
      });


    }

    // Generate CSV content    
    const csvHeader = 'Timestamp,CPU Usage (%),CPU Cores,Memory Total (MB),Memory Used (MB),Memory Free (MB),Disk Total,Disk Used,Disk Usage,Load Average,RawMessage\n';
    const csvRows = results.map(log => {
      const cleanMessage = log.rawMessage.replace(/\n/g, ' ').replace(/"/g, "'");
      return `"${log.timestamp}","${log.cpu_usage}","${log.cpu_cores}","${log.mem_total}","${log.mem_used}","${log.mem_free}","${log.disk_total}","${log.disk_used}","${log.disk_usage}","${log.load_avg}","${cleanMessage}"`;
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

console.log(`keywords: ${kibanaConfig}`);
// getLogs(network, kibanaConfig.keywords[network].metrics, 86400, 1)
//   .catch(console.error);

getLogs('test', kibanaConfig.keywords['test'].metrics, 86400, 1)
  .catch(console.error);