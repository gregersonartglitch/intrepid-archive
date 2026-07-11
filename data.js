// ═══════════════════════════════════════════════════════════════
// INTREPID DUSK — HOLLOWLANDS MAP DATA
// The Cartographer Archive — VIP Patron Access
// ═══════════════════════════════════════════════════════════════

window.MAP_CONFIG = {
  image: 'map5.jpg',
  width: 8192,
  height: 8192,
  password: 'hollowlands',
  minZoom: -5,
  maxZoom: 0,
  ksLink: 'https://www.kickstarter.com/projects/intrepidduskvolume1/intrepid-graphic-novel-volume-1'
};

// ═══════════════════════════════════════════════════════════════
// LOCATIONS — 71 Entries
// ═══════════════════════════════════════════════════════════════

window.LOCATIONS = [

  // ─────────────────────────────────────────────────────────────
  // REGIONS (15)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'atras-empire',
    name: 'Atras Empire',
    sub: 'Capital: Nin',
    type: 'region',
    lat: 3836,
    lng: 3268,
    desc: 'The iron-clad heart of the Hollowlands, stretching from the Kur borderlands to the coast of Azu, its dominion held by the long memory of conquest. Every road leads to Nin; no road leads back unchanged.',
    lore: '"The Empire does not expand. It remembers territory it has not yet taken."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'kur-north',
    name: 'Kur Deadlands',
    sub: 'Northern Reach',
    type: 'region',
    lat: 7084,
    lng: 1024,
    desc: 'Where Kur\'s northern reach turns the soil to ash and the sky to bruised twilight, trees grow downward with roots clawing at the air.',
    lore: '"We mapped the northern border on three separate expeditions. Each time the border had moved south. On the fourth expedition, we did not go."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'kur-south',
    name: 'Kur Deadlands',
    sub: 'Southern Reach',
    type: 'region',
    lat: 1954,
    lng: 350,
    desc: 'Where the underworld\'s southern jaw presses the living lands, the ground is warm and copper-scented, and bones surface without burial in intentional patterns.',
    lore: '"The southern Kur does not roar. It whispers. This is worse."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'golden-wastes',
    name: 'Golden Wastes of Utu-Raman',
    sub: 'Far West',
    type: 'region',
    lat: 2682,
    lng: 786,
    desc: 'A sun-scorched expanse of sand and petrified forest where the light bends, pools, and sometimes solidifies into humming glass columns.',
    lore: '"Utu-Raman is not a desert. It is a scar where the sun pressed too long against the wound of the splitting."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'moon-queen-kingdom',
    name: 'Kingdom of the Moon Queen',
    sub: 'Western Territories',
    type: 'region',
    lat: 3804,
    lng: 1222,
    desc: 'The last sovereign territory not claimed by Titan or Empire, locked in perpetual silver dusk. The kingdom appeared within living memory, carved from wilderness by a woman no one could place, who spoke with an authority the wilderness obeyed.',
    lore: '"She came from nowhere with nothing and built a kingdom that the Titans cannot enter. Ask yourself what manner of woman accomplishes this."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'mash',
    name: 'Mash',
    sub: 'Eastern Highlands',
    type: 'region',
    lat: 5406,
    lng: 5290,
    desc: 'Stepped plateaus of black basalt consecrated to Mash, god of justice and the weighing of souls, where verdicts arrive written in frost on stone.',
    lore: '"Mash does not punish the guilty. Mash reveals that everyone is guilty. The difference is degree."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'northern-utu',
    name: 'Northern Utu',
    sub: 'Northern Frontier',
    type: 'region',
    lat: 6630,
    lng: 3584,
    desc: 'The frontier where the Empire\'s reach thins and garrison towns dot the land like teeth in a broken jaw. Imperial law here is more suggestion than mandate.',
    lore: '"The Emperor\'s writ runs as far as his soldiers\' torches cast light. In Northern Utu, the torches gutter often."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'southern-utu',
    name: 'Southern Utu',
    sub: 'Central Corridor',
    type: 'region',
    lat: 6172,
    lng: 3412,
    desc: 'The heartland corridor of escorted caravans, abundant harvests, and ruinous tithes, where the world works as it should, which is precisely the problem.',
    lore: '"Order is the Empire\'s gift. Order is the Empire\'s chain. In Southern Utu, you cannot tell the difference."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'sham-territory',
    name: 'Sham',
    sub: 'Northern Trade Territory',
    type: 'region',
    lat: 5810,
    lng: 4609,
    desc: 'Fog-choked valleys and shifting merchant roads in the domain of Sham, god of passage, where what is lost is not always gone but merely changed owners.',
    lore: '"Sham is the god of the space between. His territory is the space between what you had and what you will never recover."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'western-azu',
    name: 'Western Azu',
    sub: 'Southern Coast',
    type: 'region',
    lat: 3562,
    lng: 4172,
    desc: 'Rust-colored cliffs crumbling into the sea, where fishing villages cling to the rock and scales wash ashore after storms.',
    lore: '"Azu sleeps beneath the southern coast. The earthquakes are not geological. They are breathing."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'eastern-azu',
    name: 'Eastern Azu',
    sub: 'Far Eastern Coast',
    type: 'region',
    lat: 3038,
    lng: 5464,
    desc: 'The Dragon\'s far eastern coast, where the land fractures into archipelagos and the Empire holds a single customs house whose soldiers stopped filing reports.',
    lore: '"The eastern coast is not the edge of the map. It is the edge of what we are permitted to know."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'og',
    name: 'OG',
    sub: 'Southern Lowlands',
    type: 'region',
    lat: 1007,
    lng: 3728,
    desc: 'Low marshlands on petrified-wood stilts, where the people keep memory-keepers instead of written histories, their oral records predating the splitting.',
    lore: '"OG remembers Dilmun. OG remembers what we were before we were halved. Do not ask them to share this memory unless you are prepared to weep."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'matgul',
    name: 'Matgul',
    sub: 'Southern Lowlands',
    type: 'region',
    lat: 1736,
    lng: 2332,
    desc: 'A dense-canopied breadbasket of slow rivers and endless orchards whose fertility is not natural but transactional: something beneath the soil is being fed.',
    lore: '"Matgul gives and gives and gives. One day it will present the bill. The wise have already begun to save."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'sea-niads',
    name: 'Sea of Niads',
    sub: 'Central Sea',
    type: 'water',
    lat: 3658,
    lng: 5804,
    desc: 'A warm, unnaturally calm inland sea the color of old copper, where ships that cross it lose hours, sometimes days.',
    lore: '"The Niads do not drown sailors. They invite them below to see something beautiful. No sailor has ever described what they saw."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'sea-frost',
    name: 'Sea of Frost',
    sub: 'Northern Waters',
    type: 'water',
    lat: 7084,
    lng: 5120,
    desc: 'A frozen northern expanse that crystallizes in geometric patterns forming glyphs in a language predating the Nine.',
    lore: '"The Sea of Frost is not frozen water. It is frozen time. Beneath the ice, yesterday is still happening."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // CAPITAL (1)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'nin',
    cartographerSite: true,
    name: 'Nin',
    sub: 'Imperial Capital of the Atras Empire',
    type: 'capital',
    lat: 3206,
    lng: 3780,
    desc: 'The obsidian crown of the Hollowlands, concentric rings of black stone, each wall higher, each gate narrower. At its center stands the Throne Spire of fused volcanic glass, older than the Empire. Nin was not built but excavated.',
    lore: '"Nin is named for the god of sovereignty. The god is dead. The sovereignty remains. Draw your own conclusions."',
    journeyStep: null,
    volume1: true
  },

  // ─────────────────────────────────────────────────────────────
  // CITIES (14)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'atras-un',
    name: 'Atras-Un',
    sub: 'Northern Administrative Center',
    type: 'city',
    lat: 4814,
    lng: 2837,
    desc: 'The Empire\'s northern seat of clerks and quiet disappearances, where underground vaults hold more names than the living population warrants.',
    lore: '"Atras-Un knew your name before you were born. It has already filed the date of your death; it simply hasn\'t informed you yet."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'atras-dur',
    name: 'Atras-Dur',
    sub: 'Eastern Gateway City',
    type: 'city',
    lat: 4422,
    lng: 3584,
    desc: 'The Empire\'s eastern gateway, where bronze scales above the gate are said to measure not goods but the honesty of the merchant.',
    lore: '"The scales above the gate have tilted to the left for eleven years. No one has been permitted to ask what this means."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'atras-lin',
    cartographerSite: true,
    name: 'Atras-Lin',
    sub: 'Western River Crossing',
    type: 'city',
    lat: 3334,
    lng: 2880,
    desc: 'The river city guarding the only reliable crossing between the Empire\'s heartland and the Moon Queen\'s territory, where soldiers and diplomats eye each other across the central bridge with professional suspicion.',
    lore: '"Atras-Lin is a handshake between two powers who would prefer a fist. The bridge holds. For now, the bridge holds."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'erra',
    cartographerSite: true,
    name: 'Erra',
    sub: 'City of the War God',
    type: 'city',
    lat: 4876,
    lng: 2334,
    desc: 'The war-city of Erra, father of Atrus Nul: windowless barracks, amphitheaters stained with old blood, the Pillar of Lament where conquered names are etched too small to read without kneeling. Elena found war here is not an event but a permanent condition.',
    lore: '"Erra is not a place where wars begin. Erra is the place where the idea of war lives when it is not being used."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'mish',
    cartographerSite: true,
    name: 'Mish',
    sub: 'Seat of the Last Human Kings',
    type: 'city',
    lat: 3136,
    lng: 2504,
    desc: 'Market stalls and caravansary commerce fill the streets of Mish, where empty thrones sit in the old palace district and no one asks who broke the dynasty. Atrus Nul purged the last human kings here without declaration; the city survived, the crown did not, and the broken hills around it keep the Empire from finishing the job.',
    lore: '"Mish remembers its kings the way a scar remembers the wound: not with grief, but with the shape."',
    journeyStep: 4,
    volume1: true
  },
  {
    id: 'denegoth',
    cartographerSite: true,
    name: 'Denegoth',
    sub: 'Mountain of the Mish Borderlands',
    type: 'sacred',
    lat: 3420,
    lng: 2900,
    desc: 'Denegoth rises northeast of Mish like a clenched fist over the Plains of Yahor. Here Atrus Nul broke the last Mish warrior-kings: Lugal Esugar made his final stand, was brought before the Titan on his knees, begged for his life, and was dragged down anyway.',
    lore: '"Denegoth remembers ten thousand warriors on its heights, one king on his knees, and the silence after. The mountain does not sleep. It waits."'
  },
  {
    id: 'belu',
    cartographerSite: true,
    name: 'Belu (Dragon Head)',
    sub: 'Dragon Head Fortress',
    type: 'city',
    lat: 5716,
    lng: 2048,
    desc: 'A fortress-city carved into the Dragon Head cliff face, its towers shaped like horned skulls of creatures that no longer roam the Hollowlands. The garrison watches north toward Kur. They do not sleep.',
    lore: '"Belu guards the line between the world of the living and the world of the patient dead. The dead, it should be noted, are extremely patient."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'kori',
    name: 'Kori',
    sub: 'Last Garrison Before Kur',
    type: 'city',
    lat: 5942,
    lng: 1876,
    desc: 'The last garrison before Kur, built for retreat: gates facing south, walls thickest on the north, granaries holding three years\' provisions.',
    lore: '"Kori does not defend the Empire from Kur. Kori defends the Empire from knowing what Kur has already become."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'caeth-nul',
    cartographerSite: true,
    name: 'Caeth Nul',
    sub: 'The Abandoned City',
    type: 'city',
    lat: 6854,
    lng: 2732,
    desc: 'A city evacuated in a single night by Imperial decree, no explanation offered or permitted. It stands intact: doors open, tables set, candles burned to their bases. Those who enter hear footsteps matching their own, one half-beat behind.',
    lore: '"Four witnesses were relocated. No one asked where. No one asks why Caeth Nul was emptied. Asking is itself an answer to a question you do not want posed."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'caeti',
    cartographerSite: true,
    name: 'Caeti',
    sub: 'Port of Western Azu',
    type: 'city',
    lat: 2550,
    lng: 5374,
    desc: 'The principal port of the western Azu coast, where Dragon-territory trade meets Imperial commerce in contested tariffs. The harbor sits in the hollow of an ancient claw mark that the locals insist Azu herself carved into the coastline.',
    lore: '"Caeti was built in the Dragon\'s palm print. The merchants find this charming. The merchants have not considered what happens when the hand closes."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'tish',
    name: 'Tish',
    sub: 'Eastern Trade City',
    type: 'city',
    lat: 4792,
    lng: 4134,
    desc: 'An eastern trade city of translators and money-changers, where the architecture shifts block by block between Sham, Imperial, and Azu styles.',
    lore: '"Tish has been conquered fourteen times. Each conqueror found the city already flying their flag. The city is faster than armies."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'brea',
    cartographerSite: true,
    name: 'Brea',
    sub: 'City of Scribes',
    type: 'city',
    lat: 3942,
    lng: 2678,
    desc: 'The ink-stained city where the Hollowlands commits its permitted knowledge to page, its libraries carved into a mountainside and guarded by archivists whose authority exceeds any general\'s. Elena found answers here, and questions she had not thought to ask.',
    lore: '"The scribes of Brea do not record history. They negotiate with it. The pen, in Brea, is not mightier than the sword; it is the sword with a different handle."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'tihr',
    name: 'Tihr',
    sub: 'Last City Before the East',
    type: 'city',
    lat: 4038,
    lng: 4628,
    desc: 'The last Imperial city before the eastern autonomies, its iron gate bearing a single Old Hollowlands word: "Certain?"',
    lore: '"Tihr is not a destination. Tihr is the last place you can change your mind. After Tihr, the road changes yours."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'maji',
    name: 'Maji',
    sub: 'Southern Cliff Port',
    type: 'city',
    lat: 1466,
    lng: 3476,
    desc: 'A vertical city carved into southern sea cliffs, accessible only by rope-lift, where smugglers and fishers live beyond the Empire\'s convenient reach.',
    lore: '"Maji has never been conquered. Maji has never been worth the climb. These two facts are deliberately related."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'skull-city',
    cartographerSite: true,
    name: 'Skull City',
    sub: 'Necropolis of the Eastern Wastes',
    type: 'city',
    lat: 5041,
    lng: 4971,
    desc: 'A city built from the calcified remains of a creature so vast its skull serves as the civic hall. Bone-traders and theologians work its streets, attempting to identify what died here. The eye sockets face east and glow on certain nights.',
    lore: '"The creature that became Skull City did not die. It stopped moving. The distinction matters more than the residents care to admit."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // TOWNS / SETTLEMENTS (6)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'matgul-city',
    name: 'Matgul City',
    sub: 'Administrative Center',
    type: 'town',
    lat: 1930,
    lng: 2642,
    desc: 'An administrative hub of living wood whose walls sprout leaves and whose bureaucrats work barefoot in direct contact with the soil.',
    lore: '"Matgul City does not govern the territory. It translates the territory\'s wishes into language the Empire can understand."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'port-sham',
    cartographerSite: true,
    name: 'Port of Sham',
    sub: 'Northern Harbor',
    type: 'town',
    lat: 5575,
    lng: 4645,
    desc: 'The fog-shrouded harbor at the edge of Sham territory, where ships arrive bearing cargo the manifests describe only as "miscellaneous." The port operates on barter because the fog makes it impossible to verify denominations.',
    lore: '"Ships dock at Port of Sham with full crews and leave with fewer. The missing do not drown. They simply find the fog more honest than the shore."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'og-council',
    name: 'OG Council Grounds',
    sub: 'Memory-Keeper Assembly',
    type: 'town',
    lat: 602,
    lng: 3798,
    desc: 'Standing stones worn smooth by generations of hands, where OG\'s memory-keepers convene to recite unwritten histories beneath petrified trees.',
    lore: '"The Council does not meet to decide the future. The Council meets to ensure the past does not change while no one is watching."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'tiegates',
    name: 'Tiegates Harbor',
    sub: 'Offering Point',
    type: 'town',
    lat: 3430,
    lng: 5292,
    desc: 'A harbor where vessels leave offerings on stone shelves before crossing the Sea of Niads. By morning they are gone, though the tides do not reach the upper shelves.',
    lore: '"Leave an offering at Tiegates harbor before crossing. This is not tradition. This is instruction."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'caeti-bay',
    name: 'Caeti Bay',
    sub: 'Sheltered Anchorage',
    type: 'town',
    lat: 2702,
    lng: 5094,
    desc: 'A sheltered anchorage of repair docks and quiet sailors, where the water is unusually clear and lights blink in sequence far below the surface.',
    lore: '"The bay is deep. The bay is patient. The bay remembers every hull that ever crossed it, and some that have not crossed yet."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'dragon-head',
    name: 'Dragon Head Peninsula',
    sub: 'Northern Outcrop',
    type: 'town',
    lat: 5830,
    lng: 2134,
    desc: 'A rocky promontory shaped like a horned skull, where stone-cutters maintain fire beacons along its spine.',
    lore: '"The peninsula is shaped like a dragon\'s head. It has been measured precisely. It is getting longer."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // STORY LOCATIONS (8)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'hollowgate',
    name: 'The Hollowgate',
    sub: 'Threshold Between Worlds',
    type: 'story',
    lat: 2042,
    lng: 1700,
    desc: 'The wound where the boundary between the Clockwork and the Hollowlands thins enough to breach: an absence where reality stutters and the air tastes of static. Elena\'s passage began here, though whether she found the door or the door found her remains debated.',
    lore: '"They did not discover the door. They were the door."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'crossing-pool',
    name: 'The Crossing Pool',
    sub: 'Where Elena Arrived',
    type: 'story',
    lat: 4249,
    lng: 4193,
    desc: 'A still, black pool no wider than a room, ringed by scorch-marked stones where Elena surfaced into a world that recognized her before she recognized it. The water is warm regardless of season, and those who kneel beside it sometimes see a reflection that moves without them.',
    lore: '"The pool does not connect two places. It connects two versions of one place that forgot it was whole."',
    journeyStep: 1,
    volume1: true,
    art: 'crossing-pool.jpg'
  },
  {
    id: 'dawn-spear',
    name: 'Dawn Spear Clearing',
    sub: 'Where the Weapon Was Found',
    type: 'story',
    lat: 4221,
    lng: 4189,
    desc: 'A clearing in the Matgul canopy where light falls in a single shaft regardless of cloud or hour. Here Elena found the Dawn Spear waiting in the hollow of a dead tree, untouched by rot, humming at a frequency she recognized though she had never heard it before.',
    lore: '"The Spear was not forged. The Spear was promised. It waited in the wood for the one who would carry the promise forward."',
    journeyStep: 2,
    volume1: true
  },
  {
    id: 'sabellas-hut',
    name: 'Sabella\'s Hut',
    sub: 'The Grandmother\'s Shelter',
    type: 'story',
    lat: 4285,
    lng: 4168,
    desc: 'A dwelling of woven branches and river clay between Matgul and OG, larger inside than out. Elena found her grandmother\'s traces here: a book left open, star charts marked in a hand she knew, and a letter begun and never finished.',
    lore: '"Sabella came to the Hollowlands carrying grief and something she never set down. She built a life from the one and buried the other. Which was which depends on who tells it."',
    journeyStep: 3,
    volume1: true,
    art: 'sabellas-hut.jpg',
    revealRadius: 150
  },
  {
    id: 'monastery-wind',
    name: 'Monastery of the Wind',
    sub: 'Oracle\'s Sanctuary',
    type: 'story',
    lat: 4311,
    lng: 4509,
    desc: 'A sanctuary carved into a windswept peak, a golden tree at its heart, visible for a day\'s ride. The Oracle Isin Ada reads what is coming in its dust and its leaves. Elena climbed here for direction and received a prophecy she did not want.',
    lore: '"A book of gold winds around the tree, an old mechanism that scrolls at the Oracle\'s word and presses buried truths onto foil the tree yields like leaves, as if the wood still remembers the words. Three will rise, it has read: One Dusk, One Dark, One Dawn, and the Stone undone. Isin Ada spoke this once and wept for six days."',
    journeyStep: 5,
    volume1: true,
    art: 'monastery-wind.jpg'
  },
  {
    id: 'ashal',
    cartographerSite: true,
    name: 'Ashal',
    sub: 'The Pilgrim\'s Rest',
    type: 'town',
    lat: 4223,
    lng: 4585,
    desc: 'The last settlement before the climb to the Monastery of the Wind, where pilgrims leave behind what they cannot carry up. The town asks no questions about where you are going or why.',
    lore: '"Leave what you cannot carry. Take only what the Oracle can see through. Ashal asks nothing else of you."',
    journeyStep: null,
    volume1: true,
    art: 'ashal.jpg'
  },
  // moon-stronghold retired (build 168): fortress is in Sinn itself — not a separate hotspot
  {
    id: 'tower-nine',
    name: 'Tower of the Nine',
    sub: 'Ruins of the Banished Age',
    type: 'story',
    lat: 4568,
    lng: 4097,
    desc: 'A tower of nine stories, one for each old god the Tetrad cast into Kur, older than the Empire or the Titan courts. At its heart sits the Maxim Stone, ringed by statues of the Nine that face inward, toward the Stone, not outward. Whatever the Tower was built to contain, it has not forgotten.',
    lore: '"The Tower was not built to honor the Nine. It was built to cage them. The ceremonies are not worship. They are lockpicking."',
    journeyStep: 6,
    volume1: true,
    art: 'tower-nine.jpg'
  },
  {
    id: 'maxim-stone',
    name: 'The Maxim Stone',
    sub: 'The Barrier Between Worlds',
    type: 'story',
    lat: 4468,
    lng: 4085,
    desc: 'A monolith no taller than a person, holding the world\'s two halves apart. Light bends, sound delays, and standing near it feels like two realities pressing through a crack no wider than a heartbeat. This is where Elena\'s path ended and the prophecy began to prove itself.',
    lore: '"The Stone does not separate the worlds. The Stone is the wound\'s suture. Remove it and the wound reopens. The wound is the size of everything."',
    journeyStep: null,
    volume1: true,
    art: 'maxim-stone.jpg'
  },

  // ─────────────────────────────────────────────────────────────
  // SACRED / ANCIENT SITES (6)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'temple-ae',
    name: 'Temple of AE',
    sub: 'Shrine of the Divine River',
    type: 'sacred',
    lat: 2972,
    lng: 5120,
    desc: 'A half-submerged temple where pilgrims wade chest-deep to leave prayers on dissolving paper, and purification shares a border with drowning.',
    lore: '"AE does not answer prayers. AE dissolves them. What remains after the dissolution is the truth you were too afraid to pray for."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'gates-ningal',
    name: 'Gates of Ningal',
    sub: 'Underworld Gateway',
    type: 'sacred',
    lat: 2772,
    lng: 1246,
    desc: 'Twin bone-white pillars marking the underworld\'s most stable entrance, where the air shimmers and shadows face the wrong direction.',
    lore: '"Ningal\'s gates open both ways. Entering is simple. Leaving requires remembering your name, and Ningal is very good at making you forget."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'irridari-citadel',
    name: 'Irridari Citadel',
    sub: 'Fortress of Atrus Nul',
    type: 'sacred',
    lat: 3658,
    lng: 3584,
    desc: 'The seat of Atrus Nul, Titan emperor, son of Erra, built to mock human proportion: doorways forty feet high, corridors wide for beings that have not walked the surface in an age. It is occupied by something that rarely moves, but when it does, Nin trembles.',
    lore: '"Atrus Nul is not a king. Atrus Nul is a geological event with opinions. The Citadel is where he waits, and he has been waiting long enough to become patient."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'kur-border',
    name: 'Kur Border Wall',
    sub: 'The Boundary That Moves',
    type: 'sacred',
    lat: 4200,
    lng: 656,
    desc: 'A wall of unidentifiable material that shifts southward by inches each year, separating the living lands from Kur. It hums lullabies at night.',
    lore: '"Before the Empire had a name, Kur had a border. That border is moving. It has always been moving."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'dilmun-ruins',
    name: 'Dilmun Ruins',
    sub: 'Remnants of the First World',
    type: 'sacred',
    lat: 3658,
    lng: 2220,
    desc: 'Ruins that appear ancient and freshly destroyed at once, as if the splitting is still occurring. You can feel the Clockwork pressing close here.',
    lore: '"Dilmun was not destroyed. Dilmun was divided. Half became your world. Half became ours. The ruins are what refused to choose a side."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // NEW REGIONS (4)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'elil',
    name: 'Elil',
    sub: 'Dominion of Wind and Shadow',
    type: 'region',
    lat: 4958,
    lng: 4633,
    desc: 'The perpetual twilight territory of the god Elil, where the land is neither dark nor light and compasses spin freely.',
    lore: '"Elil is not the absence of light. Elil is what light becomes when it has given up hope of reaching the ground."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'isle-of-dawn',
    name: 'Isle of Dawn',
    sub: 'Far Eastern Refuge',
    type: 'region',
    lat: 5486,
    lng: 6996,
    desc: 'A distant island visible only at sunrise, bearing pre-splitting ruins built for bodies shaped differently than ours. No two maps place it in the same position.',
    lore: '"The Isle of Dawn is where morning is manufactured. The sun does not rise; it is released, each day, from a cage on the island\'s highest peak."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'hope-rebellands',
    name: 'Hope Rebellands',
    sub: 'Contested Frontier',
    type: 'region',
    lat: 2797,
    lng: 2328,
    desc: 'The contested territory between the Empire\'s southern reach and OG, where resistance smolders like peat fire. Imperial maps label it "Pacified Southern District." "Pacified" has never, in the history of empire, meant what it claims.',
    lore: '"Hope is not a place. Hope is what happens when the Empire looks away for too long. In the Rebellands, the Empire has been looking away for years."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'dragons-tail',
    name: 'The Dragon\'s Tail',
    sub: 'Eastern Peninsula',
    type: 'region',
    lat: 3244,
    lng: 6100,
    desc: 'A narrow peninsula of warm, copper-veined stone tracing the outline of Azu the Dragon\'s tail from the world\'s splitting.',
    lore: '"The peninsula is not land. It is a scar left by something that moved through a world still soft. The scar has not healed. The scar is warm."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // NEW CITIES (5)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'sinn',
    name: 'Sinn',
    sub: 'Seat of the Moon Court',
    type: 'city',
    lat: 4414,
    lng: 1394,
    desc: 'The judicial heart of the Moon Queen\'s domain — and the silver-walled seat from which Sabella, Elena\'s grandmother, governs the last free territory in the Hollowlands. Verdicts are written in silver ink that fades by dawn; the streets spiral inward like a nautilus shell. Elena stood before her here and understood: rescue is not always what the rescued want.',
    lore: '"The Moon Queen built her throne from the wreckage of a life she chose to leave behind. She did not look back. Looking back is for those who believe they left something worth returning to."',
    journeyStep: 7,
    volume1: true
  },
  {
    id: 'indras-na',
    name: 'Indras Na',
    sub: 'Western Garrison',
    type: 'city',
    lat: 4448,
    lng: 1022,
    desc: 'The garrison that guards the Moon Queen\'s border against Imperial incursion, staffed by soldiers bound by oath, not conscription, to a queen they may never meet. The walls are lined with mirrors that turn moonlight into silver tripwires. Those who attempted siege spoke of blindness and the sound of laughter.',
    lore: '"Indras Na has never fallen. This is not because it cannot be taken. It is because those who try forget why they came."',
    journeyStep: 8,
    volume1: true
  },
  {
    id: 'armatu',
    name: 'Armatu',
    sub: 'The Broken Shield',
    type: 'city',
    lat: 3746,
    lng: 4436,
    desc: 'A city rebuilt atop its own rubble, its walls constructed from broken shield-stones that spell, from above, a single pre-Imperial word: "again."',
    lore: '"Armatu broke once. Armatu rebuilt. The second city is made from the bones of the first. This is not resilience. This is a threat."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'mirilis',
    name: 'Mirilis',
    sub: 'City of Whispers',
    type: 'city',
    lat: 3048,
    lng: 4418,
    desc: 'A city of porous stone that absorbs and re-emits speech hours after it was spoken, where espionage is not a profession but an atmospheric condition.',
    lore: '"In Mirilis, silence is the only currency that holds its value. The walls are not listening; they are remembering."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'mari',
    name: 'Mari',
    sub: 'Gateway to Elil',
    type: 'city',
    lat: 4716,
    lng: 4548,
    desc: 'The last city of reliable sunlight before Elil\'s twilight, where half the buildings face sun and half face shadow along the line where day and dusk negotiate.',
    lore: '"Mari is the threshold. Step through with eyes open and see where light ends. Step through with them closed and Elil decides what you see instead."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // NEW TOWNS (8)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'awan',
    name: 'Awan',
    sub: 'Northern Road-Post',
    type: 'town',
    lat: 4536,
    lng: 1828,
    desc: 'A road-post of provisional architecture where every building can be disassembled and relocated when the road shifts.',
    lore: '"Awan does not appear on the oldest maps. Awan appears on maps that have not been drawn yet. The town exists at the intersection of when and where."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'uduna',
    name: 'Uduna',
    sub: 'River Crossing',
    type: 'town',
    lat: 4547,
    lng: 2864,
    desc: 'A river crossing where the ferryman charges not in coin but in news, a hereditary post that has accumulated the knowledge of every crossing ever made.',
    lore: '"The river at Uduna flows one direction: away. Those who cross the wrong way find the far bank receding. The ferryman alone knows the current\'s terms."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'gal',
    name: 'Gal',
    sub: 'Mountain Pass Settlement',
    type: 'town',
    lat: 5572,
    lng: 3262,
    desc: 'A pass settlement where wind makes speech impossible and the town speaks in hand-signs. The pass appears artificial, as if something walked through the mountain.',
    lore: '"Gal is the eye of the needle through which the north must pass to reach the south. The needle, it should be noted, is not stationary."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'tal',
    name: 'Tal',
    sub: 'Northern Watch Post',
    type: 'town',
    lat: 5486,
    lng: 3756,
    desc: 'A northern watch post whose signal-fire relay reaches Nin in four hours, though messages sometimes arrive with words no operator added.',
    lore: '"Tal watches the north. The north watches back. The watchers of Tal sleep with their eyes open. This is not a figure of speech."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'fenxi',
    name: 'Fenxi',
    sub: 'Merchant\'s Rest',
    type: 'town',
    lat: 3888,
    lng: 3412,
    desc: 'A caravanserai where trade routes converge in competing currencies and a forty-hour market cycle that ignores the sun entirely.',
    lore: '"Fenxi never closes. Fenxi never sleeps. The merchants of Fenxi have replaced rest with commerce and found the exchange rate favorable."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'ddr',
    name: 'Ddr',
    sub: 'The Silent Quarter',
    type: 'town',
    lat: 3658,
    lng: 3072,
    desc: 'A settlement that lost its vowels to something that collects sounds, where the air swallows vibration and shouts stop three feet from the mouth.',
    lore: '"Ddr had a longer name once. Something took the rest of it. There are not enough syllables left to discuss what."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'azu-ran',
    name: 'Azu-Ran',
    sub: 'Eastern Shore Settlement',
    type: 'town',
    lat: 2090,
    lng: 6644,
    desc: 'A fishing village where nets haul coins from no known mint and pottery in uninvented languages, filed in a warehouse called the Library of the Not Yet.',
    lore: '"The sea off Azu-Ran gives back what it has not yet taken. Questioning the sea is an occupation with a short career."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'reok',
    name: 'Reok',
    sub: 'Southern Outpost',
    type: 'town',
    lat: 1592,
    lng: 3166,
    desc: 'The southernmost outpost, where authority thins to a flag and twelve soldiers. Shadows here fall in directions unrelated to the sun.',
    lore: '"Reok is where the map ends. Beyond it the cartographers decline responsibility. The line has been redrawn southward three times."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // NEW SACRED SITES (4)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'pillars-of-dusk',
    name: 'Pillars of Dusk',
    sub: 'Western Boundary Markers',
    type: 'sacred',
    lat: 7312,
    lng: 684,
    desc: 'Twin vitrified obelisks at the world\'s northwest edge, where compasses spin and distance becomes negotiable. They grew from the earth like teeth.',
    lore: '"The Pillars mark the edge of the known world. Beyond them the world continues; it simply stops being known."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'sacred-mountains',
    name: 'Sacred Mountains',
    sub: 'Peaks of the First Ascent',
    type: 'sacred',
    lat: 7312,
    lng: 6828,
    desc: 'Peaks in the far northeast that pierce the clouds and do not return, where the Nine first descended, leaving footprints in stone that still steam.',
    lore: '"The mountains are not tall. They are deep, inverted, reaching into a sky that is merely another kind of underground. The peaks are roots."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'the-gates',
    name: 'The Gates',
    sub: 'Passage to the Inner Territories',
    type: 'sacred',
    cartographerSite: true,
    gatedBehind: 'tower-nine',
    lat: 4132,
    lng: 4376,
    desc: 'Two sheer cliff faces leaning toward each other over the road to the eastern territories, forming a passage so narrow caravans proceed single-file. Those who pass through feel total darkness regardless of the hour, and the sensation of being counted.',
    lore: '"The Gates do not bar passage. The Gates record it. Every soul that has ever walked between them is noted in stone that no one can read. The Gates are patient. They are compiling a list."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'the-pillars',
    name: 'The Pillars',
    sub: 'Southern Boundary Stones',
    type: 'sacred',
    lat: 916,
    lng: 6828,
    desc: 'Stone columns on the southeastern shore, washed by surf every nine seconds without variation, bearing carvings that shift between visits as if still being edited.',
    lore: '"The Pillars are not monuments but punctuation. The sentence the world has been writing since the splitting is nearly complete."',
    journeyStep: null,
    volume1: false
  }
];

