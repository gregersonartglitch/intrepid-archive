// ═══════════════════════════════════════════════════════════════
// INTREPID DUSK — MAP DATA
// Edit regions, cities, and lore here without touching map logic.
// ═══════════════════════════════════════════════════════════════

window.MAP_CONFIG = {
  image: 'map.jpg',
  width: 3000,
  height: 2100,
  password: 'hollowlands',  // Change for each backer tier
  minZoom: -2,
  maxZoom: 5,              // High max for hyper-zoom into terrain
  defaultZoom: -1,
};

// ── REGIONS ──────────────────────────────────────────────────
// lat/lng in Simple CRS: [0,0]=bottom-left, [height,width]=top-right
window.REGIONS = [
  { id:'atras', name:'Atras Empire', sub:'Capital: Nin', lat:882, lng:1350,
    desc:'The dominant empire of the known world, spanning the great central plains. The Atras Empire commands history\'s most powerful military — and the psychic warfare division that first cracked open the Hollowlands.',
    lore:'"They did not discover the door. They were the door."',
    type:'empire' },
  { id:'kur-n', name:'Kur Deadlands', sub:'Northern Reach', lat:1575, lng:450,
    desc:'In the oldest cosmology, Kur is the underworld itself. In the world of Intrepid Dusk, it is not metaphor. It is the approaching threat — a place where the boundary between the living world and the Hollowlands has already failed.',
    lore:'"Before the Atras Empire had a name, Kur had a border. That border is moving."',
    type:'deadlands' },
  { id:'kur-s', name:'Kur Deadlands', sub:'Southern Reach', lat:294, lng:462,
    desc:'The southern arm of Kur bleeds into the lower continent. The soil here produces nothing. Even light seems reluctant.',
    lore:'"The scouts who entered the southern Kur did not return. The ones who did were not scouts anymore."',
    type:'deadlands' },
  { id:'golden-wastes', name:'The Golden Wastes of Utu-Raman', sub:'Far West', lat:1092, lng:240,
    desc:'An ancient desert kingdom predating the Atras Empire. The Golden Wastes have resisted Atras expansion for three centuries. They know something about the Hollowlands the Empire does not.',
    lore:'"Utu saw what was coming. He did not warn them. He built a wall instead."',
    type:'kingdom' },
  { id:'moon-queen', name:'Kingdom of the Moon Queen', sub:'Western Territories', lat:1050, lng:378,
    desc:'A matriarchal kingdom on a lunar cosmological system that diverges completely from Atras solar doctrine. The Moon Queen\'s court has documented Hollowlands incursions for generations — and has protocols the Empire has never developed.',
    lore:'"She has seen this before. Not in this life."',
    type:'kingdom' },
  { id:'mash', name:'Mash', sub:'Eastern Highlands', lat:1260, lng:1950,
    desc:'A highland territory maintaining uneasy independence from the Atras Empire. Scholars here have preserved pre-Empire cosmological records the Empire tried to destroy.',
    lore:'"The oldest library in the known world is in Mash. It has a room no one has opened in four hundred years."',
    type:'territory' },
  { id:'northern-utu', name:'Northern Utu', sub:'Northern Frontier', lat:1638, lng:1410,
    desc:'The contested northern frontier — cold, mineral-rich, never fully pacified. Soldiers report strange lights. Command has stopped filing the reports.',
    lore:'"Posted to Northern Utu for insubordination. Did not return unchanged."',
    type:'territory' },
  { id:'southern-utu', name:'Southern Utu', sub:'Central Corridor', lat:1218, lng:1260,
    desc:'The agricultural belt connecting the northern frontier to the Atras heartland. Southern Utu feeds the empire — and has been the site of three unreported Hollowlands incursions in the past decade.',
    lore:'The harvest reports from Southern Utu no longer match the census.',
    type:'territory' },
  { id:'sham', name:'Sham', sub:'Northern Trade Hub', lat:1470, lng:1800,
    desc:'The most cosmopolitan city in the known world. More languages spoken here than anywhere else. Also where the first documented Hollowlands incursion was reported to the public — then classified within six hours.',
    lore:'"Four witnesses were relocated. No one asked where."',
    type:'city-state' },
  { id:'western-azu', name:'Western Azu', sub:'Southern Coast', lat:945, lng:1860,
    desc:'A coastal territory with deep maritime traditions. Western Azu maintains a navy capable of challenging Atras expansion by sea and navigates by stars that appear in no Atras chart.',
    lore:'"The sailors of Western Azu do not fear the Sea of Niads. The Niads fear them."',
    type:'territory' },
  { id:'eastern-azu', name:'Eastern Azu', sub:'Far Eastern Coast', lat:903, lng:2160,
    desc:'The eastern edge of the mapped world. Beyond Eastern Azu, the oldest maps carry a notation that translates roughly as: "here the water remembers."',
    lore:'"The Realms of Shamash-Reish lie further east. No Atras vessel has returned from that bearing."',
    type:'territory' },
  { id:'og', name:'OG', sub:'Southern Lowlands', lat:420, lng:660,
    desc:'Ancient pre-Empire territory. OG operates under a council of memory-keepers whose oral tradition stretches back to the First Fracture — deliberately unwritten so it cannot be confiscated.',
    lore:'"What they know cannot be seized. That was the decision."',
    type:'territory' },
  { id:'matgul', name:'Matgul', sub:'Southern Lowlands', lat:462, lng:840,
    desc:'A lowland territory caught between OG tradition and Atras administrative pressure. Matgul is the borderland where both systems fail.',
    lore:'Three governors sent from Nin. None completed a full term.',
    type:'territory' },
  { id:'sea-niads', name:'Sea of Niads', sub:'Central Sea', lat:1092, lng:2166,
    desc:'The great central sea connecting eastern and western territories. The Niads — semi-divine water-beings from pre-Empire mythology — are said to still surface in certain seasons. Sailors have protocols.',
    lore:'"Leave an offering at Tiegates harbor before crossing. This is not tradition. This is instruction."',
    type:'water' },
  { id:'sea-frost', name:'Sea of Frost', sub:'Northern Waters', lat:1764, lng:2340,
    desc:'The cold northern sea. Navigation charts beyond the sea\'s center are incomplete — expeditions sent to map the far side returned with fewer crew than expected and would not describe what they had seen.',
    lore:'The sea does not freeze. It merely grows quiet.',
    type:'water' },
];

