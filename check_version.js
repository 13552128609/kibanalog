
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { config } = require('./cfg/config');
const { getCommonLogs } = require('./common/getLogs');

const SMG_CONTRACT_ADDRESS = '0x1E7450D5d17338a348C5438546f0b4D0A5fbeaB6';
const SMG_ABI_PATH = path.join(__dirname, './abi/abi.smg.json');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCommonLogsWithRetry({ logType, keywords, fromDateTime, toDateTime, size, retries = 5 }) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await getCommonLogs(logType, keywords, fromDateTime, toDateTime, size);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }
  throw lastErr;
}

async function runWithRetry(fn, retries = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }
  throw lastErr;
}

function toIso(dt) {
  if (dt instanceof Date) return dt.toISOString();
  return new Date(dt).toISOString();
}

function defaultFromTo() {
  const to = new Date();
  const from = new Date(to.getTime() - 14* 24 * 60 * 60 * 1000);  //14天
  return { from: toIso(from), to: toIso(to) };
}

function tryParseBytes32(grpName) {
  if (typeof grpName !== 'string' || grpName.length === 0) {
    throw new Error('grpName is empty');
  }

  if (/^0x[0-9a-fA-F]{64}$/.test(grpName)) {
    return [grpName];
  }

  let ethers;
  try {
    ({ ethers } = require('ethers'));
  } catch (e) {
    throw new Error('Missing dependency: ethers. Please run `npm install` (or `npm i ethers`) before using --grpName as a string.');
  }

  const candidates = [];
  try {
    candidates.push(ethers.id(grpName));
  } catch (_) {}
  try {
    candidates.push(ethers.encodeBytes32String(grpName));
  } catch (_) {}

  return [...new Set(candidates)];
}

async function getWorkingAddresses({ network, grpName, rpc }) {
  let ethers;
  try {
    ({ ethers } = require('ethers'));
  } catch (e) {
    throw new Error('Missing dependency: ethers. Please run `npm install` (or `npm i ethers`) to enable reading SMG contract and fetching workingAddresses.');
  }

  const rpcUrl = rpc || config?.[network]?.dstChain?.url;
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL. Provide --rpc or set cfg/config.js config[${network}].dstChain.url`);
  }
  if (!fs.existsSync(SMG_ABI_PATH)) {
    throw new Error(`SMG ABI not found: ${SMG_ABI_PATH}`);
  }

  const abi = JSON.parse(fs.readFileSync(SMG_ABI_PATH, 'utf8'));
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const smg = new ethers.Contract(SMG_CONTRACT_ADDRESS, abi, provider);

  const grpIdCandidates = tryParseBytes32(grpName);
  let lastErr;
  for (const groupId of grpIdCandidates) {
    try {
      console.log(`groupId=${groupId}`);
      const addrs = await smg.getSelectedStoreman(groupId);
      if (Array.isArray(addrs) && addrs.length > 0) {
        return addrs.map(a => a.toLowerCase());
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (lastErr) {
    throw lastErr;
  }
  return [];
}

async function checkUpgradeForAddress({ logType, wkAddr, version, fromDateTime, toDateTime, size }) {
  const keywords = [
    `storeman${wkAddr}`,
    `storeman agent version ${version}`,
    'start with process.cwd!'
  ];

  console.log(`logType=${logType} fromDateTime=${fromDateTime} toDateTime=${toDateTime} size=${size}`);
  console.log(`keywords=${JSON.stringify(keywords)}`);
  const logs = await getCommonLogsWithRetry({
    logType,
    keywords,
    fromDateTime,
    toDateTime,
    size,
    retries: 5,
  });

  const len = Array.isArray(logs) ? logs.length : 0;
  console.log(`logs.length=${len}`);
  if (Array.isArray(logs)) {
    for (const log of logs) {
      const ts = log?._source?.['@timestamp'];
      const msg = log?._source?.message;
      console.log(`log: ${ts} ${msg}`);
    }
  } else {
    console.log(`logs=${JSON.stringify(logs)}`);
  }
  return Array.isArray(logs) && logs.length > 0;
}

async function main() {
  const defaults = defaultFromTo();

  program
    .requiredOption('--version <version>', 'Target storeman agent version, e.g. 3.23.0')
    .requiredOption('--grpName <grpName>', 'Storeman group name, e.g. Aries_069 or bytes32 hex')
    .option('-n, --network <network>', 'Network type (main or test)', 'main')
    .option('--rpc <url>', 'Override JSON-RPC URL (default uses cfg/config.js config[network].dstChain.url)')
    .option('--logType <type>', 'Kibana log "type" field to match', 'main')
    .option('-f, --fromDateTime <iso>', 'From datetime (ISO8601)', defaults.from)
    .option('-t, --toDateTime <iso>', 'To datetime (ISO8601)', defaults.to)
    .option('--size <n>', 'Kibana query size', '10')
    .parse(process.argv);

  const argv = program.opts();
  const size = Number(argv.size);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`Invalid --size: ${argv.size}`);
  }

  const workingAddresses = await getWorkingAddresses({
    network: argv.network,
    grpName: argv.grpName,
    rpc: argv.rpc,
  });

  if (!workingAddresses.length) {
    console.log(`No workingAddresses found for grpName=${argv.grpName} on network=${argv.network}`);
    return;
  }

  for (const wkAddr of workingAddresses) {
    console.log(wkAddr);
  }

  const notUpgraded = [];
  let idx = 0;
  for (const wkAddr of workingAddresses) {
    let upgraded = false;
    try {
      upgraded = await runWithRetry(() => checkUpgradeForAddress({
        logType: argv.logType,
        wkAddr,
        version: argv.version,
        fromDateTime: argv.fromDateTime,
        toDateTime: argv.toDateTime,
        size,
      }), 5);
    } catch (e) {
      upgraded = false;
    }

    if (!upgraded) {
      notUpgraded.push({ contractIndex: idx, wkAddr });
    }

    idx += 1;
  }

  if (notUpgraded.length === 0) {
    console.log('All nodes upgraded successfully.');
    return;
  }

  for (const item of notUpgraded) {
    console.log(`\x1b[1m\x1b[31mNOT_UPGRADED\x1b[0m index=${item.contractIndex} \x1b[1m\x1b[31m${item.wkAddr}\x1b[0m`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


// node check_version.js --version 3.23.0 --grpName 0x000000000000000000000000000000000000000000000041726965735f303639
