#!/usr/bin/env node
/**
 * convert_diagrams.js
 * Converts all .mmd files in the diagrams/ folder to .png using @mermaid-js/mermaid-cli
 * Usage: node convert_diagrams.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIAGRAMS_DIR = path.join(__dirname, 'diagrams');
const MMDC = path.join(__dirname, 'node_modules', '.bin', 'mmdc');

// Mermaid config for clean white-background thesis diagrams
const CONFIG = {
  theme: 'default',
  background: 'white',
  fontSize: 14,
};

const configPath = path.join(__dirname, 'mermaid.config.json');
fs.writeFileSync(configPath, JSON.stringify(CONFIG, null, 2));

const files = fs.readdirSync(DIAGRAMS_DIR).filter(f => f.endsWith('.mmd'));

console.log(`Found ${files.length} .mmd files to convert...\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  const inputPath = path.join(DIAGRAMS_DIR, file);
  const outputName = file.replace('.mmd', '.png');
  const outputPath = path.join(DIAGRAMS_DIR, outputName);

  try {
    const cmd = `"${MMDC}" -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -b white --width 1200 --height 800`;
    console.log(`  Converting: ${file} → ${outputName}`);
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    console.log(`  ✓ Done: ${outputName}`);
    success++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${file}`);
    console.error(`    ${err.stderr?.toString()?.trim() || err.message}`);
    failed++;
  }
}

fs.unlinkSync(configPath);

console.log(`\n========================================`);
console.log(`Converted: ${success} succeeded, ${failed} failed`);
console.log(`Output directory: ${DIAGRAMS_DIR}`);
