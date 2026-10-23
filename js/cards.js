// Les 79 cartes de Fantasy Realms : Mythes grecs, plus la carte promo Dionysos.
// Noms et textes sont dans i18n/<langue>.js, sous `cards.<id>`.
//
// Champs d'une carte :
//   id         identifiant unique (sert de clé de traduction)
//   n          numéro imprimé sur la carte
//   suit       une des clés de SUITS
//   strength   force de base
//   tags       icônes imprimées (clés de TAGS)
//   bonus      (ctx) => nombre >= 0, calculé une fois la fin de partie résolue
//   penalty    (ctx) => nombre <= 0, idem
//   effects    effets de fin de partie : [{ step, kind: 'bonus'|'penalty', run(ctx) }]
//   choices    cibles choisies par le joueur : [{ key, type, optional }] (voir CHOICE_TYPES)
//   promo      carte promotionnelle, hors des 79 cartes
//
// `ctx` : voir scoring.js. Sauf mention « autre », une carte ne se compte jamais elle-même.
// Dans `effects`, une condition sur les icônes utilise `ctx.hadTag` (état du début de l'étape).

const HAND_SIZE = 7;
const AFTERLIFE_PENALTY = -10;

// Étapes de fin de partie, dans l'ordre du livret.
const STEP = {
  OPTIONAL_MASK: 0, // bonus qui MASQUENT (facultatifs)
  MASK_PENALTY: 1,  // malus qui MASQUENT (obligatoires)
  ADD_ICONS: 2,     // bonus qui ajoutent des icônes
  ENDGAME: 3,       // malus (et bonus) Ω de fin de partie
};

const SUITS = {
  gods:      { color: '#1f8797' },
  heroes:    { color: '#a8338a' },
  items:     { color: '#2a2a2a' },
  locations: { color: '#3b9330' },
  monsters:  { color: '#b3241c' },
  quests:    { color: '#8f9a12' },
};

const TAGS = [
  'divine', 'aquatic', 'plant', 'magic',
  'artistic', 'clever', 'warrior', 'wise',
  'monarch', 'nimble', 'strong',
  'friendly', 'hostile',
];

const ATHENA_TAGS = ['clever', 'wise', 'artistic', 'warrior'];

const beyondFirst = (n) => Math.max(0, n - 1);

const livingHeroWith = (ctx, ...tags) => ctx.livingAtEndgame.some((h) => tags.some((t) => ctx.hasTag(h, t)));

// Malus Ω des Créatures : tous les Héros vont dans l'Au-delà, sauf si la condition est remplie.
const heroesToAfterlifeUnless = (protects) => ({
  step: STEP.ENDGAME,
  kind: 'penalty',
  run: (ctx) => {
    if (!protects(ctx)) ctx.sendAllLivingHeroes();
  },
});

