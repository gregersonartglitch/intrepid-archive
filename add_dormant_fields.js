// Script to add state, epithet, and quadrant fields to all locations in data.js
const fs = require('fs');

let data = fs.readFileSync('data.js', 'utf8');

// Journey path location IDs — these stay 'fogged' (fog system handles them)
const journeyIds = [
  'crossing-pool', 'dawn-spear', 'sabellas-hut', 'tower-nine',
  'monastery-wind', 'hollowgate', 'mish', 'brea',
  'moon-stronghold', 'erra', 'maxim-stone'
];

// Always revealed types
const revealedTypes = ['region', 'water'];

// Map center for quadrant calculation (8192/2 = 4096)
const CENTER = 4096;

function getQuadrant(lat, lng) {
  // lat increases upward (north), lng increases rightward (east)
  // In Leaflet Simple CRS with our setup: higher lat = higher on map = north
  if (lat > CENTER + 500 && lng < CENTER - 500) return 'north'; // NW quadrant — "north"
  if (lat > CENTER + 500 && lng > CENTER + 500) return 'east';  // NE quadrant — "east"
  if (lat < CENTER - 500 && lng < CENTER - 500) return 'south'; // SW quadrant — "south"
  if (lat < CENTER - 500 && lng > CENTER + 500) return 'west';  // SE quadrant — "west" (azu/ocean)
  return 'center'; // within ~1000px of center
}

// Epithets for dormant locations — mysterious names that hint without revealing
const epithets = {
  // Cities
  'atras-un': 'The Upper Throne',
  'atras-dur': 'The Stone Seat',
  'atras-lin': 'The Third Pillar',
  'erra': 'The War-Touched',
  'mish': 'The Hidden Gate',
  'belu': 'The Dragon\'s Perch',
  'kori': 'The High Watch',
  'caeth-nul': 'The Frozen Name',
  'caeti': 'The Tidebound',
  'tish': 'The Quiet Market',
  'brea': 'The Scribes\' Keep',
  'tihr': 'The Wind\'s Crossing',
  'nin': 'The Golden Seat',
  
  // Towns
  'maji': 'The Weavers\' Rest',
  'skull-city': 'The Bone Market',
  'matgul-city': 'The Marsh Hall',
  'port-sham': 'The Storm Dock',
  'og-council': 'The Low Hall',
  'tiegates': 'The Tide Door',
  'caeti-bay': 'The Sheltered Shore',
  'dragon-head': 'The Wyrm\'s Crown',
  
  // Story locations
  'crossing-pool': 'The First Water',
  'dawn-spear': 'The Clearing',
  'sabellas-hut': 'The Grandmother\'s Shelter',
  'tower-nine': 'The Ruined Tower',
  'monastery-wind': 'The Oracle\'s Sanctuary',
  'moon-stronghold': 'The Moon Queen\'s Fortress',
  'maxim-stone': 'The Barrier',
  'irridari-citadel': 'The Shining Fortress',
  
  // Sacred sites
  'temple-ae': 'The Sunken Temple',
  'gates-ningal': 'The Moon\'s Threshold',
  'dilmun-ruins': 'The Lost Garden',
  'kur-border': 'The Underworld\'s Edge',
  
  // New regions/areas
  'isle-of-dawn': 'The Eastern Isle',
  'hope-rebellands': 'The Defiant Lands',
  'dragons-tail': 'The Serpent\'s Wake',
  'sinn': 'The Moon City',
  'indras-na': 'The Thunder Seat',
  'armatu': 'The Shield Wall',
  'mirilis': 'The Still Water',
  'mari': 'The River Court',
  'awan': 'The Old Foundation',
  'uduna': 'The Deep Road',
  'gal': 'The Northern Hold',
  'tal': 'The Watcher\'s Post',
  'fenxi': 'The Burning Ground',
  'ddr': 'The Dust Road',
  'azu-ran': 'The Eastern Reach',
  'reok': 'The Stone Circle',
  'pillars-of-dusk': 'The Twilight Columns',
  'sacred-mountains': 'The High Peaks',
  'the-gates': 'The Passage',
  'the-pillars': 'The Standing Stones',
  'elil': 'The Dark Throne',
  'hollowgate': 'The Threshold'
};

