// Script to update coordinates in data.js
const fs = require('fs');

const newCoords = {
  "atras-empire": { "lat": 3836, "lng": 3268 },
  "kur-north": { "lat": 7084, "lng": 1024 },
  "kur-south": { "lat": 1954, "lng": 350 },
  "golden-wastes": { "lat": 2682, "lng": 786 },
  "moon-queen-kingdom": { "lat": 3804, "lng": 1222 },
  "mash": { "lat": 5406, "lng": 5290 },
  "northern-utu": { "lat": 6630, "lng": 3584 },
  "southern-utu": { "lat": 6172, "lng": 3412 },
  "sham-territory": { "lat": 5810, "lng": 4609 },
  "western-azu": { "lat": 3562, "lng": 4172 },
  "eastern-azu": { "lat": 3038, "lng": 5464 },
  "og": { "lat": 495, "lng": 3750 },
  "matgul": { "lat": 1736, "lng": 2332 },
  "sea-niads": { "lat": 3658, "lng": 5804 },
  "sea-frost": { "lat": 7084, "lng": 5120 },
  "nin": { "lat": 3206, "lng": 3780 },
  "atras-un": { "lat": 4814, "lng": 2837 },
  "atras-dur": { "lat": 4422, "lng": 3584 },
  "atras-lin": { "lat": 3334, "lng": 2880 },
  "erra": { "lat": 4876, "lng": 2334 },
  "mish": { "lat": 3136, "lng": 2504 },
  "belu": { "lat": 5716, "lng": 2048 },
  "kori": { "lat": 5942, "lng": 1876 },
  "caeth-nul": { "lat": 6854, "lng": 2732 },
  "caeti": { "lat": 2550, "lng": 5374 },
  "tish": { "lat": 4792, "lng": 4134 },
  "brea": { "lat": 3942, "lng": 2678 },
  "tihr": { "lat": 4038, "lng": 4628 },
  "maji": { "lat": 1466, "lng": 3476 },
  "skull-city": { "lat": 5041, "lng": 4971 },
  "matgul-city": { "lat": 1930, "lng": 2642 },
  "port-sham": { "lat": 5575, "lng": 4645 },
  "og-council": { "lat": 602, "lng": 3798 },
  "tiegates": { "lat": 3430, "lng": 5292 },
  "caeti-bay": { "lat": 2702, "lng": 5094 },
  "dragon-head": { "lat": 5830, "lng": 2134 },
  "hollowgate": { "lat": 2042, "lng": 1700 },
  "crossing-pool": { "lat": 4249, "lng": 4193 },
  "dawn-spear": { "lat": 4221, "lng": 4189 },
  "sabellas-hut": { "lat": 4285, "lng": 4168 },
  "monastery-wind": { "lat": 4311, "lng": 4509 },
  "moon-stronghold": { "lat": 4442, "lng": 1406 },
  "tower-nine": { "lat": 4480, "lng": 4091 },
  "maxim-stone": { "lat": 4527, "lng": 4092 },
  "temple-ae": { "lat": 2972, "lng": 5120 },
  "gates-ningal": { "lat": 2772, "lng": 1246 },
  "lunar-clock": { "lat": 4504, "lng": 4093 },
  "irridari-citadel": { "lat": 3658, "lng": 3584 },
  "kur-border": { "lat": 4020, "lng": 374 },
  "dilmun-ruins": { "lat": 3658, "lng": 2220 },
  "elil": { "lat": 4958, "lng": 4633 },
  "isle-of-dawn": { "lat": 5486, "lng": 6996 },
  "hope-rebellands": { "lat": 2797, "lng": 2328 },
  "dragons-tail": { "lat": 3244, "lng": 6100 },
  "sinn": { "lat": 4414, "lng": 1394 },
  "indras-na": { "lat": 4448, "lng": 1022 },
  "armatu": { "lat": 3746, "lng": 4436 },
  "mirilis": { "lat": 3048, "lng": 4418 },
  "mari": { "lat": 4716, "lng": 4548 },
  "awan": { "lat": 4536, "lng": 1828 },
  "uduna": { "lat": 4547, "lng": 2864 },
  "gal": { "lat": 5572, "lng": 3262 },
  "tal": { "lat": 5486, "lng": 3756 },
  "fenxi": { "lat": 3888, "lng": 3412 },
  "ddr": { "lat": 3658, "lng": 3072 },
  "azu-ran": { "lat": 2090, "lng": 6644 },
  "reok": { "lat": 1592, "lng": 3166 },
  "pillars-of-dusk": { "lat": 7312, "lng": 684 },
  "sacred-mountains": { "lat": 7312, "lng": 6828 },
  "the-gates": { "lat": 4132, "lng": 4376 },
  "the-pillars": { "lat": 916, "lng": 6828 }
};

let data = fs.readFileSync('data.js', 'utf8');
let updated = 0;

for (const [id, coords] of Object.entries(newCoords)) {
  // Match: id: 'location-id', ... lat: NNNN, ... lng: NNNN
  const idPattern = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?)(lat:\\s*)\\d+(,[\\s\\S]*?)(lng:\\s*)\\d+`,
    ''
  );
  
  if (idPattern.test(data)) {
    data = data.replace(idPattern, `$1$2${coords.lat}$3$4${coords.lng}`);
    updated++;
  } else {
    console.log(`  WARNING: '${id}' not found in data.js`);
  }
}

fs.writeFileSync('data.js', data);
console.log(`Updated ${updated}/${Object.keys(newCoords).length} locations`);
