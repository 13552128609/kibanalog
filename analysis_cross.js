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
const outputImage = path.join(path.dirname(inputFile), `${outputBase}_analysis.png`);

// Read and parse CSV file
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    console.error('CSV file must have at least a header and one data row');
    return [];
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields that might contain commas
    const values = [];
    let inQuotes = false;
    let current = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Add the last field
    
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
  return result;
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

// Generate bar chart
function generateChart(stats, outputPath) {
  const width = 1000;
  const height = 600;
  const margin = { top: 50, right: 50, bottom: 100, left: 100 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Chart title
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'black';
  ctx.fillText('Cross-chain Transaction Duration Analysis', width / 2, 30);

  const fields = Object.keys(stats);
  const barWidth = 30;
  const gap = 10;
  const groupWidth = (barWidth * 4) + (gap * 3);
  const startX = margin.left + (innerWidth - (fields.length * groupWidth)) / 2;

  // Find max value for scaling
  const maxValue = Math.max(...fields.map(f => stats[f].max));
  const scale = innerHeight / (maxValue * 1.1); // Add 10% padding

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + innerHeight);
  ctx.lineTo(margin.left + innerWidth, margin.top + innerHeight);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Y-axis labels
  ctx.textAlign = 'right';
  ctx.font = '12px Arial';
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxValue / yTicks) * i;
    const y = margin.top + innerHeight - (i * (innerHeight / yTicks));
    ctx.fillText(value.toFixed(2), margin.left - 10, y + 4);
    ctx.beginPath();
    ctx.moveTo(margin.left - 5, y);
    ctx.lineTo(margin.left, y);
    ctx.stroke();
  }

  // X-axis labels and bars
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  const statTypes = ['min', 'max', 'average', 'median'];
  const legendLabels = ['Min', 'Max', 'Average', 'Median'];

  fields.forEach((field, fieldIndex) => {
    const x = startX + (fieldIndex * groupWidth);
    
    // Field label
    ctx.save();
    ctx.translate(x + groupWidth / 2, margin.top + innerHeight + 30);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.font = '10px Arial';
    ctx.fillText(field, 0, 0);
    ctx.restore();

    // Bars for each stat type
    statTypes.forEach((stat, statIndex) => {
      const value = stats[field][stat];
      const barHeight = value * scale;
      const barX = x + (statIndex * (barWidth + gap));
      
      ctx.fillStyle = colors[statIndex];
      ctx.fillRect(
        barX, 
        margin.top + innerHeight - barHeight, 
        barWidth, 
        barHeight
      );

      // Value label
      if (barHeight > 20) {
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(
          value.toFixed(2), 
          barX + barWidth / 2, 
          margin.top + innerHeight - barHeight - 5
        );
      }
    });
  });

  // Legend
  const legendX = margin.left + 50;
  const legendY = margin.top - 20;
  
  statTypes.forEach((stat, index) => {
    ctx.fillStyle = colors[index];
    ctx.fillRect(legendX + (index * 150), legendY, 15, 15);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(legendLabels[index], legendX + 20 + (index * 150), legendY + 12);
  });

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// Main function
async function main() {
  try {
    console.log(`Analyzing file: ${inputFile}`);
    
    // Read input file
    const content = fs.readFileSync(inputFile, 'utf-8');
    const data = parseCSV(content);
    
    if (data.length === 0) {
      console.log('No data found in the input file');
      return;
    }

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

    // Generate and save chart
    generateChart(stats, outputImage);
    console.log(`Chart saved to: ${outputImage}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the analysis
main();

//node analysis_cross.js -f ./result/crosschain_detail_test_2026-01-04_10.csv