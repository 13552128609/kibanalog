const axios = require('axios');

async function getLogs(net, message, query_period) {
  const url = 'http://log.wanchain.org:9200/_search?pretty';
  // // 构造查询 DSL (Domain Specific Language)
  const queryData = {
    size: 2, // 返回最近的 20 条
    sort: [
      { "@timestamp": { "order": "desc" } } // 按时间倒序
    ],
    query: {
      bool: {
        // must: 关键词匹配 (会计算相关性权重)
        must: [
          {
            match_phrase: { 
              "message": "SignMpcTransaction" // 匹配短语，比 match 更精确
            },
            
          },
          {
            match_phrase: { "type": "test" } 
          },
          {
            match_phrase: { "message": "error" }
          }
        ],
        // filter: 范围过滤 (不计算评分，速度快，支持缓存)
        filter: [
          {
            range: {
              "@timestamp": {
                "gte": "now-24h", // gte: 大于等于；now-1h 表示 1 小时前
                "lte": "now"    // lte: 小于等于
              }
            }
          }
        ]
      }
    }
  };



// const queryData = {
//         "query": {
//             "bool": {
//                 "must": [
//                     {"match_phrase":{"type":net}},
//                     //{"match_phrase":{"message": message}},
//                     //{"match_phrase": {"message": tansaction}}

//                 ],
//                 "filter": [
//                     {"range": {"@timestamp": {"gte": `now-${query_period}s"`}}}
//                 ]
//             }
//         },
//         //"from":0,
//         "size":1,
//         "sort": [
//             {
//                 "@timestamp": {
//                     "order": "desc",
//                     "unmapped_type": "long"
//                 }
//             }
//         ],
//         //"_source": {"include": ["type", "@timestamp","message"]}
//     }

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

getLogs("main","SignMpcTransaction",86400);