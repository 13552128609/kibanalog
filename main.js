const axios = require('axios');

async function getLogs() {
  const url = 'http://log.wanchain.org:9200/_search?pretty';
  
  // 构造查询 DSL (Domain Specific Language)
  const queryData = {
    query: {
      match_all: {}
    },
    size: 5,
    sort: [{ "@timestamp": "desc" }]
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
    logs.forEach(log => console.log(log._source));
    
  } catch (error) {
    console.error('请求失败:', error.response ? error.response.data : error.message);
  }
}

getLogs();