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
    desc: 'The beating, iron-clad heart of the Hollowlands. The Atras Empire stretches from the Kur borderlands to the coast of Azu, its dominion held not by love but by the long memory of conquest. The cartographers noted that every road in the known world eventually leads to Nin — and that no road leads back unchanged.',
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
    desc: 'The northern extent of Kur bleeds into the frost-line where the underworld\'s influence turns the soil to ash and the sky to a permanent bruised twilight. Trees here grow downward, roots clawing at the air. It is said that sound travels wrong in the Northern Reach — echoes arrive before the voice that cast them.',
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
    desc: 'Where the southern jaw of the underworld presses against the living lands, the ground is warm to the touch and smells of copper. The Southern Reach is quieter than its northern counterpart — a silence that the cartographers described as watchful. Bones surface here without burial, arranged in patterns that suggest intention.',
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
    desc: 'A vast expanse of sun-scorched sand and petrified forest that bears the name of the sun god Utu. The light here does not behave as light should — it bends, pools, and occasionally solidifies into glass columns that hum at frequencies below human hearing. Those who returned spoke of cities visible on the horizon that vanished upon approach.',
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
    lng: 1800,
    desc: 'The last sovereign territory not claimed by Titan or Empire. The Moon Queen\'s domain exists in a state of perpetual silver dusk, the sky overhead cycling through lunar phases regardless of the true moon\'s position. Records indicate the kingdom appeared approximately forty years ago, carved from wilderness by a woman who spoke with a strange accent and stranger authority.',
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
    desc: 'The highland territory consecrated to the underworld god Mash, whose dominion is justice and the weighing of souls. The terrain rises in stepped plateaus of black basalt, each level colder than the last. Travelers report the sensation of being observed and found wanting. Courts convene here without judges — the verdicts arrive written in frost on stone.',
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
    desc: 'The frontier beyond the Empire\'s comfortable reach, where Utu\'s solar influence wanes and the land grows strange. Garrison towns dot the region like teeth in a broken jaw. Northern Utu is technically Imperial territory, but the cartographers noted with some delicacy that Imperial law here is more suggestion than mandate.',
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
    desc: 'The sun-touched heartland corridor connecting the capital to the western territories. Southern Utu is the most traveled, most taxed, and most surveilled stretch of road in the Hollowlands. Caravans move under escort. The soil is rich, the harvests abundant, and the tithes ruinous. It is said that this is where the world works as it should — and that this is precisely the problem.',
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
    desc: 'The domain named for the underworld god of twilight and passage. Sham territory occupies the liminal north-east, a region of fog-choked valleys and merchant roads that seem to shift between seasons. Trade flourishes here despite — or perhaps because of — the region\'s reputation for making things disappear. What is lost in Sham is not always gone; sometimes it has merely changed owners.',
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
    desc: 'The coastal territory of Azu the Dragon, where the land crumbles into the sea in great rust-colored cliffs. Western Azu smells of salt and sulfur. Fishing villages cling to the rock face like barnacles, their inhabitants dark-eyed and tight-lipped about what surfaces in their nets. The Dragon\'s influence is felt in the heat that rises from tide pools and the scales that wash ashore after storms.',
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
    desc: 'The far eastern extent of the Dragon\'s domain, where the coastline fractures into archipelagos and sea-stacks crowned with ancient nesting sites. Eastern Azu is wilder than its western counterpart — the Empire\'s presence reduced to a single customs house staffed by soldiers who have stopped writing reports. Those who returned spoke of bioluminescent tides and songs rising from submerged caverns.',
    lore: '"The eastern coast is not the edge of the map. It is the edge of what we are permitted to know."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'og',
    name: 'OG',
    sub: 'Southern Lowlands',
    type: 'region',
    lat: 900,
    lng: 3750,
    desc: 'The low marshlands of OG, where the old ways persist beneath a thin veneer of Imperial compliance. The ground here does not support stone construction — buildings are raised on stilts of petrified wood harvested from the Kur border. The people of OG keep memory-keepers instead of written histories, and it is said their oral records predate the splitting of the world itself.',
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
    desc: 'A territory of dense canopy and slow-moving rivers where the vegetation grows with unsettling purpose. Matgul is the breadbasket of the southern Hollowlands — its orchards bear fruit in every season, its fields yield grain of unusual potency. The cartographers noted that the fertility of Matgul is not natural; it is transactional. Something beneath the soil is being fed in return.',
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
    desc: 'The great inland sea named for the water-spirits that ancient sailors swore inhabited its depths. The Sea of Niads is warm, unnaturally calm, and the precise color of old copper. Ships that cross it report losing hours — sometimes days — arriving at port with barnacle growth that suggests weeks of passage. The cartographers recommend coastal routes only.',
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
    desc: 'The frozen expanse that marks the northern boundary of the known Hollowlands. The Sea of Frost does not freeze in the manner of ordinary water — it crystallizes in geometric patterns that, viewed from sufficient altitude, form recognizable glyphs in a language predating the Nine. Ships that venture too far north return with hulls scored by claw marks from beneath the ice.',
    lore: '"The Sea of Frost is not frozen water. It is frozen time. Beneath the ice, yesterday is still happening."',
    journeyStep: null,
    volume1: false
  },

  // ─────────────────────────────────────────────────────────────
  // CAPITAL (1)
  // ─────────────────────────────────────────────────────────────

  {
    id: 'nin',
    name: 'Nin',
    sub: 'Imperial Capital of the Atras Empire',
    type: 'capital',
    lat: 3206,
    lng: 3780,
    desc: 'The obsidian crown of the Hollowlands. Nin rises from the central plains in concentric rings of black stone, each wall higher than the last, each gate narrower. At its heart stands the Throne Spire — a tower of fused volcanic glass that predates the Empire by millennia. It is said that Nin was not built but excavated, as though the city had always existed beneath the earth and merely required uncovering.',
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
    desc: 'The northern administrative seat of the Empire, where bureaucracy is conducted with the solemnity of religious rite. Atras-Un is a city of clerks, census-takers, and quiet disappearances. Every citizen of the northern territories is registered here — their name, lineage, and usefulness catalogued in vaults that extend seven stories underground. Records indicate that the vaults contain more names than the living population warrants.',
    lore: '"Atras-Un knows your name. It knew your name before you were born. It has already filed the date of your death — it simply hasn\'t informed you yet."',
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
    desc: 'The eastern gateway of the Empire, built where the trade roads fork toward Sham and the Azu coast. Atras-Dur is a city of warehouses and weigh-stations, its skyline dominated by the massive bronze scales that hang above the Eastern Gate — scales said to measure not the weight of goods but the honesty of the merchant. The city smells of spice, lamp oil, and the metallic tang of enforced commerce.',
    lore: '"The scales above the gate have tilted to the left for eleven years. No one has been permitted to ask what this means."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'atras-lin',
    name: 'Atras-Lin',
    sub: 'Western River Crossing',
    type: 'city',
    lat: 3334,
    lng: 2880,
    desc: 'The western river city that guards the only reliable crossing between the Empire\'s heartland and the Moon Queen\'s territory. Atras-Lin is perpetually damp, its stone bridges slick with moss, its lanterns burning blue from the mineral content of the local oil. Soldiers and diplomats eye each other across the central bridge with mutual, professional suspicion.',
    lore: '"Atras-Lin is a handshake between two powers who would prefer a fist. The bridge holds. For now, the bridge holds."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'erra',
    name: 'Erra',
    sub: 'City of the War God',
    type: 'city',
    lat: 4876,
    lng: 2334,
    desc: 'The war-city consecrated to the god whose name it bears — Erra, father of Atrus Nul, lord of plague and conflict. The architecture is brutal: windowless barracks, training amphitheaters stained dark with old blood, and the Pillar of Lament where the names of the conquered are etched in script too small to read without kneeling. Elena passed through this city and found that war is not an event here but a permanent atmospheric condition.',
    lore: '"Erra is not a place where wars begin. Erra is the place where the idea of war lives when it is not being used."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'mish',
    name: 'Mish',
    sub: 'Seat of the Last Human Kings',
    type: 'city',
    lat: 3136,
    lng: 2504,
    desc: 'Before the Titan wars reshaped everything, Mish was the seat of the human kings — the only sovereignty in the Hollowlands that answered to neither the Titan courts nor the old gods. For generations the Mish kings held the line, refusing to kneel while other kingdoms fell or were absorbed. They stood as a bulwark not through superior force but through will and the stubborn insistence that human law had a right to exist in a world being carved up by divine politics. But the warring Titans were patient. What could not be conquered was corrupted. The Mish kings began making compromises — small ones at first, then larger. Evil worked its way into the kingship the way water works into stone. By the time the last king\'s hands were fully dirty, there was nothing left worth defending. Atrus Nul moved on Mish without a formal declaration. The king and his sons were hunted down and made a public example of. The city survived. The dynasty did not. What you walk through now is a crossroads of market stalls and caravansary commerce — a city that has learned to ask no one about the empty thrones. The rough geography of the surrounding territory — broken hills and choked passes that swallow armies whole — has kept the Empire from completing what Atrus Nul began. Mish is technically rebel lands. The resistance is real but impotent: too fractured to threaten, too protected to erase. The Empire tolerates it the way you tolerate a bruise — not because it doesn\'t hurt, but because the cure is worse.',
    lore: '"Mish remembers its kings the way a scar remembers the wound — not with grief, but with the shape of it."',
    journeyStep: 4,
    volume1: true
  },
  {
    id: 'denegoth',
    name: 'Denegoth',
    sub: 'Mountain of the Mish Borderlands',
    type: 'sacred',
    lat: 2800,
    lng: 2200,
    desc: 'The mountain called Denegoth rises from the broken hills northwest of Mish like a clenched fist. The locals say it was here that the last Mish king made his final stand before Atrus Nul dragged him down. Whether that is history or myth depends on who you ask. What is certain is that the mountain has never been fully explored. The passes that wind through its lower slopes are treacherous, and the upper reaches are shrouded in a perpetual haze that the Mish call the Breath. Traders avoid it. Soldiers avoid it. The mountain does not care either way.',
    lore: '"Denegoth does not sleep. It waits."'
  },
  {
    id: 'belu',
    name: 'Belu (Dragon Head)',
    sub: 'Dragon Head Fortress',
    type: 'city',
    lat: 5716,
    lng: 2048,
    desc: 'The fortress-city perched on the Dragon Head Peninsula, named for the underworld god of beasts and boundaries. Belu is carved directly into the cliff face, its towers shaped to resemble the horned skulls of creatures that no longer roam the Hollowlands — or that roam it still, in places the cartographers declined to survey. The garrison here watches north, toward Kur, and they do not sleep in shifts. They simply do not sleep.',
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
    desc: 'The final Imperial garrison before the Kur Deadlands consume the landscape. Kori is a city built for retreat — its gates face south, its walls are thickest on the northern side, and its granaries hold three years\' provisions at any given time. The soldiers stationed here volunteer for the posting; it is said they are either the bravest in the Empire or the most eager to disappear.',
    lore: '"Kori does not defend the Empire from Kur. Kori defends the Empire from knowing what Kur has already become."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'caeth-nul',
    name: 'Caeth Nul',
    sub: 'The Abandoned City',
    type: 'city',
    lat: 6854,
    lng: 2732,
    desc: 'Once the second jewel of the Empire, now a silent monument to something the official histories do not name. Caeth Nul was evacuated in a single night — every man, woman, and child relocated by Imperial decree with no explanation offered or permitted. The city stands intact: doors open, tables set, candles burned to their bases. Those who enter report hearing footsteps that match their own, one half-beat behind.',
    lore: '"Four witnesses were relocated. No one asked where. No one asks why Caeth Nul was emptied. Asking is itself an answer to a question you do not want posed."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'caeti',
    name: 'Caeti',
    sub: 'Port of Western Azu',
    type: 'city',
    lat: 2550,
    lng: 5374,
    desc: 'The principal port of the western Azu coast, where Dragon-territory trade meets Imperial commerce in a haze of salt spray and contested tariffs. Caeti\'s harbor is built in the hollow of an ancient claw mark — a gouge in the coastline that the locals insist was made by Azu herself in a moment of territorial declaration. The docks creak with a rhythm that does not match the tide.',
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
    desc: 'The eastern trade city where Sham territory commerce flows into the broader Imperial economy. Tish is a city of translators, money-changers, and individuals whose profession is listed only as "facilitator." The architecture shifts block by block — Sham fog-stone giving way to Imperial basalt giving way to Azu coral-brick — as though the city cannot decide which power it belongs to.',
    lore: '"Tish has been conquered fourteen times. Each conqueror found the city already flying their flag. The city is faster than armies."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'brea',
    name: 'Brea',
    sub: 'City of Scribes',
    type: 'city',
    lat: 3942,
    lng: 2678,
    desc: 'The ink-stained city where the Hollowlands commits its permitted knowledge to page. Brea\'s libraries are carved into a mountainside, their entrances guarded not by soldiers but by archivists whose authority exceeds that of any general. Elena found answers here — and questions she had not thought to ask. It is said that Brea contains a copy of every document ever written in the Hollowlands, including several that have not been written yet.',
    lore: '"The scribes of Brea do not record history. They negotiate with it. The pen, in Brea, is not mightier than the sword — it is the sword, wearing a different handle."',
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
    desc: 'The final city of Imperial character before the eastern territories dissolve into the autonomies of Mash and the Azu coast. Tihr exists in a state of perpetual farewell — travelers stock provisions, write letters home, and settle debts before pressing east into territories where Imperial coin loses its authority. The city\'s famous iron gate faces east and bears a single word in Old Hollowlands script: "Certain?"',
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
    desc: 'A vertical city built into the face of the southern sea cliffs, accessible only by rope-lift or by a staircase of eleven hundred steps carved into the rock. Maji\'s inhabitants are fishers, smugglers, and those who find comfort in a city that is extraordinarily difficult to invade. The Empire tolerates Maji\'s independence because the alternative — a siege conducted entirely on ladders — is undignified.',
    lore: '"Maji has never been conquered. Maji has never been worth the climb. These two facts are, the cartographers suspect, deliberately related."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'skull-city',
    name: 'Skull City',
    sub: 'Necropolis of the Eastern Wastes',
    type: 'city',
    lat: 5041,
    lng: 4971,
    desc: 'A city constructed from and upon the calcified remains of a creature so vast that its skull serves as the central civic hall. Skull City is a place of bone-traders, relic merchants, and theologians attempting to identify what, precisely, died here. The creature\'s eye sockets face east, and on certain nights they glow with a phosphorescence that the residents have learned not to investigate.',
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
    desc: 'The modest administrative hub of the Matgul region, where harvest tallies are kept and territorial disputes are settled with an efficiency that borders on the supernatural. Matgul City is built of living wood — its walls sprout leaves in spring and its rooftops are carpeted in moss. The bureaucrats here conduct their business barefoot, in direct contact with the soil, and refuse to explain why.',
    lore: '"Matgul City does not govern the territory. It translates the territory\'s wishes into language the Empire can understand."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'port-sham',
    name: 'Port of Sham',
    sub: 'Northern Harbor',
    type: 'town',
    lat: 5575,
    lng: 4645,
    desc: 'The fog-shrouded harbor at the edge of Sham territory, where ships arrive from the eastern islands bearing cargo that the manifests describe only as "miscellaneous." Port of Sham operates on a barter economy — not because coin has no value here, but because the fog makes it impossible to verify denominations. Lanterns burn perpetually along the docks, though they illuminate nothing beyond their own glass.',
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
    desc: 'The sacred assembly ground where OG\'s memory-keepers convene beneath a canopy of petrified trees to recite the unwritten histories. The Council Grounds have no permanent structures — only rings of standing stones worn smooth by generations of hands. When the memory-keepers speak, the stones vibrate at frequencies that visitors feel in their teeth and their grief.',
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
    desc: 'A small harbor settlement on the Azu coast where tradition demands that every vessel leave an offering before crossing the Sea of Niads. The offerings are placed on stone shelves carved into the harbor wall — food, coin, small personal treasures — and by morning they are always gone. The harbor-master insists this is the work of tides. The tides do not reach the upper shelves.',
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
    desc: 'The sheltered anchorage south of Caeti proper, where ships wait for favorable winds or for the harbor-master\'s permission, whichever comes first. Caeti Bay is quieter than the main port — a place of repair docks, chandlers, and sailors telling stories they would not tell within the city walls. The water here is unusually clear, and those who look too long over the railings report seeing lights far below that blink in sequence.',
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
    desc: 'The rocky northern promontory that gives Belu its fortress-name, shaped unmistakably like the horned skull of a great wyrm. A small community of stone-cutters and signal-keepers maintains the fire beacons along the peninsula\'s spine. On storm nights, the wind through the rock formations produces a sound the locals call the Dragon\'s Murmur — a low, resonant moan that carries for miles and makes dogs refuse to go outdoors.',
    lore: '"The peninsula is shaped like a dragon\'s head. The cartographers measured it precisely. It is getting longer."',
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
    desc: 'The wound in the world where the boundary between the Clockwork and the Hollowlands grows thin enough to breach. The Hollowgate is not a structure but an absence — a place where reality stutters and the air tastes of static electricity and old stone. It is here that Elena\'s passage began, though whether she found the door or the door found her remains a matter of considerable and uneasy debate.',
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
    desc: 'A still, black pool of water no wider than a room, ringed by stones that bear the scorch marks of repeated transit. This is where Elena surfaced — gasping, disoriented, in a world that was not hers and yet recognized her with the familiarity of a mirror. The Crossing Pool is warm regardless of season, and those who kneel beside it sometimes see a reflection that moves independently of the viewer.',
    lore: '"The pool does not connect two places. It connects two versions of one place that forgot it was whole."',
    journeyStep: 1,
    volume1: true
  },
  {
    id: 'dawn-spear',
    name: 'Dawn Spear Clearing',
    sub: 'Where the Weapon Was Found',
    type: 'story',
    lat: 4221,
    lng: 4189,
    desc: 'A clearing in the dense Matgul canopy where the light falls in a single concentrated shaft regardless of cloud cover or time of day. It was here that Elena found the Dawn Spear — or rather, where the Dawn Spear permitted itself to be found. The weapon had waited in the hollow of a dead tree, untouched by rot, humming at a frequency that Elena recognized though she had never heard it before.',
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
    desc: 'A modest dwelling of woven branches and river clay, hidden in the borderland between Matgul and OG. Sabella\'s Hut is larger inside than outside — a trait its builder either could not or would not explain. Elena found traces of her grandmother here: a DOD field manual adapted into a gardening guide, star charts relabeled with Hollowlands constellations, and a letter, unfinished, addressed to someone named Nick.',
    lore: '"Sabella crossed from the Clockwork carrying only grief and a government-issued sidearm. She built a kingdom from one and buried the other. Which was which depends on who tells the story."',
    journeyStep: 3,
    volume1: true,
    art: 'sabellas-hut.jpg'
  },
  {
    id: 'monastery-wind',
    name: 'Monastery of the Wind',
    sub: 'Oracle\'s Sanctuary',
    type: 'story',
    lat: 4311,
    lng: 4509,
    desc: 'A sanctuary carved into a windswept peak where the Oracle Isin Ada reads the future in the patterns of dust storms. The Monastery is accessible only by a path that the wind erases nightly — pilgrims must find a new route each dawn. Elena climbed to the Oracle seeking direction and received instead a prophecy she did not want: three will rise, and the world will be unmade or remade, and she will be present for both.',
    lore: '"Three will rise. One Dusk, One Dark, One Dawn destroying Stone. Ushering the end. Isin Ada spoke this once and then wept for six days."',
    journeyStep: 5,
    volume1: true,
    art: 'monastery-wind.jpg'
  },
  {
    id: 'ashal',
    name: 'Ashal',
    sub: 'The Pilgrim\'s Rest',
    type: 'town',
    lat: 4200,
    lng: 4560,
    desc: 'The settlement at the base of the peak that holds the Monastery of the Wind — the last inhabited place before the climb begins. Ashal is where pilgrims leave behind what they cannot carry up: excess gear, pets, second-guessing. The town has grown entirely around the needs of those passing through it, and its people have a reputation for being extraordinarily helpful without asking a single question about where you are going or why. They have learned that the answers are never the business of the town.',
    lore: '"Leave what you cannot carry. Take only what the Oracle can see through. Ashal asks nothing else of you."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'moon-stronghold',
    name: 'Moon Queen\'s Stronghold',
    sub: 'Seat of the Moon Queen',
    type: 'story',
    lat: 4442,
    lng: 1900,
    desc: 'The silver-walled fortress from which Sabella — the woman who was once a DOD remote viewer, once a grieving fiancée, and is now the Moon Queen — governs the last free territory in the Hollowlands. The Stronghold gleams with a light that has no visible source, and its corridors rearrange according to the Queen\'s mood. Elena stood before her grandmother here and understood, for the first time, that rescue is not always what the rescued want.',
    lore: '"The Moon Queen built her throne from the wreckage of a life she chose to leave behind. She did not look back. Looking back is for those who believe they left something worth returning to."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'tower-nine',
    name: 'Tower of the Nine',
    sub: 'Ruins of the Banished Age',
    type: 'story',
    lat: 4480,
    lng: 4091,
    desc: 'An ancient tower of nine stories, one for each of the old gods the Tetrad cast into Kur. It has stood longer than any living institution in the Hollowlands — longer than the Empire, longer than the Titan courts — and the stone remembers it. At its heart sits the Maxim Stone, ringed by statues of the old gods in attitudes of judgment. The statues do not face outward. They face the Stone. Whatever the Tower was built to contain, it has not forgotten its purpose.',
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
    lat: 4527,
    lng: 4092,
    desc: 'The monolith that holds the two halves of the world apart. The Maxim Stone is not large — it stands only as tall as a person — but its presence distorts everything around it: light bends, sound delays, and anyone who approaches feels the weight of two realities pressing against each other through a crack no wider than a heartbeat. This is where Elena\'s first journey ended. This is where the prophecy began to prove itself.',
    lore: '"The Stone does not separate the worlds. The Stone is the wound\'s suture. Remove it and the wound reopens. The wound is the size of everything."',
    journeyStep: null,
    volume1: true
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
    desc: 'A flooded temple on the western Azu coast, half-submerged in a river that flows in two directions simultaneously. The Temple of AE is consecrated to the god of fresh water and purification, though the rituals practiced here suggest that purification and drowning share a theological border. Pilgrims wade chest-deep through the nave to leave prayers written on water-soluble paper — prayers that dissolve before they can be read by anyone but the god.',
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
    desc: 'Twin pillars of bone-white stone rising from a blasted heath near the western Kur border, marking the most stable known entrance to the underworld proper. The Gates of Ningal are named for the goddess of the underworld\'s outer court — she who greets the dead and strips them of their names before they may proceed. The air between the pillars shimmers like heat haze, and those who pass between them cast shadows that face the wrong direction.',
    lore: '"Ningal\'s gates open in both directions. Entering the underworld is simple. Leaving requires you to remember your name, and Ningal is very, very good at making you forget."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'lunar-clock',
    name: 'The Ancient Lunar Clock',
    sub: 'Moon-Dial of the Prophecy',
    type: 'sacred',
    lat: 4504,
    lng: 4093,
    desc: 'A vast stone mechanism set into the mountainside near the Tower of the Nine, its dials and gears calibrated to track lunar cycles that do not correspond to any visible moon. The Lunar Clock predates the Empire, predates the Nine, and possibly predates the splitting of the world. Its hands move with imperceptible slowness — but the cartographers who measured their position across decades confirmed they are moving, and they are approaching midnight.',
    lore: '"The clock does not tell time. The clock tells what time will do when it arrives. The hands are nearly touching. We were not meant to be here when they meet."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'irridari-citadel',
    name: 'Irridari Citadel',
    sub: 'Fortress of Atrus Nul',
    type: 'sacred',
    lat: 3658,
    lng: 3584,
    desc: 'The seat of Atrus Nul — Titan emperor, son of Erra, sovereign of the Irridari dominion. The Citadel is built to a scale that mocks human proportion: its doorways forty feet high, its corridors wide enough for processions of beings that have not walked the surface world in an age. The fortress is not abandoned — it is occupied by something that does not move often but, when it does, causes the seismographs in Nin to register activity.',
    lore: '"Atrus Nul is not a king. Atrus Nul is a geological event with opinions. The Citadel is not his home. It is the place where he waits, and he has been waiting long enough to become patient."',
    journeyStep: null,
    volume1: true
  },
  {
    id: 'kur-border',
    name: 'Kur Border Wall',
    sub: 'The Boundary That Moves',
    type: 'sacred',
    lat: 4020,
    lng: 374,
    desc: 'The wall that separates the living lands from the Kur Deadlands — though "wall" implies permanence that this structure does not possess. The Kur Border Wall shifts position by inches each year, always southward, always encroaching. It is constructed of materials that no mason can identify: not stone, not metal, but something that resists touch and absorbs light. Sentries posted along its length report that the wall hums lullabies at night.',
    lore: '"Before the Atras Empire had a name, Kur had a border. That border is moving. It has always been moving. We have only recently begun to measure how fast."',
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
    desc: 'The shattered remnants of the world that existed before the Maxim Stone split reality in two. The Dilmun Ruins are paradoxical — they appear ancient and freshly destroyed simultaneously, as though the act of splitting is still occurring in slow motion. Flowers bloom here that exist in no botanical record, bearing colors that the human eye processes as grief. It is said that standing in the ruins, one can feel the phantom weight of the Clockwork — the other half of the world, pressing close, remembering.',
    lore: '"Dilmun was not destroyed. Dilmun was divided. Half became your world. Half became ours. The ruins are not what was lost — they are what refused to choose a side."',
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
    desc: 'The perpetual twilight territory of the god Elil, lord of wind and shadow, where day and night have ceased their quarrel and settled upon a bruised compromise. The land is neither dark nor light but something in between — a dusk that has forgotten how to end. The cartographers noted that compasses spin freely in Elil, and that the wind speaks in syllables that almost form words.',
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
    desc: 'A distant island visible only at sunrise from the eastern coast, where the first light of day strikes the Hollowlands before touching the continent. Those who returned from the Isle spoke of ruins predating the splitting — structures built for bodies shaped differently than ours. Records indicate that the Isle appears on no two maps in the same position, as though it drifts according to a calendar the cartographers have not deciphered.',
    lore: '"The Isle of Dawn is where morning is manufactured. It is said the sun does not rise — it is released, each day, from a cage on the island\'s highest peak."',
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
    desc: 'The contested territory between the Empire\'s southern reach and the old lands of OG, where resistance to Atrus Nul\'s dominion smolders like a peat fire — invisible from above, impossible to extinguish from below. The name is unofficial; Imperial maps label this region "Pacified Southern District." The cartographers noted that the word "pacified" has never, in the history of empire, meant what it claims.',
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
    desc: 'The narrow eastern peninsula said to trace the outline of Azu the Dragon\'s tail where it dragged through the earth during the world\'s splitting. The land is warm, the stone veined with copper and scale-like in texture. Fishing boats that venture around the peninsula\'s tip report currents that push them backward with deliberate, muscular force — as though the sea itself remembers what shaped the shore and does not wish to disturb it.',
    lore: '"The peninsula is not land. It is a scar left by something that moved through the world when the world was still soft. The scar has not healed. The scar is warm."',
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
    lng: 1500,
    desc: 'The judicial heart of the Moon Queen\'s domain, where disputes are settled by moonlight and the verdicts are written in silver ink that fades by dawn — binding only those who witnessed the judgment. Sinn\'s architecture is circular, its streets spiraling inward like the chambers of a nautilus shell. It is said that the city was designed by Sabella herself, modeled on a memory of something she saw in the Clockwork and could not forget.',
    lore: '"Sinn does not dispense justice. Sinn dispenses clarity. The difference is that justice can be appealed."',
    journeyStep: 7,
    volume1: true
  },
  {
    id: 'indras-na',
    name: 'Indras Na',
    sub: 'Western Garrison',
    type: 'city',
    lat: 4448,
    lng: 1250,
    desc: 'The fortified garrison town that guards the Moon Queen\'s eastern border against Imperial incursion. Indras Na is staffed by soldiers who serve not by conscription but by oath — an oath spoken once, in the dark, to a queen they may never meet. The walls are lined with mirrors that reflect moonlight into concentrated beams, turning the perimeter into a web of silver tripwires. Those who returned from attempted siege spoke of blindness and the sound of laughter.',
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
    desc: 'A city that wears its defeat as a title. Armatu was once the eastern bulwark of the old Dilmun alliance, shattered during the Irridari expansion and rebuilt atop its own rubble. The cartographers noted that the city\'s walls are constructed from the fragments of its predecessor — broken shield-stones re-mortared in arrangements that spell, when viewed from above, a single word in pre-Imperial script that translates roughly as "again."',
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
    desc: 'A city where sound behaves with unsettling intention. Conversations held in Mirilis carry — not randomly, but to the precise ears for which they were never intended. Espionage is not a profession here; it is an atmospheric condition. The buildings are constructed of a porous stone that absorbs and re-emits speech, sometimes hours after the words were spoken. Records indicate that three separate intelligence networks operate from Mirilis. All three believe they are the only one.',
    lore: '"In Mirilis, silence is the only currency that holds its value. Speak carefully, or do not speak at all. The walls are not listening — the walls are remembering."',
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
    desc: 'The last city of reliable sunlight before the perpetual twilight of Elil\'s domain swallows the road east. Mari exists in a state of architectural argument — half its buildings face the sun, half face the shadow, and the central market square occupies the precise line where day and dusk negotiate. Travelers stock lanterns here, though the residents of Elil insist lanterns are not merely useless in the twilight but offensive.',
    lore: '"Mari is the threshold. Step through with both eyes open and you will see where light ends. Step through with them closed and Elil will decide what you see instead."',
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
    desc: 'A road-post settlement where the northern trade route splits toward Atras-Un and the western territories. Awan is a town of provisional architecture — every building designed to be disassembled and relocated should the road shift, as roads in the Hollowlands occasionally do. The inn here serves a broth made from roots that grow only at crossroads, said to grant travelers the ability to choose correctly at the next fork. The cartographers could not confirm this.',
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
    desc: 'A river-crossing settlement where the ferryman charges not in coin but in news — passengers must relay everything they have seen on the road before they are permitted to board. Uduna\'s ferryman is a hereditary post, passed from parent to child along with the accumulated knowledge of every crossing ever made. It is said the current ferryman knows more about the state of the Empire than the Emperor himself.',
    lore: '"The river at Uduna flows in one direction only: away. Those who attempt to cross in the wrong direction find the far bank receding. The ferryman alone knows the current\'s terms."',
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
    desc: 'A high-altitude settlement wedged into a mountain pass where the wind carries voices from both slopes simultaneously. Gal\'s inhabitants are renowned climbers and reluctant conversationalists — the wind makes private speech impossible, and the town has developed an elaborate system of hand-signs that conveys more nuance than the spoken word. The cartographers noted that the pass itself appears to be artificial, as though something very large once walked through the mountain rather than over it.',
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
    desc: 'An Imperial watch post where the northern boundary of governed territory meets the ungoverned wild. Tal\'s garrison maintains a signal-fire network that connects to Nin in relay — a message can travel from Tal to the capital in under four hours, though what arrives is not always what was sent. The cartographers observed that messages passing through three specific relay towers acquire additional words that no operator claims to have added.',
    lore: '"Tal watches the north. The north watches back. The watchers of Tal have learned to sleep with their eyes open. This is not a figure of speech."',
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
    desc: 'A merchant caravanserai where trade routes from Nin, Atras-Dur, and the western territories converge in a controlled chaos of haggling, livestock, and competing currencies. Fenxi smells of cardamom, axle grease, and the particular anxiety of profit margins. The market operates on a forty-hour cycle that ignores the sun entirely — merchants set their own clocks and conduct business by lamplight when necessary, which is frequently.',
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
    desc: 'A settlement whose name has lost its vowels to time — or, as the locals insist, surrendered them voluntarily to something that collects sounds. Ddr is profoundly quiet. Not the absence of noise but the active suppression of it, as though the air itself swallows vibration. Conversations here are conducted in whispers not from discretion but from necessity. Those who attempt to shout find the sound stopping three feet from their mouth, hanging visible in the air like frozen breath.',
    lore: '"Ddr had another name once. A longer name. A louder name. Something took the rest of it. The residents do not discuss what. They cannot. There are not enough syllables left."',
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
    desc: 'A coastal settlement on the Dragon\'s Tail where the fishermen haul nets that occasionally contain objects instead of fish — coins from no known mint, fragments of pottery bearing script in languages that have not been invented, and once, memorably, a sealed letter addressed to someone who would not be born for another century. Azu-Ran\'s inhabitants accept these offerings without comment, filing them in a warehouse they call the Library of the Not Yet.',
    lore: '"The sea off Azu-Ran gives back what it has not yet taken. The fishermen do not question this. Questioning the sea is an occupation with a short career."',
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
    desc: 'The southernmost Imperial outpost, where the Empire\'s authority thins to a single flag, a single clerk, and a garrison of twelve soldiers who rotate every six months but invariably request extensions. Reok sits at the edge of the southern wastes, and those who returned spoke of the light here — a quality of illumination that makes shadows fall in directions unrelated to the sun\'s position, as though the light source is beneath the ground rather than above it.',
    lore: '"Reok is where the map ends. The cartographers drew a line and wrote: \'Beyond this point, we decline responsibility.\' The line, it is noted, has been redrawn southward three times."',
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
    desc: 'Twin obelisks of vitrified stone standing at the uttermost northwest of the known Hollowlands, where the Kur Deadlands meet the Golden Wastes and the world seems to lose confidence in its own geography. The Pillars mark the boundary beyond which the cartographers\' instruments ceased to function — compasses spun, sextants reported impossible angles, and distance itself became negotiable. It is said that the Pillars were not placed but grew, like teeth, from the jawbone of the earth.',
    lore: '"The Pillars of Dusk mark the edge of the known world. Beyond them, the world continues. It simply stops being known. The distinction, for the cartographers, was sufficient reason to turn back."',
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
    desc: 'A range of peaks in the far northeast that pierce the cloud layer and do not return from it — their summits invisible from any vantage, their true height unknown. The Sacred Mountains are said to be where the Nine first descended from the heavens to claim the Hollowlands, leaving footprints in the stone that still steam with divine heat. No expedition to the summit has returned with the same number of members it departed with. Some return with fewer. Some return with more.',
    lore: '"The mountains are not tall. The mountains are deep — inverted, reaching upward into a sky that is merely another kind of underground. The peaks are roots. What they are rooted in, we do not name."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'the-gates',
    name: 'The Gates',
    sub: 'Passage to the Inner Territories',
    type: 'sacred',
    lat: 4132,
    lng: 4376,
    desc: 'A natural rock formation — or what appears to be one — spanning the road between the Imperial heartland and the eastern territories. The Gates are two sheer cliff faces that lean toward each other, their upper edges nearly touching, forming a passage so narrow that caravans must proceed single-file. Those who pass through report a moment of total darkness regardless of the hour, and the sensation of being counted.',
    lore: '"The Gates do not bar passage. The Gates record it. Every soul that has ever walked between them is noted in stone that no one can read. The Gates are patient. They are compiling a list."',
    journeyStep: null,
    volume1: false
  },
  {
    id: 'the-pillars',
    name: 'The Pillars',
    sub: 'Southern Boundary Stones',
    type: 'sacred',
    lat: 916,
    lng: 6828,
    desc: 'Massive stone columns rising from the southeastern shoreline, their bases submerged in surf that crashes against them with metronomic regularity — once every nine seconds, without variation, regardless of weather or tide. The Pillars bear carvings in a script that predates every known language of the Hollowlands. Those who returned from study spoke of the carvings shifting between visits, as though the text is being edited by an author who has not yet finished the manuscript.',
    lore: '"The southern Pillars are not monuments. They are punctuation — the period at the end of a sentence the world has been writing since the splitting. The sentence, the cartographers fear, is nearly complete."',
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