// ═══════════════════════════════════════════════════════════════
// ELENA'S JOURNEY — Volume 1 Path (11 Steps)
// ═══════════════════════════════════════════════════════════════

window.JOURNEY_PATH = [
  { step: 1, locationId: 'crossing-pool',  label: 'Into the Hollowlands' },
  { step: 2, locationId: 'dawn-spear',     label: 'Sabella\'s Clearing' },
  { step: 3, locationId: 'sabellas-hut',   label: 'Grandmother\'s Trail' },
  { step: 4, locationId: 'mish',           label: 'The Town' },
  { step: 5, locationId: 'monastery-wind', label: 'The Oracle' },
  { step: 6, locationId: 'tower-nine',     label: 'The Tower of the Nine' },
  { step: 7, locationId: 'sinn',           label: 'The Moon Court' },
  { step: 8, locationId: 'indras-na',      label: 'The Western Garrison' }
];

// ═══════════════════════════════════════════════════════════════
// LAYER DEFINITIONS
// ═══════════════════════════════════════════════════════════════

window.LAYER_DEFS = [
  { id: 'regions', label: 'Regions',              default: true },
  { id: 'cities',  label: 'Cities & Towns',       default: true },
  { id: 'story',   label: 'Volume 1 Locations',   default: true },
  { id: 'sacred',  label: 'Ancient Sites',        default: true },
  { id: 'journey', label: 'Elena\'s Journey',     default: true }
];