// Parse all locations and add fields
// We'll use regex to find each location block and inject fields
const locRegex = /id:\s*'([^']+)',\s*\n\s*name:\s*'([^']*(?:\\.[^']*)*)',/g;
let match;
let updates = 0;

while ((match = locRegex.exec(data)) !== null) {
  const id = match[1];
  const fullMatch = match[0];
  const pos = match.index;
  
  // Find this location's lat and lng
  const afterId = data.substring(pos, pos + 600);
  const latMatch = afterId.match(/lat:\s*(\d+)/);
  const lngMatch = afterId.match(/lng:\s*(\d+)/);
  const typeMatch = afterId.match(/type:\s*'([^']+)'/);
  
  if (!latMatch || !lngMatch || !typeMatch) continue;
  
  const lat = parseInt(latMatch[1]);
  const lng = parseInt(lngMatch[1]);
  const type = typeMatch[1];
  
  // Determine state
  let state;
  if (journeyIds.includes(id)) {
    state = 'fogged';
  } else if (revealedTypes.includes(type)) {
    state = 'revealed';
  } else {
    state = 'dormant';
  }
  
  // Determine quadrant
  const quadrant = getQuadrant(lat, lng);
  
  // Get epithet
  const epithet = epithets[id] || null;
  
  // Check if state field already exists
  if (afterId.includes("state:")) continue;
  
  // Insert after the type line
  const typeLineMatch = afterId.match(/type:\s*'[^']+',?\s*\n/);
  if (!typeLineMatch) continue;
  
  const insertPos = pos + typeLineMatch.index + typeLineMatch[0].length;
  const indent = '    ';
  
  let insertion = `${indent}state: '${state}',\n`;
  insertion += `${indent}quadrant: '${quadrant}',\n`;
  if (epithet && state === 'dormant') {
    insertion += `${indent}epithet: '${epithet}',\n`;
  }
  
  data = data.substring(0, insertPos) + insertion + data.substring(insertPos);
  
  // Reset regex since we modified the string
  locRegex.lastIndex = insertPos + insertion.length;
  updates++;
}

fs.writeFileSync('data.js', data);
console.log(`Updated ${updates} locations with state/quadrant/epithet fields`);

// Also add DORMANT_FLAVOR if not present
if (!data.includes('DORMANT_FLAVOR')) {
  const flavorPool = `

window.DORMANT_FLAVOR = {
  north: [
    "The North Guardian keeps this still. The way is not yet open.",
    "Snow has not yet been swept from this door.",
    "A cold watch holds here. What it guards has not been named.",
    "The northern roads remember this place. They do not yet speak it."
  ],
  south: [
    "The South Guardian has not lifted the veil from this place.",
    "Heat shimmers over it. The shape beneath stays hidden.",
    "This name waits in the dry wind, unspoken.",
    "The way south is open; this threshold is not."
  ],
  east: [
    "The East Guardian holds the first light from this place.",
    "Dawn has not yet reached this door.",
    "Something here waits to be woken. Not now. Not by this hand yet.",
    "The eastern dark keeps its counsel here."
  ],
  west: [
    "The West Guardian seals this against the failing light.",
    "Dusk lingers here. What it hides is not yet yours to see.",
    "The last light falls on a door that will not yet open.",
    "This place keeps to the west's long silence."
  ],
  center: [
    "Even the Cartographer's hand has not yet drawn what lies here.",
    "This name has not been spoken - not in the world, not yet in the telling.",
    "The map remembers a shape here. Its truth is still being dreamed."
  ]
};
`;
  
  data = fs.readFileSync('data.js', 'utf8');
  data += flavorPool;
  fs.writeFileSync('data.js', data);
  console.log('Added DORMANT_FLAVOR pool');
}
