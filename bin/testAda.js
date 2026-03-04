const axios = require('axios');

async function getBlockByHeight(height) {
  // 直接在 URL 中拼接，确保 eq. 格式正确
  const url = `https://preprod.koios.rest/api/v1/blocks?block_height=eq.${height}`;

  try {
    const response = await axios.get(url);
    
    if (response.data && response.data.length > 0) {
      console.log("查询成功:", response.data[0].block_time);
    } else {
      console.log("未发现该区块");
    }
  } catch (error) {
    // 打印详细的错误响应体，看看 Koios 到底在抱怨什么
    if (error.response) {
      console.error("状态码:", error.response.status);
      console.error("错误详情:", error.response.data); 
    } else {
      console.error("消息:", error.message);
    }
  }
}

getBlockByHeight(4469748); // 换一个确定存在的测试网块高试试
