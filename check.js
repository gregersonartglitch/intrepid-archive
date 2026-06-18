const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const checks = [
  ['#app element', html.includes('id="app"')],
  ['#map element', html.includes('id="map"')],
  ['#frame element', html.includes('id="frame"')],
  ['#title element', html.includes('id="title"')],
  ['#layers element', html.includes('id="layers"')],
  ['#gate element', html.includes('id="gate"')],
  ['#discovery-card', html.includes('id="discovery-card"')],
  ['showWelcome defined', html.includes('function showWelcome')],
  ['tryLoadFrameImage defined', html.includes('function tryLoadFrameImage')],
  ['buildVeil defined', html.includes('function buildVeil')],
  ['buildMarkers defined', html.includes('function buildMarkers')],
  ['initMap defined', html.includes('function initMap')],
  ['EDIT_MODE defined', html.includes('EDIT_MODE')],
];

checks.forEach(([name, ok]) => console.log((ok ? '✓' : '✗') + ' ' + name));

// Check for unmatched braces in the script block
let depth = 0;
for (const ch of html) {
  if (ch === '{') depth++;
  if (ch === '}') depth--;
  if (depth < 0) { console.log('✗ UNMATCHED CLOSING BRACE'); break; }
}
console.log('Final brace depth: ' + depth + ' (should be 0)');
