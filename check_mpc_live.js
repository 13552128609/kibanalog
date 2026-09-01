
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { config } = require('./cfg/config');
const { getCommonLogs } = require('./common/getLogs');

const SMG_CONTRACT_ADDRESS = '0x1E7450D5d17338a348C5438546f0b4D0A5fbeaB6';
const SMG_ABI_PATH = path.join(__dirname, './abi/abi.smg.json');

function toIso(dt) {
  if (dt instanceof Date) return dt.toISOString();
  return new Date(dt).toISOString();
}

function defaultFromTo() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 60 * 1000);
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

function shortAddr(addr) {
  if (typeof addr !== 'string') return String(addr);
  const a = addr.toLowerCase();
  if (!a.startsWith('0x') || a.length < 10) return addr;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function buildKeywords(wkAddr) {
  return [
    'mpcHeartBeat[mpc working]',
    `workingAddress =${shortAddr(wkAddr)}`
  ];
}

async function checkMpcLiveForAddress({ logType, wkAddr, fromDateTime, toDateTime, size, allowEmpty }) {
  const keywords = buildKeywords(wkAddr);

  console.log(`logType=${logType} fromDateTime=${fromDateTime} toDateTime=${toDateTime} size=${size}`);
  console.log(`keywords=${JSON.stringify(keywords)}`);
  const logs = await getCommonLogs(logType, keywords, fromDateTime, toDateTime, size);

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

  if (allowEmpty) {
    return true;
  }
  return Array.isArray(logs) && logs.length > 0;
}

async function main() {
  const defaults = defaultFromTo();

  program
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

  const notWorking = [];
  let idx = 0;
  for (const wkAddr of workingAddresses) {
    let working = false;
    const keywords = buildKeywords(wkAddr);
    try {
      working = await checkMpcLiveForAddress({
        logType: argv.logType,
        wkAddr,
        fromDateTime: argv.fromDateTime,
        toDateTime: argv.toDateTime,
        size,
        allowEmpty: idx === 0,
      });
    } catch (e) {
      working = false;
    }

    if (!working) {
      notWorking.push({ wkAddr, keywords });
    }

    idx += 1;
  }

  if (notWorking.length === 0) {
    console.log('All nodes are working.');
    return;
  }

  for (const item of notWorking) {
    console.log(`\x1b[1m\x1b[31mNOT_WORKING\x1b[0m \x1b[1m\x1b[31m${item.wkAddr}\x1b[0m keywords=${JSON.stringify(item.keywords)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


// node check_mpc_live.js --grpName 0x000000000000000000000000000000000000000000000041726965735f303639


/*
response:

NOT_WORKING 0x18316a1efe4d4ea853708097d424f82cddd1acca keywords=["GetDataForApproveUni successfully","workingAddress =0x1831...acca"]
NOT_WORKING 0x7f1553a3920cd6c39e4452875fc4349884a03b9e keywords=["GetDataForApproveUni successfully","workingAddress =0x7f15...3b9e"]

*/
