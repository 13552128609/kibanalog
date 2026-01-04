const config = require('../cfg/config').config;
const kibanaConfig = require('../cfg/config').kibanaConfig;
const axios = require('axios');
const util = require('../util/util');

async function getCommonLogs(net, keywords, formatDateTime,toDateTime, size) {
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
              "gte": `${formatDateTime}`,
              "lte": `${toDateTime}`
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
    return logs;

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}
module.exports = { getCommonLogs };