const CARDS = [
  // ---------- Dieux ----------
  {
    id: 'apollo', n: 1, suit: 'gods', strength: 5, tags: ['artistic'],
    bonus: (ctx) => 5 * ctx.countTag('artistic'),
  },
  {
    id: 'ares', n: 2, suit: 'gods', strength: 7, tags: ['warrior'],
    bonus: (ctx) => 7 * ctx.countTag('warrior'),
  },
  {
    id: 'artemis', n: 3, suit: 'gods', strength: 7, tags: [],
    bonus: (ctx) => 7 * ctx.countHostileMonsters(),
  },
  {
    id: 'athena', n: 4, suit: 'gods', strength: 4, tags: ATHENA_TAGS,
    choices: [{ key: 'hero', type: 'livingHero' }, { key: 'tag', type: 'athenaTag' }],
    effects: [{
      step: STEP.ADD_ICONS,
      kind: 'bonus',
      run: (ctx) => ctx.addTag(ctx.choice('hero'), ctx.choice('tag')),
    }],
    bonus: (ctx) => 4 * ctx.living.filter((h) => ATHENA_TAGS.some((t) => ctx.hasTag(h, t))).length,
  },
  {
    id: 'demeter', n: 5, suit: 'gods', strength: 5, tags: ['plant'],
    bonus: (ctx) => 5 * ctx.countTag('plant'),
  },
  { id: 'fates', n: 6, suit: 'gods', strength: 3, tags: [] },
  {
    id: 'hades', n: 7, suit: 'gods', strength: 3, tags: [],
    bonus: (ctx) => 3 * ctx.countAfterlife(),
  },
  {
    id: 'hecate', n: 8, suit: 'gods', strength: 3, tags: ['magic'],
    bonus: (ctx) => 9 * ctx.countTag('magic'),
  },
  {
    id: 'hephaestus', n: 9, suit: 'gods', strength: 5, tags: ['artistic'],
    bonus: (ctx) => 10 * ctx.countSuit('items'),
  },
  {
    id: 'hera', n: 10, suit: 'gods', strength: 6, tags: [],
    bonus: (ctx) => 12 * Math.floor(ctx.living.length / 2),
  },
  {
    id: 'hermes', n: 11, suit: 'gods', strength: 5, tags: ['magic'],
    bonus: (ctx) => 5 * (
      ctx.countSuit('locations')
      + ctx.living.filter((h) => ctx.hasTag(h, 'nimble')).length
      + ctx.countDeadHeroes()
    ),
  },
  {
    id: 'muses', n: 12, suit: 'gods', strength: 3, tags: ['artistic'],
    bonus: (ctx) => 8 * ctx.countTag('artistic'),
  },
  {
    // Chaque paire (une carte dans l'Au-delà, un VÉGÉTAL) rapporte 6 ; un VÉGÉTAL
    // dans l'Au-delà compte des deux côtés.
    id: 'persephone', n: 13, suit: 'gods', strength: 3, tags: ['plant'],
    bonus: (ctx) => 6 * Math.min(ctx.countAfterlife(), ctx.countTag('plant')),
  },
  {
    id: 'poseidon', n: 14, suit: 'gods', strength: 5, tags: ['aquatic'],
    bonus: (ctx) => 5 * (ctx.countTag('aquatic') + ctx.countSuit('monsters')),
  },
  {
    id: 'zeus', n: 15, suit: 'gods', strength: 8, tags: ['wise'],
    bonus: (ctx) => 4 * (ctx.countSuit('gods') + ctx.countTag('monarch')),
  },
  {
    id: 'dionysus', suit: 'gods', strength: 4, tags: ['plant'], promo: true,
    choices: [{ key: 'hero', type: 'anyHero' }],
    effects: [{
      step: STEP.MASK_PENALTY,
      kind: 'penalty',
      run: (ctx) => ctx.clear(ctx.choice('hero'), { tags: true, bonus: true }),
    }],
    bonus: (ctx) => ctx.maxBase((c) => c.card.suit === 'heroes' && ctx.isPlain(c)),
  },

  // ---------- Héros ----------
  {
    id: 'achilles', n: 16, suit: 'heroes', strength: 7, tags: ['warrior', 'strong'],
    bonus: (ctx) => (['athena', 'hera', 'poseidon', 'river_styx'].some((id) => ctx.has(id)) ? 5 : 0),
  },
  { id: 'agamemnon', n: 17, suit: 'heroes', strength: 9, tags: ['monarch', 'warrior'] },
  {
    id: 'andromeda', n: 18, suit: 'heroes', strength: 3, tags: [],
    bonus: (ctx) => (ctx.hasSuit('quests') && ctx.countHostileMonsters() ? 17 : 0),
  },
  {
    // « plus de HÉROS (Vivants et dans l'Au-delà) que de DIEUX » : Arachné compte parmi les Héros.
    id: 'arachne', n: 19, suit: 'heroes', strength: 3, tags: ['artistic'],
    bonus: (ctx) => (ctx.countSuit('heroes') + 1 > ctx.countSuit('gods') ? 10 : 0),
  },
  { id: 'atalanta', n: 20, suit: 'heroes', strength: 12, tags: ['nimble'] },
  {
    id: 'circe', n: 21, suit: 'heroes', strength: 14, tags: ['magic', 'wise'],
    effects: [{
      step: STEP.MASK_PENALTY,
      kind: 'penalty',
      run: (ctx) => {
        if (ctx.living.some((h) => ctx.hadTag(h, 'clever'))) return;
        ctx.living.forEach((h) => ctx.clear(h, { tags: true, bonus: true }));
      },
    }],
  },
  {
    id: 'hector', n: 22, suit: 'heroes', strength: 6, tags: ['warrior', 'strong'],
    bonus: (ctx) => (['ares', 'apollo', 'artemis'].some((id) => ctx.has(id)) ? 6 : 0),
  },
  {
    id: 'helen', n: 23, suit: 'heroes', strength: 2, tags: [],
    bonus: (ctx) => 10 * ctx.countTag('warrior'),
  },
  {
    id: 'herakles', n: 24, suit: 'heroes', strength: 12, tags: ['strong'],
    choices: [{ key: 'hero', type: 'livingHero' }],
    effects: [{
      step: STEP.ENDGAME,
      kind: 'penalty',
      run: (ctx) => ctx.sendLater(ctx.choice('hero')),
    }],
    bonus: (ctx) => 5 * ctx.countHostileMonsters(),
  },
  { id: 'hippolyta', n: 25, suit: 'heroes', strength: 10, tags: ['monarch', 'strong'] },
  {
    id: 'homer', n: 26, suit: 'heroes', strength: 6, tags: ['artistic'],
    bonus: (ctx) => 6 * (ctx.countTag('warrior') + ctx.countSuit('quests')),
  },
  {
    id: 'jason', n: 27, suit: 'heroes', strength: 4, tags: ['nimble'],
    bonus: (ctx) => 4 * (ctx.countSuit('quests') + ctx.living.length),
  },
  { id: 'medea', n: 28, suit: 'heroes', strength: 7, tags: ['magic', 'clever'] },
  {
    id: 'odysseus', n: 29, suit: 'heroes', strength: 4, tags: ['clever', 'monarch', 'warrior'],
    bonus: (ctx) => 4 * ctx.countTag('aquatic'),
  },
  {
    id: 'orpheus', n: 30, suit: 'heroes', strength: 6, tags: ['artistic'],
    bonus: (ctx) => (ctx.self.zone === 'hand' ? ctx.maxBase((c) => c.zone === 'afterlife') : 0),
  },
  { id: 'penelope', n: 31, suit: 'heroes', strength: 5, tags: ['clever', 'monarch', 'artistic'] },
  {
    id: 'perseus', n: 32, suit: 'heroes', strength: 5, tags: ['nimble'],
    bonus: (ctx) => (ctx.hasSuit('gods') ? 5 : 0) + (ctx.hasSuit('items') ? 5 : 0),
  },
  { id: 'theseus', n: 33, suit: 'heroes', strength: 10, tags: ['strong', 'nimble'] },
  { id: 'tiresias', n: 34, suit: 'heroes', strength: 11, tags: ['wise'] },

  // ---------- Objets ----------
  {
    id: 'apple_discord', n: 35, suit: 'items', strength: 25, tags: ['plant'],
    penalty: (ctx) => -5 * (
      beyondFirst(ctx.countSuit('gods'))
      + beyondFirst(ctx.living.length)
      + beyondFirst(ctx.countSuit('monsters'))
    ),
  },
  {
    // « nombre d'AQUATIQUES » : l'Argo, aquatique, se compte lui-même.
    id: 'argo', n: 36, suit: 'items', strength: 0, tags: ['aquatic'],
    bonus: (ctx) => 5 * (ctx.countTag('aquatic') + 1) * ctx.living.length,
  },
  {
    id: 'charmed_bridle', n: 37, suit: 'items', strength: 11, tags: ['magic'],
    choices: [{ key: 'monster', type: 'monsterWithPenalty', optional: true }],
    effects: [{
      step: STEP.OPTIONAL_MASK,
      kind: 'bonus',
      run: (ctx) => ctx.clear(ctx.choice('monster'), { penalty: true }),
    }],
  },
  { id: 'cornucopia', n: 38, suit: 'items', strength: 2, tags: ['plant'] },
  {
    id: 'golden_apples', n: 39, suit: 'items', strength: 3, tags: ['plant'],
    bonus: (ctx) => (ctx.hasSuit('quests') ? 14 : 0),
  },
  {
    id: 'golden_fleece', n: 40, suit: 'items', strength: 6, tags: ['divine'],
    bonus: (ctx) => (ctx.living.length && ctx.countTag('magic') ? 12 : 0),
  },
  {
    id: 'helm_darkness', n: 41, suit: 'items', strength: 13, tags: ['magic'],
    choices: [{ key: 'hero', type: 'livingHero' }],
    effects: [{
      step: STEP.ENDGAME,
      kind: 'bonus',
      run: (ctx) => ctx.protect(ctx.choice('hero')),
    }],
  },
  {
    id: 'moly', n: 42, suit: 'items', strength: 4, tags: ['magic', 'plant'],
    choices: [{ key: 'target', type: 'penaltyCard', optional: true }],
    effects: [{
      step: STEP.OPTIONAL_MASK,
      kind: 'bonus',
      run: (ctx) => ctx.clear(ctx.choice('target'), { penalty: true }),
    }],
  },
  {
    id: 'pomegranate', n: 43, suit: 'items', strength: 6, tags: ['plant'],
    choices: [{ key: 'god', type: 'handGod' }],
    effects: [{
      step: STEP.ENDGAME,
      kind: 'penalty',
      run: (ctx) => ctx.sendLater(ctx.choice('god')),
    }],
  },
  {
    id: 'trojan_horse', n: 44, suit: 'items', strength: 4, tags: ['warrior'],
    bonus: (ctx) => (ctx.countTag('clever') && ctx.living.length >= 2 ? 15 : 0),
  },
  {
    id: 'winged_sandals', n: 45, suit: 'items', strength: 10, tags: ['divine'],
    choices: [{ key: 'hero', type: 'livingHero' }],
    effects: [{
      step: STEP.ADD_ICONS,
      kind: 'bonus',
      run: (ctx) => ctx.addTag(ctx.choice('hero'), 'nimble'),
    }],
    bonus: (ctx) => (ctx.living.length && ctx.countSuit('locations') >= 2 ? 15 : 0),
  },

  // ---------- Lieux ----------
  { id: 'daphnes_river', n: 46, suit: 'locations', strength: 12, tags: ['plant', 'aquatic'] },
  {
    id: 'garden_hesperides', n: 47, suit: 'locations', strength: 17, tags: ['plant', 'divine', 'magic'],
    penalty: (ctx) => (ctx.countHostileMonsters() ? 0 : -12),
  },
  {
    id: 'lotus_field', n: 48, suit: 'locations', strength: 23, tags: ['plant'],
    effects: [{
      step: STEP.MASK_PENALTY,
      kind: 'penalty',
      run: (ctx) => ctx.living.forEach((h) => ctx.clear(h, { tags: true, bonus: true, penalty: true })),
    }],
  },
  {
    id: 'mount_olympus', n: 49, suit: 'locations', strength: 6, tags: ['divine'],
    bonus: (ctx) => 6 * ctx.countSuit('gods'),
  },
  { id: 'oracle_delphi', n: 50, suit: 'locations', strength: 7, tags: ['divine'] },
  {
    id: 'palace', n: 51, suit: 'locations', strength: 7, tags: [],
    bonus: (ctx) => (ctx.countTag('monarch') ? 7 : 0) + 7 * ctx.countTag('artistic'),
  },
  {
    id: 'persephones_garden', n: 52, suit: 'locations', strength: 4, tags: ['divine', 'plant'],
    bonus: (ctx) => 4 * ctx.count((c) => c.card.suit === 'items' && ctx.hasTag(c, 'plant')),
  },
  {
    // Son malus fait aussi oublier bonus et icônes des HÉROS dans l'Au-delà (voir scoring.js).
    id: 'river_lethe', n: 53, suit: 'locations', strength: 6, tags: ['aquatic', 'divine'],
    forgetsDeadHeroes: true,
    penalty: (ctx) => (ctx.self.zone === 'afterlife' ? 0 : -20),
  },
  {
    id: 'river_styx', n: 54, suit: 'locations', strength: 0, tags: ['aquatic', 'divine', 'magic'],
    bonus: (ctx) => (ctx.hasSuit('gods') && ctx.living.length ? 5 : 0),
    penalty: (ctx) => (ctx.self.zone === 'afterlife' ? 0 : -20),
  },
  {
    id: 'sacrificial_altar', n: 55, suit: 'locations', strength: 0, tags: ['divine'],
    bonus: (ctx) => 7 * ctx.countDeadHeroes(),
  },
  {
    id: 'temple', n: 56, suit: 'locations', strength: 6, tags: ['divine'],
    bonus: (ctx) => (ctx.hasSuit('gods') ? 6 : 0) + 6 * ctx.countTag('artistic'),
  },
  {
    id: 'labyrinth', n: 57, suit: 'locations', strength: 3, tags: [],
    bonus: (ctx) => (ctx.countHostileMonsters() ? 10 : 0) + (ctx.living.some((h) => ctx.hasTag(h, 'clever')) ? 10 : 0),
  },

  // ---------- Créatures ----------
  {
    id: 'antaeus', n: 58, suit: 'monsters', strength: 18, tags: ['hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => livingHeroWith(ctx, 'strong'))],
  },
  {
    id: 'calydonian_boar', n: 59, suit: 'monsters', strength: 24, tags: ['hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => ctx.livingAtEndgame.length >= 3)],
  },
  {
    id: 'cerberus', n: 60, suit: 'monsters', strength: 5, tags: ['hostile'],
    bonus: (ctx) => 5 * ctx.countDeadHeroes(),
    penalty: (ctx) => (ctx.self.zone === 'afterlife' ? 0 : -5),
  },
  {
    id: 'chiron', n: 61, suit: 'monsters', strength: 6, tags: ['wise', 'friendly'],
    choices: [{ key: 'hero', type: 'livingHero' }, { key: 'tag', type: 'anyTag' }],
    effects: [{
      step: STEP.ADD_ICONS,
      kind: 'bonus',
      run: (ctx) => ctx.addTag(ctx.choice('hero'), ctx.choice('tag')),
    }],
  },
  { id: 'dryads', n: 62, suit: 'monsters', strength: 14, tags: ['friendly', 'plant', 'wise'] },
  {
    id: 'hydra', n: 63, suit: 'monsters', strength: 17, tags: ['hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => ctx.livingAtEndgame.some(
      (h) => TAGS.filter((t) => ctx.hasTag(h, t)).length >= 3,
    ))],
  },
  {
    id: 'medusa', n: 64, suit: 'monsters', strength: 15, tags: ['hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => livingHeroWith(ctx, 'clever', 'nimble'))],
  },
  {
    id: 'minotaur', n: 65, suit: 'monsters', strength: 15, tags: ['hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => livingHeroWith(ctx, 'clever', 'strong'))],
  },
  {
    id: 'pegasus', n: 66, suit: 'monsters', strength: 20, tags: ['friendly'],
    choices: [{ key: 'hero', type: 'livingHero' }],
    effects: [{
      step: STEP.ADD_ICONS,
      kind: 'bonus',
      run: (ctx) => {
        ctx.addTag(ctx.choice('hero'), 'artistic');
        ctx.addTag(ctx.choice('hero'), 'nimble');
      },
    }],
    penalty: (ctx) => (ctx.countTag('wise') ? 0 : -10),
  },
  {
    id: 'scylla_charybdis', n: 67, suit: 'monsters', strength: 17, tags: ['hostile', 'aquatic'],
    effects: [heroesToAfterlifeUnless((ctx) => livingHeroWith(ctx, 'nimble'))],
  },
  {
    id: 'sirens', n: 68, suit: 'monsters', strength: 16, tags: ['artistic', 'aquatic', 'hostile'],
    effects: [heroesToAfterlifeUnless((ctx) => livingHeroWith(ctx, 'clever'))],
  },

  // ---------- Quêtes ----------
  {
    id: 'twelve_labors', n: 69, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.length ? 12 * (ctx.countTag('strong') + ctx.countHostileMonsters()) : 0),
  },
  {
    id: 'apotheosis', n: 70, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (
      ctx.hasSuit('heroes') && ctx.hasSuit('gods') && ctx.countTag('divine') && ctx.countTag('magic') ? 28 : 0
    ),
  },
  {
    id: 'eleusinian_mysteries', n: 71, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (
      ctx.living.length && ctx.countTag('plant') && ctx.countTag('artistic') && ctx.countTag('magic') ? 27 : 0
    ),
  },
  {
    id: 'epic_quest', n: 72, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (
      ctx.living.length && ['gods', 'locations', 'monsters', 'items'].every((s) => ctx.hasSuit(s)) ? 30 : 0
    ),
  },
  {
    id: 'glimpse_divine', n: 73, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.length ? 8 * (ctx.countSuit('gods') + ctx.countTag('divine')) : 0),
  },
  {
    id: 'long_journey', n: 74, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.length ? 11 * ctx.countSuit('locations') : 0),
  },
  {
    id: 'lost_knowledge', n: 75, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (
      ctx.living.length ? 7 * (ctx.countTag('artistic') + ctx.countTag('magic') + ctx.countTag('wise')) : 0
    ),
  },
  {
    id: 'olympic_games', n: 76, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => 11 * ctx.living.filter((h) => ctx.hasTag(h, 'strong') || ctx.hasTag(h, 'nimble')).length,
  },
  {
    id: 'rebellious_kingdom', n: 77, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.some((h) => ctx.hasTag(h, 'monarch')) && ctx.countTag('wise') ? 27 : 0),
  },
  {
    id: 'trojan_war', n: 78, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.length ? 13 * ctx.countTag('warrior') : 0),
  },
  {
    id: 'visit_underworld', n: 79, suit: 'quests', strength: 0, tags: [],
    bonus: (ctx) => (ctx.living.length ? 6 * ctx.countAfterlife() : 0),
  },
];

const hasPenalty = (card) => Boolean(card.penalty || card.effects?.some((e) => e.kind === 'penalty'));

// Cibles proposées pour chaque type de choix : liste d'icônes, ou filtre sur les autres cartes en jeu.
const CHOICE_TYPES = {
  livingHero: (inst) => inst.card.suit === 'heroes' && inst.zone === 'hand',
  anyHero: (inst) => inst.card.suit === 'heroes',
  handGod: (inst) => inst.card.suit === 'gods' && inst.zone === 'hand',
  monsterWithPenalty: (inst) => inst.card.suit === 'monsters' && hasPenalty(inst.card),
  penaltyCard: (inst) => hasPenalty(inst.card),
  athenaTag: ATHENA_TAGS,
  anyTag: TAGS,
};
