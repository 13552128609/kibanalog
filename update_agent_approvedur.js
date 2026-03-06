#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { createCanvas } = require('canvas');

// Parse command line arguments
program
  .requiredOption('-f, --file <path>', 'Path to the input CSV file')
  .parse(process.argv);

const options = program.opts();
const inputFile = options.file;

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File '${inputFile}' does not exist`);
  process.exit(1);
}

// Output file names
const outputBase = path.basename(inputFile, path.extname(inputFile));
const outputFile = path.join(path.dirname(inputFile), `${outputBase}_analysis.txt`);

// Read and parse CSV file
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    console.error('CSV file must have at least a header and one data row');
    return { headers: [], rows: [] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];

  const unescapeCsvField = (value) => {
    if (value === null || value === undefined) return '';
    let s = String(value);
    if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
      s = s.slice(1, -1);
    }
    s = s.replace(/""/g, '"');
    return s;
  };
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    const values = [];
    let current = '';
    let inQuotes = false;

    const pushCurrent = () => {
      values.push(current);
      current = '';
    };

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];

      if (values.length === headers.length - 1) {
        const rest = parts.slice(p).join(',');
        current = current ? `${current},${rest}` : rest;
        pushCurrent();
        break;
      }

      if (!inQuotes) {
        if (part.startsWith('"')) {
          current = part;
          const quoteCount = (current.match(/"/g) || []).length;
          if (quoteCount % 2 === 0) {
            pushCurrent();
          } else {
            inQuotes = true;
          }
        } else {
          current = part;
          pushCurrent();
        }
      } else {
        current += `,${part}`;
        const quoteCount = (current.match(/"/g) || []).length;
        if (quoteCount % 2 === 0) {
          inQuotes = false;
          pushCurrent();
        }
      }
    }

    if (values.length < headers.length) {
      while (values.length < headers.length) values.push('');
    }
    if (values.length > headers.length) {
      values.splice(headers.length - 1, values.length - (headers.length - 1), values.slice(headers.length - 1).join(','));
    }

    for (let k = 0; k < values.length; k++) {
      values[k] = unescapeCsvField(values[k]);
    }
    
    // Only add if we have the expected number of columns
    if (values.length === headers.length) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }
      result.push(obj);
    } else {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
    }
  }
  
  console.log(`Parsed ${result.length} valid records from CSV`);
  return { headers, rows: result };
}

function writeCSV(headers, rows) {
  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerLine = headers.join(',');
  const lines = rows.map((row) => {
    const values = headers.map((h) => escapeCsvValue(row[h]));
    return values.join(',');
  });

  return headerLine + '\n' + lines.join('\n') + (lines.length ? '\n' : '');
}

// Calculate statistics
function calculateStats(data, field) {
  if (!data || !data.length) {
    console.warn(`No data provided for field: ${field}`);
    return { min: 0, max: 0, average: 0, median: 0, count: 0 };
  }

  const values = [];
  const invalidValues = [];
  
  data.forEach((item, index) => {    
    const value = item[field];
    const num = parseFloat(value);
    if (!isNaN(num) && value !== '' && value !== null && value !== undefined) {
      values.push(num);
    } else {
      invalidValues.push({ index, value });
    }
  });
  
  values.sort((a, b) => a - b);
  
  if (invalidValues.length > 0) {
    console.warn(`Found ${invalidValues.length} invalid values for field '${field}'. First few:`, 
      invalidValues.slice(0, 3).map(v => `[${v.index}]=${v.value}`).join(', '));
  }
  
  if (values.length === 0) {
    console.warn(`No valid numeric values found for field: ${field}`);
    return { min: 0, max: 0, average: 0, median: 0, count: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 
    ? values[mid] 
    : (values[mid - 1] + values[mid]) / 2;

  return {
    min: values[0],
    max: values[values.length - 1],
    average: avg,
    median: median,
    count: values.length
  };
}

// Main function
async function main() {
  try {
    console.log(`Analyzing file: ${inputFile}`);
    
    // Read input file
    const content = fs.readFileSync(inputFile, 'utf-8');
    const parsed = parseCSV(content);
    const headers = parsed.headers;
    const data = parsed.rows;
    
    if (data.length === 0) {
      console.log('No data found in the input file');
      return;
    }

    data.forEach((row) => {
      const mpcSignDuring = parseFloat(row.MpcSignDuring);
      const mpcSignDuringAct = parseFloat(row.MpcSignDuringAct);      
      if (Number.isFinite(mpcSignDuring) && Number.isFinite(mpcSignDuringAct)) {
        row.AgentApproveDuring = (mpcSignDuring - mpcSignDuringAct).toFixed(4);
      }
    });

    // const updatedCsv = writeCSV(headers, data);
    // fs.writeFileSync(inputFile, updatedCsv);

    // Calculate statistics for each field
    const fields = [
      'crossDuring', 
      'MpcSignDuring', 
      'MpcSignDuringAct', 
      'AgentApproveDuring',
      'AgentReqSignDuring',
      'AgentMintDuring'
    ];

    const stats = {};
    fields.forEach(field => {
      stats[field] = calculateStats(data, field);
    });

    // Generate report
    let report = 'Cross-chain Transaction Duration Analysis\n';
    report += '='.repeat(50) + '\n\n';
    
    fields.forEach(field => {
      const s = stats[field];
      report += `${field}:\n`;
      report += `  Count:    ${s.count}\n`;
      report += `  Min:      ${s.min.toFixed(2)}\n`;
      report += `  Max:      ${s.max.toFixed(2)}\n`;
      report += `  Average:  ${s.average.toFixed(2)}\n`;
      report += `  Median:   ${s.median.toFixed(2)}\n\n`;
    });

    // Save report
    fs.writeFileSync(outputFile, report);
    console.log(`Analysis report saved to: ${outputFile}`);    

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the analysis
main();

//node update_agent_approvedur.js -f ./result/2026-01-16_17/crosschain_detail_test_2026-01-16_17.csv 