const STORAGE_KEY = 'frgl-state';

const state = { lang: 'fr', mode: 'hand', hand: [], afterlife: [], choices: {} };

const storage = {
  load: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },
  save: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // stockage indisponible (navigation privée) : on continue sans
    }
  },
};

const $ = (sel) => document.querySelector(sel);

const lookup = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
const t = (path, vars = {}) => {
  const text = lookup(I18N[state.lang], path) ?? lookup(I18N.fr, path) ?? path;
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
};
const cardName = (id) => t(`cards.${id}.name`);
const cardText = (id) => t(`cards.${id}.text`);

const pickLang = () => {
  const saved = storage.load();
  if (saved.lang && I18N[saved.lang]) return saved.lang;
  const nav = (navigator.language || 'fr').slice(0, 2);
  return I18N[nav] ? nav : 'en';
};

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const isUsed = (id) => state.hand.includes(id) || state.afterlife.includes(id);

const toggleCard = (id) => {
  if (state.hand.includes(id)) {
    state.hand = state.hand.filter((c) => c !== id);
  } else if (state.afterlife.includes(id)) {
    state.afterlife = state.afterlife.filter((c) => c !== id);
  } else if (state.mode === 'afterlife') {
    state.afterlife.push(id);
  } else if (state.hand.length < HAND_SIZE) {
    state.hand.push(id);
  }
  render();
};

const moveToAfterlife = (id) => {
  state.hand = state.hand.filter((c) => c !== id);
  state.afterlife.push(id);
  render();
};

// Dans un sélecteur : 'auto' = meilleur choix calculé, '' = aucun (choix facultatif).
const setChoice = (cardId, key, value) => {
  const current = { ...state.choices[cardId] };
  if (value === 'auto') delete current[key];
  else current[key] = value === '' ? null : value;
  state.choices[cardId] = current;
  render();
};

const tagList = (tags) => tags.map((tag) => t(`tags.${tag}`)).join(', ');

const renderStatic = () => {
  document.documentElement.lang = state.lang;
  document.title = `${t('ui.title')} – Score`;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  $('#hand-max').textContent = HAND_SIZE;
};

const choiceLabel = (slot, value) => {
  if (value === null || value === undefined) return t('ui.none');
  return Array.isArray(CHOICE_TYPES[slot.type]) ? t(`tags.${value}`) : cardName(value);
};

// Sélecteurs de cible des cartes à choix ; « Auto » affiche le meilleur choix trouvé.
const renderChoices = (cardId, slots, resolved) => {
  const mine = slots.filter((slot) => slot.cardId === cardId);
  if (!mine.length) return '';
  return `<span class="choices">${mine.map((slot) => {
    const fixed = state.choices[cardId]?.[slot.key];
    const isFixed = slot.values.includes(fixed);
    const auto = choiceLabel(slot, resolved[cardId]?.[slot.key]);
    const items = [
      `<option value="auto">${t('ui.auto', { choice: auto })}</option>`,
      ...slot.values.map((value) => {
        const selected = isFixed && value === fixed ? 'selected' : '';
        return `<option value="${value ?? ''}" ${selected}>${choiceLabel(slot, value)}</option>`;
      }),
    ].join('');
    return `<label>${t(`choice.${slot.key}`)} <select data-choice="${cardId}" data-key="${slot.key}">${items}</select></label>`;
  }).join('')}</span>`;
};

const renderLine = ({ inst, base, bonus, penalty, total }, slots, resolved) => {
  const notes = [];
  if (bonus) notes.push(signed(bonus));
  if (penalty) notes.push(`<em>${signed(penalty)}</em>`);
  const masked = isMasked(inst);
  if (masked) notes.push(`<em>${t('ui.masked')}</em>`);
  else if (inst.cleared.penalty) notes.push(`<em>${t('ui.maskedPenalty')}</em>`);
  if (inst.addedTags.length) notes.push(t('ui.added', { tags: tagList(inst.addedTags) }));
  if (inst.sentBy) notes.push(`☠ ${t('ui.sentBy', { card: cardName(inst.sentBy.card.id) })}`);
  const id = inst.card.id;
  return `
    <li class="${masked ? 'masked' : ''}" style="--suit:${SUITS[inst.card.suit].color}">
      <div class="pick-main">
        <strong>${cardName(id)}</strong>
        <span class="detail">${t('ui.base')} ${base}${notes.map((n) => ` · ${n}`).join('')}</span>
        ${renderChoices(id, slots, resolved)}
      </div>
      <span class="pts">${total}</span>
      ${inst.startZone === 'hand' ? `<button class="mini" data-afterlife="${id}">${t('ui.toAfterlife')}</button>` : ''}
      <button class="mini" data-remove="${id}" aria-label="${t('ui.remove')}">✕</button>
    </li>`;
};

