const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

// Extract CSS (lines 15 to 1297 in 1-indexed = array index 14 to 1296)
const cssLines = lines.slice(14, 1297);
fs.writeFileSync('styles.css', cssLines.join('\n'));

// Replace style block with link tag
const linkTag = '<link rel="stylesheet" href="styles.css">';
const newLines = [
  ...lines.slice(0, 13),   // lines 1-13 (head content before <style>)
  linkTag,
  ...lines.slice(1298)     // everything after </style>
];
fs.writeFileSync('index.html', newLines.join('\n'));

console.log('Extracted ' + cssLines.length + ' CSS lines to styles.css');
console.log('index.html reduced from ' + lines.length + ' to ' + newLines.length + ' lines');
