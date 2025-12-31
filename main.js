#!/usr/bin/env node

const { program } = require('commander');
const { scanMpcSuccess } = require('./bin/scanMpcSuccess');
const { scanDstChainTxHashes } = require('./bin/scanDstChainTxHashes');
const { getTransactionTimestamp } = require('./common/getTransTimeStamp');
const fs = require('fs');
const path = require('path');
const config = require('./cfg/config').config;
const kibanaConfig = require('./cfg/config').kibanaConfig;

// Update the command line argument parsing
program
  .option('-n, --network <type>', 'Network type (main or test)', 'test')
  .parse(process.argv);

// Get the network value correctly
const options = program.opts();
config.network = options.network || 'test';  // Default to 'test' if not provided
console.log(`Using network: ${config.network}`);

console.log(`config:`, config);  // Log the entire config object for debugging
// The network configuration is directly under config[network], not config[config.network]


// Main function
async function main() {
  try {
    // 2.1 Get OriginTx list using scanMpcSuccess
    console.log('Fetching MPC success transactions...');
    const mpcResults = await scanMpcSuccess(
      config.network,
      kibanaConfig.keywords[config.network].successMpc,
      86400, // 24 hours
      100    // Limit to 100 results
    );

    if (!mpcResults || mpcResults.length === 0) {
      console.log('No MPC success transactions found.');
      return;
    }

    const originTxs = mpcResults.map(tx => tx.originTx).filter(tx => tx !== 'N/A');
    console.log(`Found ${originTxs.length} valid origin transactions`);

    // 2.2 Get origin transaction timestamps
    console.log('Fetching origin transaction timestamps...');
    let network = config.network
    const originTxWithTimestamps = await getTransactionTimestamps(
      config[network].srcChain.url,
      originTxs
    );

    // 2.3 Get destination transaction hashes
    console.log('Fetching destination transaction hashes...');
    const dstTxHashes = await scanDstChainTxHashes(
      config.network,
      kibanaConfig.keywords[config.network].dstTxHashes,
      86400, // 24 hours
      100    // Limit to 100 results
    );

    // 2.4 Get destination transaction timestamps
    console.log('Fetching destination transaction timestamps...');
    const dstTxWithTimestamps = await getTransactionTimestamps(
      config[config.network].dstChain.url,
      dstTxHashes.map(tx => tx.dstTxHash).filter(hash => hash !== 'N/A')
    );

    // 2.5 Combine all data
    console.log('Combining transaction data...');
    const combinedData = combineTransactionData(
      mpcResults,
      originTxWithTimestamps,
      dstTxHashes,
      dstTxWithTimestamps
    );

    // Write results to file
    const resultDir = path.join(__dirname, 'result');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    const outputFile = path.join(resultDir, `transactions_${config.network}_${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));

    console.log(`Transaction data saved to: ${outputFile}`);

  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Helper function to get transaction timestamps in batches
async function getTransactionTimestamps(rpcUrl, txHashes, batchSize = 50) {
  const results = {};
  for (let i = 0; i < txHashes.length; i += batchSize) {
    const batch = txHashes.slice(i, i + batchSize);
    const timestamps = await getTransactionTimestamp(rpcUrl, batch, batchSize);

    // Map timestamps to their transaction hashes
    timestamps.forEach((tx, index) => {
      if (tx && tx.txHash) {
        results[tx.txHash] = tx.timestamp;
      }
    });

    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < txHashes.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return results;
}

// Helper function to combine all transaction data
function combineTransactionData(mpcResults, originTimestamps, dstTxHashes, dstTimestamps) {
  const result = {};

  // Create a map of originTx to dstTxHash
  const originToDstMap = {};
  dstTxHashes.forEach(tx => {
    if (tx.originTx && tx.dstTxHash && tx.dstTxHash !== 'N/A') {
      originToDstMap[tx.originTx] = tx.dstTxHash;
    }
  });

  // Combine all data
  mpcResults.forEach(tx => {
    if (tx.originTx && tx.originTx !== 'N/A') {
      const dstTxHash = originToDstMap[tx.originTx] || 'N/A';

      // Convert timestamp to seconds if it's a valid date string
      let txTimestamp = 'N/A';
      if (tx.timestamp) {
        try {
          txTimestamp = Math.floor(new Date(tx.timestamp).getTime() / 1000).toString();
        } catch (e) {
          console.warn(`Invalid timestamp for tx ${tx.originTx}: ${tx.timestamp}`);
        }
      }
      // TS means timestamp in seconds
      result[tx.originTx] = {
        originTx: tx.originTx,
        dstTxHash: dstTxHash,
        crossStartTS: originTimestamps[tx.originTx] || 'N/A',
        crossEndTS: dstTxHash !== 'N/A' ? (dstTimestamps[dstTxHash] || 'N/A') : 'N/A',

        // 整个跨链时长
        crossDuring: (() => {
          const originTs = originTimestamps[tx.originTx];
          const dstTs = dstTxHash !== 'N/A' ? dstTimestamps[dstTxHash] : null;
          return originTs && originTs !== 'N/A' && dstTs && dstTs !== 'N/A'
            ? Math.round(parseInt(dstTs) - parseInt(originTs)).toString()
            : 'N/A';
        })(),
        MpcRecieveTS: txTimestamp !== 'N/A' && tx.during !== 'N/A'
          ? Math.round(parseInt(txTimestamp) - parseFloat(tx.during)).toString()
          : 'N/A',
        MpcReturnTS: txTimestamp,  // Add the timestamp from mpcResults (in seconds)        

        // mpc签名时长（包括等待approve时长）
        MpcSignDuring: tx.during,
        
        // mpc净签名时长
        MpcSignDuringAct: tx.duringAct,

        // 凑够theshold个approve的时长
        AgentApproveDuring: tx.during !== 'N/A' && tx.duringAct !== 'N/A'
          ? Math.round(parseInt(tx.during) - parseFloat(tx.duringAct)).toString()
          : 'N/A',

        // Agent请求签名时长 (从原链lock到发起mpc签名)
        AgentReqSignDuring: (() => {
          const crossStart = originTimestamps[tx.originTx];
          const mpcRecieve = txTimestamp !== 'N/A' && tx.during !== 'N/A'
            ? Math.round(parseInt(txTimestamp) - parseFloat(tx.during))
            : null;
          return crossStart && crossStart !== 'N/A' && mpcRecieve
            ? Math.max(0, parseInt(mpcRecieve) - parseInt(crossStart)).toString()
            : 'N/A';
        })(),
        rawMessage: tx.rawMessage
      };
    }
  });

  return Object.values(result);
}

// Run the main function
main();

//node main.js -n test