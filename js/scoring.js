// Calcul du score, dans l'ordre de fin de partie du livret :
//   1. bonus qui MASQUENT (facultatifs)   2. malus qui MASQUENT (obligatoires)
//   3. bonus qui ajoutent des icônes (jamais deux fois la même sur une carte)
//   4. malus, dont les effets Ω qui envoient des cartes dans l'Au-delà
//   5. −10 par carte dans l'Au-delà
// Les cartes de l'Au-delà gardent valeur, icônes et bonus. Un HÉROS Vivant est un Héros en main.
// Une carte MASQUÉE (icônes et bonus masqués) vaut 0, mais garde sa famille. Un malus masqué
// seul (Moly, Bride enchantée) ne fait que retirer ce malus.
// Les effets d'une même étape s'appliquent ensemble : leurs conditions se lisent sur l'état du
// début de l'étape (icônes via `hadTag`, Héros Vivants de l'étape 4), quel que soit l'ordre de saisie.

const cardById = (id) => CARDS.find((c) => c.id === id);

const isHero = (inst) => inst.card.suit === 'heroes';
const isMasked = (inst) => inst.cleared.tags || inst.cleared.bonus;
const isLivingHero = (inst) => isHero(inst) && inst.zone === 'hand';

const choiceOptions = (self, all, type) => {
  const filter = CHOICE_TYPES[type];
  return Array.isArray(filter) ? filter : all.filter((inst) => inst !== self && filter(inst));
};

const choiceValue = (option) => (typeof option === 'string' ? option : option.card.id);

const makeInstances = (handIds, afterlifeIds) => [
  ...handIds.map((id) => ({ id, zone: 'hand' })),
  ...afterlifeIds.map((id) => ({ id, zone: 'afterlife' })),
].map(({ id, zone }) => ({
  card: cardById(id),
  zone,
  startZone: zone,
  tags: new Set(cardById(id).tags),
  addedTags: [],
  cleared: { tags: false, bonus: false, penalty: false },
  sentBy: null,
}));

// Fleuve Léthé : tant que son malus s'applique, les HÉROS de l'Au-delà n'ont ni bonus ni icônes.
const isForgotten = (inst, all) => isHero(inst)
  && inst.zone === 'afterlife'
  && all.some((c) => c.card.forgetsDeadHeroes && !c.cleared.penalty);

const makeContext = (self, all, choices, endgame, stepTags) => {
  const others = all.filter((inst) => inst !== self);
  const hasTag = (inst, tag) => Boolean(inst) && !isForgotten(inst, all) && inst.tags.has(tag);
  const hadTag = (inst, tag) => Boolean(inst) && !isForgotten(inst, all) && (stepTags?.get(inst) ?? inst.tags).has(tag);
  const count = (pred) => others.filter(pred).length;
  const bonusActive = (inst) => Boolean(inst.card.bonus) && !inst.cleared.bonus && !isForgotten(inst, all);

  return {
    self,
    get living() { return others.filter(isLivingHero); },
    get livingAtEndgame() { return endgame.living; },
    hasTag,
    hadTag,
    count,
    countTag: (tag) => count((inst) => hasTag(inst, tag)),
    countSuit: (suit) => count((inst) => inst.card.suit === suit),
    hasSuit: (suit) => others.some((inst) => inst.card.suit === suit),
    has: (id) => others.some((inst) => inst.card.id === id),
    countAfterlife: () => count((inst) => inst.zone === 'afterlife'),
    countDeadHeroes: () => count((inst) => isHero(inst) && inst.zone === 'afterlife'),
    countHostileMonsters: () => count((inst) => inst.card.suit === 'monsters' && hasTag(inst, 'hostile')),
    maxBase: (pred) => Math.max(0, ...others.filter(pred).map((inst) => inst.card.strength)),
    isPlain: (inst) => TAGS.every((tag) => !hasTag(inst, tag)) && !bonusActive(inst),

    choice: (key) => {
      const spec = self.card.choices.find((c) => c.key === key);
      const options = choiceOptions(self, all, spec.type);
      const wanted = choices[self.card.id]?.[key];
      const found = options.find((option) => choiceValue(option) === wanted);
      if (found !== undefined) return found;
      return spec.optional || wanted === null ? null : options[0] ?? null;
    },
    clear: (inst, what) => {
      if (!inst) return;
      if (what.tags) {
        inst.cleared.tags = true;
        inst.tags = new Set();
      }
      if (what.bonus) inst.cleared.bonus = true;
      if (what.penalty) inst.cleared.penalty = true;
    },
    addTag: (inst, tag) => {
      if (!inst || !tag || inst.tags.has(tag)) return;
      inst.tags.add(tag);
      inst.addedTags.push(tag);
    },
    sendAllLivingHeroes: () => { endgame.sendAll ??= self; },
    sendLater: (inst) => { if (inst) endgame.moves.push({ inst, by: self }); },
    protect: (inst) => { if (inst) endgame.protected.add(inst); },
  };
};

