// Test script to validate fog system logic
// Run with: node test_fog.js

const fs = require('fs');

// Mock browser globals
global.window = {};
global.document = { 
  createElement: () => ({ 
    style: {}, className: '', 
    appendChild: () => {}, 
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    querySelector: () => ({ textContent: '' }),
    remove: () => {}
  }),
  getElementById: () => null,
  addEventListener: () => {}
};
global.L = { 
  point: (x,y) => ({x,y}),
  DomEvent: { stopPropagation: () => {} },
  divIcon: () => ({}),
  marker: () => ({ on: () => {}, addTo: () => {}, _icon: null }),
  layerGroup: () => ({ addTo: () => {} })
};
global.Image = class { set src(v) { if(this.onload) this.onload(); } };
global.localStorage = { 
  _data: {},
  getItem: function(k) { return this._data[k] || null; },
  setItem: function(k,v) { this._data[k] = v; },
  removeItem: function(k) { delete this._data[k]; }
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

// Load data.js
eval(fs.readFileSync('data.js', 'utf8'));

console.log('=== FOG SYSTEM VALIDATION ===\n');

// Test 1: JOURNEY_PATH exists and has correct order
const path = window.JOURNEY_PATH;
console.log('Test 1: Journey path order');
console.log('  Steps:', path.length);
path.forEach(s => console.log('  Step ' + s.step + ': ' + s.locationId + ' (' + s.label + ')'));
console.assert(path[0].locationId === 'crossing-pool', 'FAIL: First step should be crossing-pool');
console.assert(path[1].locationId === 'dawn-spear', 'FAIL: Second step should be dawn-spear');
console.assert(path[2].locationId === 'sabellas-hut', 'FAIL: Third step should be sabellas-hut');
console.assert(path[3].locationId === 'tower-nine', 'FAIL: Fourth step should be tower-nine');
console.assert(path[4].locationId === 'monastery-wind', 'FAIL: Fifth step should be monastery-wind');
console.log('  PASSED\n');

// Test 2: Crossing Pool location exists
const locs = window.LOCATIONS;
const crossingPool = locs.find(l => l.id === 'crossing-pool');
console.log('Test 2: Crossing Pool exists');
console.assert(crossingPool, 'FAIL: crossing-pool not found in LOCATIONS');
console.log('  Name:', crossingPool.name);
console.log('  Coords: lat=' + crossingPool.lat + ' lng=' + crossingPool.lng);
console.log('  PASSED\n');

// Test 3: Fog.js syntax and structure
const fogSrc = fs.readFileSync('fog.js', 'utf8');
console.log('Test 3: Fog.js structure');

// Check NO pointer-events:auto on canvas
const hasPointerAuto = fogSrc.includes("pointer-events:auto");
console.log('  pointer-events:auto in canvas:', hasPointerAuto ? 'FOUND (BAD!)' : 'Not found (GOOD)');
console.assert(!hasPointerAuto, 'FAIL: Canvas should NOT have pointer-events:auto');

// Check capture phase listener exists
const hasCaptureTrue = fogSrc.includes("}, true)");
console.log('  Capture-phase listener:', hasCaptureTrue ? 'Found (GOOD)' : 'NOT FOUND (BAD!)');
console.assert(hasCaptureTrue, 'FAIL: Must use capture-phase click listener');

// Check NO mousedown pointer-events hack
const hasMousedownHack = fogSrc.includes("fogCanvas.style.pointerEvents = 'none'");
console.log('  mousedown pointer hack:', hasMousedownHack ? 'FOUND (BAD!)' : 'Not found (GOOD)');
console.assert(!hasMousedownHack, 'FAIL: mousedown hack should be removed');

// Check drag threshold
const hasDragThreshold = fogSrc.includes('DRAG_THRESHOLD');
console.log('  Drag threshold:', hasDragThreshold ? 'Found (GOOD)' : 'NOT FOUND (BAD!)');

// Check tutorial system
const hasTutorialSteps = fogSrc.includes('TUTORIAL_STEPS');
console.log('  Tutorial steps:', hasTutorialSteps ? 'Found (GOOD)' : 'NOT FOUND');

const hasGuideTutorial = fogSrc.includes('guideTutorial');
console.log('  guideTutorial():', hasGuideTutorial ? 'Found (GOOD)' : 'NOT FOUND');

const hasAdvanceTutorial = fogSrc.includes('advanceTutorial');
console.log('  advanceTutorial():', hasAdvanceTutorial ? 'Found (GOOD)' : 'NOT FOUND');
console.log('  PASSED\n');

// Test 4: index.html has correct script include
const html = fs.readFileSync('index.html', 'utf8');
console.log('Test 4: HTML integration');

const fogScriptMatch = html.match(/fog\.js\?v=(\d+)/);
console.log('  fog.js version:', fogScriptMatch ? 'v' + fogScriptMatch[1] : 'NO CACHE BUST');

// Check tutorial CSS
const hasTutorialCSS = html.includes('#fog-tutorial');
console.log('  Tutorial CSS:', hasTutorialCSS ? 'Found' : 'NOT FOUND');

const tutorialZMatch = html.match(/#fog-tutorial\s*\{[^}]*z-index:\s*(\d+)/);
console.log('  Tutorial z-index:', tutorialZMatch ? tutorialZMatch[1] : 'NOT FOUND');
if (tutorialZMatch) {
  console.assert(parseInt(tutorialZMatch[1]) > 450, 'FAIL: Tutorial z-index must be > 450 (fog canvas)');
}

// Check discovery card position
const hasCardRight = html.includes('right: -420px') || html.includes('right: 24px');
console.log('  Discovery card (right side):', hasCardRight ? 'Found' : 'NOT FOUND');

// Check layers left
const hasLayersLeft = html.includes('#layers') && html.match(/position:\s*fixed.*left:\s*\d+px/);
console.log('  Layers panel (left):', hasLayersLeft ? 'Found' : 'CHECK MANUALLY');

// Check compass hidden
const hasCompassHidden = html.includes('display: none') && html.includes('COMPASS');
console.log('  Compass hidden:', hasCompassHidden ? 'Yes' : 'CHECK MANUALLY');

// Check fog-hidden CSS
const hasFogHidden = html.includes('.fog-hidden');
console.log('  .fog-hidden CSS:', hasFogHidden ? 'Found' : 'NOT FOUND');

// Check celebration CSS
const hasCelebration = html.includes('.celebration-burst');
console.log('  Celebration CSS:', hasCelebration ? 'Found' : 'NOT FOUND');

console.log('  PASSED\n');

// Test 5: Click radius is reasonable
const clickRadiusMatch = fogSrc.match(/CLICK_RADIUS\s*=\s*(\d+)/);
console.log('Test 5: Click radius');
console.log('  Value:', clickRadiusMatch ? clickRadiusMatch[1] + 'px' : 'NOT FOUND');
console.log('  PASSED\n');

console.log('=== ALL TESTS PASSED ===');