const renderPicked = (result, resolved) => {
  const slots = choiceSlots(state.hand, state.afterlife);
  const inHand = result.cards.filter((c) => c.inst.zone === 'hand');
  const inAfterlife = result.cards.filter((c) => c.inst.zone === 'afterlife');

  $('#hand').innerHTML = inHand.map((c) => renderLine(c, slots, resolved)).join('');
  $('#afterlife').innerHTML = inAfterlife.map((c) => renderLine(c, slots, resolved)).join('');

  $('#hand-empty').hidden = inHand.length > 0;
  $('#afterlife-empty').hidden = inAfterlife.length > 0;
  $('#afterlife-score').textContent = inAfterlife.length ? signed(result.afterlifeScore) : '';
};

const renderDeck = () => {
  const handFull = state.hand.length >= HAND_SIZE;
  $('#deck').innerHTML = Object.keys(SUITS)
    .map((suit) => {
      const cards = CARDS.filter((c) => c.suit === suit);
      if (!cards.length) return '';
      return `
        <div class="suit" style="--suit:${SUITS[suit].color}">
          <h3>${t(`suits.${suit}`)}</h3>
          <div class="grid">
            ${cards.map((c) => {
              const where = state.hand.includes(c.id) ? 'in-hand' : state.afterlife.includes(c.id) ? 'in-afterlife' : '';
              const disabled = !isUsed(c.id) && state.mode === 'hand' && handFull;
              return `
                <button class="card ${where}" data-card="${c.id}" ${disabled ? 'disabled' : ''}>
                  <span class="card-top">
                    <span class="strength">${c.strength}</span>
                    <span class="name">${cardName(c.id)}</span>
                  </span>
                  ${c.tags.length ? `<span class="tags">${tagList(c.tags)}</span>` : ''}
                  <span class="text">${cardText(c.id)}</span>
                  ${c.promo ? `<span class="flag promo">${t('ui.promo')}</span>` : ''}
                </button>`;
            }).join('')}
          </div>
        </div>`;
    })
    .join('');
};

const render = () => {
  const resolved = bestChoices(state.hand, state.afterlife, state.choices);
  const result = scoreHand(state.hand, state.afterlife, resolved);
  $('#total-score').textContent = result.total;
  $('#hand-count').textContent = state.hand.length;
  document.querySelectorAll('.mode button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
  renderPicked(result, resolved);
  renderDeck();
  storage.save();
};

const init = () => {
  const saved = storage.load();
  const known = (ids) => (Array.isArray(ids) ? ids.filter(cardById) : []);
  state.lang = pickLang();
  state.hand = known(saved.hand).slice(0, HAND_SIZE);
  state.afterlife = known(saved.afterlife);
  state.choices = saved.choices && typeof saved.choices === 'object' ? saved.choices : {};

  $('#lang').innerHTML = Object.entries(I18N)
    .map(([code, dict]) => `<option value="${code}">${dict.label}</option>`)
    .join('');
  $('#lang').value = state.lang;
  $('#lang').addEventListener('change', (e) => {
    state.lang = e.target.value;
    renderStatic();
    render();
  });

  document.querySelectorAll('.mode button').forEach((b) => {
    b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      render();
    });
  });

  $('#reset').addEventListener('click', () => {
    state.hand = [];
    state.afterlife = [];
    state.choices = {};
    render();
  });

  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-card],[data-remove],[data-afterlife]');
    if (!el) return;
    if (el.dataset.card) toggleCard(el.dataset.card);
    else if (el.dataset.remove) toggleCard(el.dataset.remove);
    else moveToAfterlife(el.dataset.afterlife);
  });

  document.body.addEventListener('change', (e) => {
    const el = e.target.closest('[data-choice]');
    if (el) setChoice(el.dataset.choice, el.dataset.key, el.value);
  });

  renderStatic();
  render();
};

init();