const runStep = (all, choices, step, endgame) => {
  const stepTags = new Map(all.map((inst) => [inst, new Set(inst.tags)]));
  all.forEach((self) => {
    (self.card.effects ?? [])
      .filter((effect) => effect.step === step && !self.cleared[effect.kind])
      .forEach((effect) => effect.run(makeContext(self, all, choices, endgame, stepTags)));
  });
};

const sendToAfterlife = (inst, by, endgame) => {
  if (inst.zone !== 'hand' || (isHero(inst) && endgame.protected.has(inst))) return;
  inst.zone = 'afterlife';
  inst.sentBy = by;
};

const scoreHand = (handIds, afterlifeIds, choices = {}) => {
  const all = makeInstances(handIds, afterlifeIds);
  const endgame = { living: [], sendAll: null, moves: [], protected: new Set() };

  runStep(all, choices, STEP.OPTIONAL_MASK, endgame);
  runStep(all, choices, STEP.MASK_PENALTY, endgame);
  runStep(all, choices, STEP.ADD_ICONS, endgame);

  endgame.living = all.filter(isLivingHero);
  runStep(all, choices, STEP.ENDGAME, endgame);
  if (endgame.sendAll) endgame.living.forEach((hero) => sendToAfterlife(hero, endgame.sendAll, endgame));
  // Un Héros envoyé dans l'Au-delà n'est plus vivant : son propre effet Ω tombe (Hercule).
  endgame.moves
    .filter(({ by }) => !isHero(by) || by.zone === 'hand')
    .forEach(({ inst, by }) => sendToAfterlife(inst, by, endgame));

  const cards = all.map((inst) => {
    const base = inst.card.strength;
    if (isMasked(inst)) return { inst, base, bonus: 0, penalty: 0, total: 0 };
    const ctx = makeContext(inst, all, choices, endgame);
    const bonus = inst.card.bonus && !inst.cleared.bonus && !isForgotten(inst, all) ? inst.card.bonus(ctx) : 0;
    const penalty = inst.card.penalty && !inst.cleared.penalty ? inst.card.penalty(ctx) : 0;
    return { inst, base, bonus, penalty, total: base + bonus + penalty };
  });

  const afterlifeCount = all.filter((inst) => inst.zone === 'afterlife').length;
  const afterlifeScore = afterlifeCount ? afterlifeCount * AFTERLIFE_PENALTY : 0;
  const total = cards.reduce((sum, c) => sum + c.total, 0) + afterlifeScore;

  return { cards, all, afterlifeScore, total };
};

// ---------- Meilleurs choix ----------
// Chaque cible (Athéna, Moly, Grenade…) est choisie par le joueur, qui maximise son score :
// on essaie toutes les combinaisons des choix que le joueur n'a pas fixés.

const SEARCH_LIMIT = 2000;

const choiceSlots = (handIds, afterlifeIds) => {
  const initial = makeInstances(handIds, afterlifeIds);
  return initial.flatMap((self) => (self.card.choices ?? []).map((spec) => {
    const values = choiceOptions(self, initial, spec.type).map(choiceValue);
    return {
      cardId: self.card.id,
      key: spec.key,
      type: spec.type,
      values: spec.optional || !values.length ? [null, ...values] : values,
    };
  }));
};

const withChoice = (choices, slot, value) => ({
  ...choices,
  [slot.cardId]: { ...choices[slot.cardId], [slot.key]: value },
});

const bestChoices = (handIds, afterlifeIds, fixed = {}) => {
  const free = choiceSlots(handIds, afterlifeIds)
    .filter((slot) => !slot.values.includes(fixed[slot.cardId]?.[slot.key]));
  const totalFor = (choices) => scoreHand(handIds, afterlifeIds, choices).total;
  const combinations = free.reduce((n, slot) => n * slot.values.length, 1);

  if (combinations <= SEARCH_LIMIT) {
    let best = { choices: fixed, total: -Infinity };
    const walk = (i, choices) => {
      if (i === free.length) {
        const total = totalFor(choices);
        if (total > best.total) best = { choices, total };
        return;
      }
      free[i].values.forEach((value) => walk(i + 1, withChoice(choices, free[i], value)));
    };
    walk(0, fixed);
    return best.choices;
  }

  // Trop de combinaisons : on améliore un choix à la fois, en quelques passes.
  let choices = free.reduce((acc, slot) => withChoice(acc, slot, slot.values[0]), fixed);
  for (let pass = 0; pass < 3; pass += 1) {
    free.forEach((slot) => {
      const ranked = slot.values.map((value) => ({ value, total: totalFor(withChoice(choices, slot, value)) }));
      const top = ranked.reduce((a, b) => (b.total > a.total ? b : a));
      choices = withChoice(choices, slot, top.value);
    });
  }
  return choices;
};
