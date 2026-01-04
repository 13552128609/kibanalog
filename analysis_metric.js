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
  
  const headers = ['Timestamp', 'CPU Usage (%)', 'CPU Cores', 'Memory Total (MB)', 
                  'Memory Used (MB)', 'Memory Free (MB)', 'Disk Total', 'Disk Used', 
                  'Disk Usage', 'Load Average', 'RawMessage'];
  const result = [];
  
  // Process each pair of lines (each record spans two lines)
  for (let i = 1; i < lines.length; i += 2) {
    if (i + 1 >= lines.length) break;
    
    const line1 = lines[i].trim();
    const line2 = lines[i + 1].trim();
    
    if (!line1 || !line2) continue;
    
    try {
      // Combine both lines for processing
      const combinedLine = line1 + ' ' + line2;
      
      // Extract fields using regex to handle quoted values with commas
      const valueRegex = /"([^"]*)"|([^,\s][^,]*[^,\s]?)/g;
      let match;
      const values = [];
      
      // Process the first line (before the RawMessage)
      const firstLineParts = line1.split(',');
      for (let j = 0; j < firstLineParts.length; j++) {
        values.push(firstLineParts[j].replace(/^"|"$/g, '').trim());
      }
      
      // Add the RawMessage (the entire second line)
      values.push(line2);
      
      // If we have more values than headers, merge the extra fields into RawMessage
      if (values.length > headers.length) {
        const extraValues = values.splice(headers.length - 1);
        values[headers.length - 1] = extraValues.join(',');
      }
      
      const obj = {};
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        obj[headers[j]] = values[j];
      }
      
      // Make sure we have all required fields
      if (obj['Load Average'] && obj['Memory Used (MB)'] && obj['Disk Usage']) {
        result.push(obj);
      } else {
        console.warn(`Skipping record at lines ${i + 1}-${i + 2}: Missing required fields`);
      }
      
    } catch (error) {
      console.warn(`Error parsing lines ${i + 1}-${i + 2}:`, error.message);
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
    let value = item[field];
    // Remove percentage sign if present
    if (typeof value === 'string') {
      value = value.replace('%', '');
    }
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

// Generate chart with dual Y-axes
function generateChart(stats, outputPath) {
  const width = 1200;
  const height = 700;
  const margin = { top: 70, right: 100, bottom: 120, left: 100 };
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
  ctx.fillText('System Metrics Analysis', width / 2, 40);

  const fields = Object.keys(stats);
  const colors = {
    'Load Average': '#FF6B6B',     // Red
    'Disk Usage': '#4ECDC4',      // Teal
    'Memory Used (MB)': '#45B7D1' // Blue
  };

  // Calculate scales for each metric
  const scales = {
    'Load Average': {
      max: Math.ceil(stats['Load Average'].max * 1.2),
      color: colors['Load Average'],
      side: 'right'
    },
    'Disk Usage': {
      max: 100, // Percentage, so max is 100
      color: colors['Disk Usage'],
      side: 'right'
    },
    'Memory Used (MB)': {
      max: Math.ceil(stats['Memory Used (MB)'].max * 1.1),
      color: colors['Memory Used (MB)'],
      side: 'left'
    }
  };

  // Draw left Y-axis (Memory Used)
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + innerHeight);
  ctx.stroke();

  // Draw right Y-axis (Load Average and Disk Usage)
  ctx.beginPath();
  ctx.moveTo(margin.left + innerWidth, margin.top);
  ctx.lineTo(margin.left + innerWidth, margin.top + innerHeight);
  ctx.stroke();

  // Draw X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + innerHeight);
  ctx.lineTo(margin.left + innerWidth, margin.top + innerHeight);
  ctx.stroke();

  // Draw left Y-axis labels (Memory Used)
  ctx.textAlign = 'right';
  ctx.fillStyle = scales['Memory Used (MB)'].color;
  const leftTicks = 5;
  for (let i = 0; i <= leftTicks; i++) {
    const value = Math.round((scales['Memory Used (MB)'].max / leftTicks) * i);
    const y = margin.top + innerHeight - (i * (innerHeight / leftTicks));
    ctx.fillText(value.toString(), margin.left - 10, y + 4);
    
    // Grid line
    ctx.strokeStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + innerWidth, y);
    ctx.stroke();
  }
  ctx.fillText('Memory (MB)', margin.left - 60, margin.top - 20);

  // Draw right Y-axis labels (Load Average and Disk Usage %)
  ctx.textAlign = 'left';
  for (const [metric, config] of Object.entries(scales)) {
    if (config.side === 'right') {
      ctx.fillStyle = config.color;
      const rightTicks = 5;
      for (let i = 0; i <= rightTicks; i++) {
        const value = ((metric === 'Disk Usage' ? 100 : scales[metric].max) / rightTicks) * i;
        const y = margin.top + innerHeight - (i * (innerHeight / rightTicks));
        ctx.fillText(value.toFixed(metric === 'Disk Usage' ? 0 : 1), 
                    margin.left + innerWidth + 10, y + 4);
      }
      // Add label
      if (metric === 'Load Average') {
        ctx.fillText('Load Avg / Disk %', margin.left + innerWidth + 10, margin.top - 20);
      }
    }
  }

  // Draw bars for each metric
  const barWidth = 20;
  const groupWidth = barWidth * 3 + 20; // 3 bars + spacing
  const startX = margin.left + (innerWidth - (fields.length * groupWidth)) / 2;

  fields.forEach((field, fieldIndex) => {
    const x = startX + (fieldIndex * groupWidth);
    
    // Field label
    ctx.save();
    ctx.translate(x + groupWidth / 2, margin.top + innerHeight + 40);
    ctx.rotate(-Math.PI / 3);
    ctx.textAlign = 'right';
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(field, 0, 0);
    ctx.restore();

    // Draw bars for each stat type
    ['min', 'max', 'average', 'median'].forEach((stat, statIndex) => {
      const statColors = {
        'min': '#FFB88C',
        'max': '#FF7E5F',
        'average': '#F95F62',
        'median': '#A34A4A'
      };
      
      const value = stats[field][stat];
      const scale = field === 'Memory Used (MB)' ? 
                   innerHeight / scales['Memory Used (MB)'].max :
                   innerHeight / (field === 'Disk Usage' ? 100 : scales[field].max);
      const barHeight = value * scale;
      const barX = x + (statIndex * (barWidth + 5));

      ctx.fillStyle = statColors[stat];
      ctx.fillRect(
        barX,
        margin.top + innerHeight - barHeight,
        barWidth,
        barHeight
      );

      // Value label
      if (barHeight > 15) {
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '10px Arial';
        const displayValue = field === 'Memory Used (MB)' ? 
                           Math.round(value) : 
                           value.toFixed(field === 'Disk Usage' ? 0 : 2);
        ctx.fillText(
          displayValue,
          barX + barWidth / 2,
          margin.top + innerHeight - barHeight - 5
        );
      }
    });
  });

  // Legend for stat types
  const legendX = margin.left + 50;
  const legendY = margin.top - 30;
  const statTypes = ['min', 'max', 'average', 'median'];
  const statLabels = ['Min', 'Max', 'Average', 'Median'];
  const statColors = ['#FFB88C', '#FF7E5F', '#F95F62', '#A34A4A'];

  statTypes.forEach((stat, index) => {
    ctx.fillStyle = statColors[index];
    ctx.fillRect(legendX + (index * 120), legendY, 15, 15);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    ctx.fillText(statLabels[index], legendX + 20 + (index * 120), legendY + 12);
  });

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// Generate 3D bar chart
// Generate 3D bar chart using Chart.js
// Generate 3D bar chart using Chart.js
async function generate3DChart(stats, outputPath) {
  const { createCanvas, loadImage } = require('canvas');
  const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
  
  const width = 1200;
  const height = 800;
  
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width, 
    height, 
    backgroundColour: 'white',
    chartCallback: (ChartJS) => {
      // Register any required plugins or components here
    }
  });

  const metrics = ['Load Average', 'Disk Usage', 'Memory Used (MB)'];
  const statTypes = ['min', 'max', 'average', 'median'];
  const labels = statTypes.map(stat => stat.charAt(0).toUpperCase() + stat.slice(1));
  
  const colors = {
    'Load Average': 'rgba(255, 99, 132, 0.8)',
    'Disk Usage': 'rgba(54, 162, 235, 0.8)',
    'Memory Used (MB)': 'rgba(75, 192, 192, 0.8)'
  };

  // Define datasets with their respective Y-axes
  const datasets = [
    {
      label: 'Load Average',
      data: statTypes.map(stat => stats['Load Average'][stat]),
      backgroundColor: colors['Load Average'],
      borderColor: colors['Load Average'].replace('0.8', '1'),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      yAxisID: 'yLoad'
    },
    {
      label: 'Disk Usage',
      data: statTypes.map(stat => stats['Disk Usage'][stat]),
      backgroundColor: colors['Disk Usage'],
      borderColor: colors['Disk Usage'].replace('0.8', '1'),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      yAxisID: 'yDisk'
    },
    {
      label: 'Memory Used (MB)',
      data: statTypes.map(stat => stats['Memory Used (MB)'][stat]),
      backgroundColor: colors['Memory Used (MB)'],
      borderColor: colors['Memory Used (MB)'].replace('0.8', '1'),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      yAxisID: 'yMemory'
    }
  ];

  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'System Metrics Analysis (Multiple Y-Axes)',
          font: {
            size: 20
          },
          padding: {
            top: 10,
            bottom: 30
          }
        },
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 14
            },
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                const unit = context.dataset.label === 'Memory Used (MB)' ? ' MB' : 
                            context.dataset.label === 'Disk Usage' ? '%' : '';
                label += context.parsed.y.toFixed(2) + unit;
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Statistics',
            font: {
              size: 14
            }
          },
          grid: {
            display: false
          }
        },
        yLoad: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Load Average',
            color: colors['Load Average'],
            font: {
              size: 12
            }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: colors['Load Average']
          }
        },
        yDisk: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Disk Usage %',
            color: colors['Disk Usage'],
            font: {
              size: 12
            }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: colors['Disk Usage']
          }
        },
        yMemory: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Memory (MB)',
            color: colors['Memory Used (MB)'],
            font: {
              size: 12
            }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: colors['Memory Used (MB)']
          }
        }
      }
    }
  };

  try {
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync(outputPath, buffer);
  } catch (error) {
    console.error('Error generating chart:', error);
    throw error;
  }
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
      'Load Average',
      'Disk Usage',
      'Memory Used (MB)'
    ];

    const stats = {};
    fields.forEach(field => {
      // Map to actual CSV column names
      const csvField = field === 'Memory Used (MB)' ? 'Memory Used (MB)' : 
                      field === 'Disk Usage' ? 'Disk Usage' : 'Load Average';
      stats[field] = calculateStats(data, csvField);
    });

    // Generate report
    let report = 'System Metrics Analysis\n';
    report += '='.repeat(50) + '\n\n';
    
    fields.forEach(field => {
      const s = stats[field];
      const unit = field === 'Memory Used (MB)' ? ' MB' : field === 'Disk Usage' ? '%' : '';
      report += `${field}:\n`;
      report += `  Count:    ${s.count}\n`;
      report += `  Min:      ${s.min.toFixed(2)}${unit}\n`;
      report += `  Max:      ${s.max.toFixed(2)}${unit}\n`;
      report += `  Average:  ${s.average.toFixed(2)}${unit}\n`;
      report += `  Median:   ${s.median.toFixed(2)}${unit}\n\n`;
    });

    // Save report
    fs.writeFileSync(outputFile, report);
    console.log(`Analysis report saved to: ${outputFile}`);

    // Generate and save chart
    //generateChart(stats, outputImage);
    generate3DChart(stats, outputImage);
    console.log(`Chart saved to: ${outputImage}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the analysis
main();

// Example usage:
// node analysis_metric.js -f ./result/metrics_test_2026-01-04_10.csv