// ── CITIES ────────────────────────────────────────────────────
window.CITIES = [
  { name:'Nin', lat:882, lng:1350, capital:true, desc:'Capital of the Atras Empire. The psychic warfare program operated from a facility beneath the administrative quarter.' },
  { name:'Atras-Un', lat:1218, lng:1350, capital:false, desc:'Northern administrative center of the Empire.' },
  { name:'Atras-Dur', lat:1155, lng:1512, capital:false, desc:'Eastern gateway city and military staging post.' },
  { name:'Erra', lat:1113, lng:1428, capital:false, desc:'Named for the ancient god of plague and war. The name is older than the city.' },
  { name:'Mish', lat:966, lng:1260, capital:false, desc:'Trade junction between the western kingdoms and the Empire heartland.' },
  { name:'Belu (Dragon Head)', lat:1344, lng:1170, capital:false, desc:'A fortified northern outpost named for its geographic profile from the air.' },
  { name:'Kori', lat:1470, lng:882, capital:false, desc:'Last Atras garrison before the northern Kur Deadlands boundary.' },
  { name:'Caeth Nul', lat:1596, lng:1260, capital:false, desc:'A frontier settlement that has been abandoned and resettled four times. The current population does not ask why.' },
  { name:'Caeti', lat:882, lng:1800, capital:false, desc:'Western Azu\'s primary port. The harbor pilots navigate without instruments.' },
  { name:'Tish', lat:1197, lng:1764, capital:false, desc:'A city that manages the flow of trade between Mash and the coastal territories.' },
  { name:'Matgul City', lat:462, lng:840, capital:false, desc:'Administrative center of the Matgul territory. Three governors sent from Nin. None completed a full term.' },
];

// ── LAYER DEFINITIONS ─────────────────────────────────────────
// Add new layers here. Each layer is togglable independently.
window.LAYER_DEFS = [
  { id:'regions',  label:'Regions',       default:true  },
  { id:'cities',   label:'Cities',        default:true  },
  { id:'lore',     label:'Lore Markers',  default:false },
  // Future layers — add without changing map logic:
  // { id:'faction',  label:'Factions',      default:false },
  // { id:'cards',    label:'Card Sites',    default:false },
  // { id:'weather',  label:'Weather',       default:false },
];
