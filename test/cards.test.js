// Un bloc par carte : chaque bonus, malus et condition, avec au moins un cas où il joue
// et un où il ne joue pas. Le dernier test vérifie qu'aucune carte n'a été oubliée.
// Lancer : npm test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, play, playBest, points, zone, tagsOf, line } = require('./helpers');

const covered = new Set();
const card = (id, fn) => {
  covered.add(id);
  describe(id, fn);
};

// ---------- Dieux ----------

card('apollo', () => {
  it('+5 pour chaque autre ARTISTE, en main ou dans l’Au-delà', () => {
    assert.equal(points(play(['apollo', 'muses', 'homer']), 'apollo'), 15);
    assert.equal(points(play(['apollo'], ['muses']), 'apollo'), 10);
  });
  it('ne se compte pas lui-même', () => {
    assert.equal(points(play(['apollo', 'fates']), 'apollo'), 5);
  });
});

card('ares', () => {
  it('+7 pour chaque autre GUERRIER', () => {
    assert.equal(points(play(['ares', 'achilles', 'agamemnon']), 'ares'), 21);
  });
  it('seul : valeur de base', () => {
    assert.equal(points(play(['ares']), 'ares'), 7);
  });
});

card('artemis', () => {
  it('+7 pour chaque CRÉATURE HOSTILE', () => {
    assert.equal(points(play(['artemis', 'minotaur', 'antaeus']), 'artemis'), 21);
  });
  it('une Créature amicale ne compte pas', () => {
    assert.equal(points(play(['artemis', 'dryads']), 'artemis'), 7);
  });
});

card('athena', () => {
  it('+4 pour chaque HÉROS Vivant avec une de ses icônes', () => {
    const r = play(['athena', 'medea', 'theseus'], [], { athena: { hero: 'medea', tag: 'clever' } });
    assert.equal(points(r, 'athena'), 8);
  });
  it('ajoute une de ses icônes à un HÉROS Vivant, qui compte alors', () => {
    const r = play(['athena', 'medea', 'theseus'], [], { athena: { hero: 'theseus', tag: 'wise' } });
    assert.ok(tagsOf(r, 'theseus').includes('wise'));
    assert.equal(points(r, 'athena'), 12);
  });
  it('n’ajoute pas une icône déjà présente', () => {
    const r = play(['athena', 'medea'], [], { athena: { hero: 'medea', tag: 'clever' } });
    assert.deepEqual(line(r, 'medea').inst.addedTags, []);
  });
  it('le meilleur choix donne l’icône à un Héros qui n’en a pas', () => {
    assert.equal(points(playBest(['athena', 'medea', 'theseus']), 'athena'), 12);
  });
  it('les Héros de l’Au-delà ne comptent pas', () => {
    assert.equal(points(play(['athena'], ['medea']), 'athena'), 4);
  });
});

card('demeter', () => {
  it('+5 pour chaque autre VÉGÉTAL', () => {
    assert.equal(points(play(['demeter', 'cornucopia', 'daphnes_river']), 'demeter'), 15);
  });
  it('ne se compte pas elle-même', () => {
    assert.equal(points(play(['demeter']), 'demeter'), 5);
  });
});

card('fates', () => {
  it('aucun effet sur le score', () => {
    assert.equal(points(play(['fates', 'zeus']), 'fates'), 3);
  });
});

card('hades', () => {
  it('+3 pour chaque autre carte dans l’Au-delà', () => {
    assert.equal(points(play(['hades'], ['fates', 'oracle_delphi']), 'hades'), 9);
  });
  it('dans l’Au-delà, ne se compte pas lui-même', () => {
    assert.equal(points(play([], ['hades', 'fates']), 'hades'), 6);
  });
  it('compte les Héros envoyés par un effet de fin de partie', () => {
    assert.equal(points(play(['hades', 'sirens', 'atalanta']), 'hades'), 6);
  });
});

card('hecate', () => {
  it('+9 pour chaque autre MAGIQUE', () => {
    assert.equal(points(play(['hecate', 'medea', 'moly']), 'hecate'), 21);
  });
  it('ne se compte pas elle-même', () => {
    assert.equal(points(play(['hecate']), 'hecate'), 3);
  });
});

card('hephaestus', () => {
  it('+10 pour chaque OBJET', () => {
    assert.equal(points(play(['hephaestus', 'cornucopia', 'golden_apples']), 'hephaestus'), 25);
  });
  it('sans Objet : valeur de base', () => {
    assert.equal(points(play(['hephaestus', 'oracle_delphi']), 'hephaestus'), 5);
  });
});

card('hera', () => {
  it('+12 pour chaque paire de HÉROS Vivants', () => {
    assert.equal(points(play(['hera', 'theseus', 'atalanta', 'medea']), 'hera'), 18);
    assert.equal(points(play(['hera', 'theseus', 'atalanta', 'medea', 'tiresias']), 'hera'), 30);
  });
  it('un Héros seul ou dans l’Au-delà ne forme pas de paire', () => {
    assert.equal(points(play(['hera', 'theseus'], ['atalanta']), 'hera'), 6);
  });
});

card('hermes', () => {
  it('+5 par LIEU, par HÉROS Vivant AGILE et par HÉROS dans l’Au-delà', () => {
    const r = play(['hermes', 'oracle_delphi', 'daphnes_river', 'atalanta', 'hippolyta'], ['medea']);
    assert.equal(points(r, 'hermes'), 25);
  });
  it('un Héros Vivant non AGILE ne compte pas', () => {
    assert.equal(points(play(['hermes', 'hippolyta']), 'hermes'), 5);
  });
});

card('muses', () => {
  it('+8 pour chaque autre ARTISTE', () => {
    assert.equal(points(play(['muses', 'apollo']), 'muses'), 11);
  });
  it('ne se comptent pas elles-mêmes', () => {
    assert.equal(points(play(['muses']), 'muses'), 3);
  });
});

card('persephone', () => {
  it('+6 par paire (carte dans l’Au-delà, VÉGÉTAL)', () => {
    assert.equal(points(play(['persephone', 'cornucopia'], ['fates']), 'persephone'), 9);
  });
  it('cumulable', () => {
    assert.equal(points(play(['persephone', 'daphnes_river'], ['cornucopia', 'fates']), 'persephone'), 15);
  });
  it('un VÉGÉTAL dans l’Au-delà compte des deux côtés', () => {
    assert.equal(points(play(['persephone'], ['cornucopia']), 'persephone'), 9);
  });
  it('limité par le plus petit des deux nombres', () => {
    assert.equal(points(play(['persephone', 'cornucopia', 'daphnes_river'], ['fates']), 'persephone'), 9);
    assert.equal(points(play(['persephone', 'cornucopia']), 'persephone'), 3);
  });
  it('ne se compte pas elle-même', () => {
    assert.equal(points(play([], ['persephone', 'fates']), 'persephone'), 3);
  });
});

card('poseidon', () => {
  it('+5 pour chaque autre AQUATIQUE et pour chaque CRÉATURE', () => {
    assert.equal(points(play(['poseidon', 'daphnes_river', 'dryads']), 'poseidon'), 15);
    assert.equal(points(play(['poseidon', 'sirens']), 'poseidon'), 15);
  });
  it('ne se compte pas lui-même', () => {
    assert.equal(points(play(['poseidon']), 'poseidon'), 5);
  });
});

card('zeus', () => {
  it('+4 pour chaque autre DIEU et pour chaque MONARQUE', () => {
    assert.equal(points(play(['zeus', 'hades', 'hippolyta']), 'zeus'), 16);
    assert.equal(points(play(['zeus', 'agamemnon', 'penelope']), 'zeus'), 16);
  });
  it('un MONARQUE dans l’Au-delà compte toujours', () => {
    assert.equal(points(play(['zeus'], ['hippolyta']), 'zeus'), 12);
  });
  it('seul : valeur de base', () => {
    assert.equal(points(play(['zeus']), 'zeus'), 8);
  });
});

card('dionysus', () => {
  it('masque le Héros choisi, qui vaut alors 0', () => {
    const r = play(['dionysus', 'helen', 'ares'], [], { dionysus: { hero: 'helen' } });
    assert.equal(points(r, 'helen'), 0);
  });
  it('dans l’Au-delà, masque quand même un Héros de la main', () => {
    const r = play(['agamemnon'], ['dionysus'], { dionysus: { hero: 'agamemnon' } });
    assert.equal(points(r, 'agamemnon'), 0);
    assert.equal(points(r, 'dionysus'), 13);
    assert.equal(r.total, 3);
  });
  it('ajoute la valeur de base d’un Héros sans icônes ni bonus', () => {
    const r = play(['dionysus', 'theseus'], [], { dionysus: { hero: 'theseus' } });
    assert.deepEqual(tagsOf(r, 'theseus'), []);
    assert.equal(points(r, 'dionysus'), 14);
  });
  it('un Héros avec des icônes ne donne rien', () => {
    const r = play(['dionysus', 'theseus', 'atalanta'], [], { dionysus: { hero: 'theseus' } });
    assert.equal(points(r, 'dionysus'), 14);
    assert.equal(points(play(['dionysus', 'atalanta'], [], { dionysus: { hero: null } }), 'dionysus'), 4);
  });
  it('le meilleur choix épargne le Héros dont le bonus rapporte le plus', () => {
    const r = playBest(['dionysus', 'helen', 'ares', 'theseus']);
    assert.equal(r.choices.dionysus.hero, 'theseus');
    assert.equal(points(r, 'dionysus'), 14);
  });
});

// ---------- Héros ----------

card('achilles', () => {
  it('+5 avec Athéna, Héra, Poséidon ou le fleuve Styx', () => {
    for (const id of ['athena', 'hera', 'poseidon', 'river_styx']) {
      assert.equal(points(play(['achilles', id]), 'achilles'), 12, id);
    }
  });
  it('non cumulable', () => {
    assert.equal(points(play(['achilles', 'athena', 'hera']), 'achilles'), 12);
  });
  it('un autre Dieu ne compte pas', () => {
    assert.equal(points(play(['achilles', 'zeus']), 'achilles'), 7);
  });
});

card('agamemnon', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['agamemnon', 'zeus']), 'agamemnon'), 9);
  });
});

card('andromeda', () => {
  it('+17 avec à la fois une QUÊTE et une CRÉATURE HOSTILE', () => {
    assert.equal(points(play(['andromeda', 'theseus', 'long_journey', 'minotaur']), 'andromeda'), 20);
  });
  it('rien sans Quête', () => {
    assert.equal(points(play(['andromeda', 'theseus', 'minotaur']), 'andromeda'), 3);
  });
  it('rien avec une Créature amicale', () => {
    assert.equal(points(play(['andromeda', 'long_journey', 'dryads']), 'andromeda'), 3);
  });
});

card('arachne', () => {
  it('+10 avec plus de HÉROS que de DIEUX, Arachné comprise', () => {
    assert.equal(points(play(['arachne']), 'arachne'), 13);
    assert.equal(points(play(['arachne', 'zeus', 'theseus']), 'arachne'), 13);
  });
  it('compte les Héros de l’Au-delà', () => {
    assert.equal(points(play(['arachne', 'zeus', 'hera'], ['theseus', 'atalanta']), 'arachne'), 13);
  });
  it('rien à égalité', () => {
    assert.equal(points(play(['arachne', 'zeus']), 'arachne'), 3);
  });
});

card('atalanta', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['atalanta', 'zeus']), 'atalanta'), 12);
  });
});

card('circe', () => {
  it('masque les autres HÉROS Vivants, qui valent alors 0', () => {
    const r = play(['circe', 'helen', 'achilles']);
    assert.equal(points(r, 'helen'), 0);
    assert.equal(points(r, 'achilles'), 0);
    assert.deepEqual(tagsOf(r, 'achilles'), []);
    assert.deepEqual(tagsOf(r, 'circe'), ['magic', 'wise']);
  });
  it('rien si l’un d’eux est RUSÉ', () => {
    assert.equal(points(play(['circe', 'helen', 'achilles', 'medea']), 'helen'), 12);
  });
  it('n’affecte pas les Héros de l’Au-delà', () => {
    assert.equal(points(play(['circe', 'zeus'], ['helen', 'achilles']), 'helen'), 12);
  });
});

card('hector', () => {
  it('+6 avec Arès, Apollon ou Artémis', () => {
    for (const id of ['ares', 'apollo', 'artemis']) {
      assert.equal(points(play(['hector', id]), 'hector'), 12, id);
    }
  });
  it('non cumulable', () => {
    assert.equal(points(play(['hector', 'apollo', 'artemis']), 'hector'), 12);
  });
  it('seul : valeur de base', () => {
    assert.equal(points(play(['hector', 'zeus']), 'hector'), 6);
  });
});

card('helen', () => {
  it('+10 pour chaque GUERRIER', () => {
    assert.equal(points(play(['helen', 'ares', 'achilles']), 'helen'), 22);
  });
  it('sans Guerrier : valeur de base', () => {
    assert.equal(points(play(['helen', 'zeus']), 'helen'), 2);
  });
});

card('herakles', () => {
  it('+5 pour chaque CRÉATURE HOSTILE', () => {
    assert.equal(points(play(['herakles', 'minotaur', 'antaeus']), 'herakles'), 22);
  });
  it('vivant, il envoie un autre HÉROS de la main dans l’Au-delà', () => {
    const r = play(['herakles', 'theseus', 'atalanta'], [], { herakles: { hero: 'atalanta' } });
    assert.equal(zone(r, 'atalanta'), 'afterlife');
    assert.equal(zone(r, 'theseus'), 'hand');
    assert.equal(line(r, 'atalanta').inst.sentBy.card.id, 'herakles');
  });
  it('sans autre Héros, rien ne se passe', () => {
    assert.equal(play(['herakles']).afterlifeScore, 0);
  });
  it('mort (envoyé par une Créature), son malus ne s’applique pas', () => {
    const r = play(['herakles', 'theseus', 'helm_darkness', 'sirens'], [], {
      helm_darkness: { hero: 'theseus' },
      herakles: { hero: 'theseus' },
    });
    assert.equal(zone(r, 'herakles'), 'afterlife');
    assert.equal(zone(r, 'theseus'), 'hand');
  });
  it('masqué par le Champ de lotus, son malus ne s’applique pas', () => {
    assert.equal(zone(play(['herakles', 'theseus', 'lotus_field']), 'theseus'), 'hand');
  });
});

card('hippolyta', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['hippolyta', 'zeus']), 'hippolyta'), 10);
  });
});

card('homer', () => {
  it('+6 pour chaque GUERRIER et pour chaque QUÊTE', () => {
    assert.equal(points(play(['homer', 'ares', 'long_journey']), 'homer'), 18);
  });
  it('sinon : valeur de base', () => {
    assert.equal(points(play(['homer', 'zeus']), 'homer'), 6);
  });
});

card('jason', () => {
  it('+4 pour chaque QUÊTE et pour chaque autre HÉROS Vivant', () => {
    assert.equal(points(play(['jason', 'long_journey', 'theseus', 'atalanta']), 'jason'), 16);
  });
  it('les Héros de l’Au-delà ne comptent pas', () => {
    assert.equal(points(play(['jason', 'long_journey'], ['medea']), 'jason'), 8);
  });
});

card('medea', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['medea', 'zeus']), 'medea'), 7);
  });
});

card('odysseus', () => {
  it('+4 pour chaque AQUATIQUE', () => {
    assert.equal(points(play(['odysseus', 'daphnes_river', 'poseidon']), 'odysseus'), 12);
  });
  it('sinon : valeur de base', () => {
    assert.equal(points(play(['odysseus', 'zeus']), 'odysseus'), 4);
  });
});

card('orpheus', () => {
  it('vivant, ajoute la plus forte valeur de base de l’Au-delà', () => {
    assert.equal(points(play(['orpheus'], ['fates', 'garden_hesperides']), 'orpheus'), 23);
  });
  it('dans l’Au-delà, rien', () => {
    assert.equal(points(play([], ['orpheus', 'garden_hesperides']), 'orpheus'), 6);
  });
  it('envoyé dans l’Au-delà en fin de partie, rien', () => {
    assert.equal(points(play(['orpheus', 'sirens'], ['garden_hesperides']), 'orpheus'), 6);
  });
  it('Au-delà vide : valeur de base', () => {
    assert.equal(points(play(['orpheus']), 'orpheus'), 6);
  });
});

card('penelope', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['penelope', 'zeus']), 'penelope'), 5);
  });
});

card('perseus', () => {
  it('+5 avec DIEU, +5 avec OBJET', () => {
    assert.equal(points(play(['perseus', 'zeus', 'cornucopia']), 'perseus'), 15);
    assert.equal(points(play(['perseus', 'zeus']), 'perseus'), 10);
    assert.equal(points(play(['perseus', 'cornucopia']), 'perseus'), 10);
  });
  it('non cumulable', () => {
    assert.equal(points(play(['perseus', 'zeus', 'hera']), 'perseus'), 10);
  });
});

card('theseus', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['theseus', 'zeus']), 'theseus'), 10);
  });
});

card('tiresias', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['tiresias', 'zeus']), 'tiresias'), 11);
  });
});

// ---------- Objets ----------

card('apple_discord', () => {
  it('−5 pour chaque DIEU, HÉROS Vivant et CRÉATURE passé le 1er de chaque type', () => {
    const r = play(['apple_discord', 'zeus', 'hera', 'theseus', 'atalanta', 'dryads', 'chiron']);
    assert.equal(points(r, 'apple_discord'), 10);
  });
  it('un seul de chaque type : aucun malus', () => {
    assert.equal(points(play(['apple_discord', 'zeus', 'theseus', 'dryads']), 'apple_discord'), 25);
  });
  it('les Héros de l’Au-delà ne comptent pas', () => {
    assert.equal(points(play(['apple_discord', 'theseus'], ['atalanta']), 'apple_discord'), 25);
  });
});

card('argo', () => {
  it('AQUATIQUES (Argo compris) × HÉROS Vivants × 5', () => {
    assert.equal(points(play(['argo', 'theseus', 'atalanta', 'daphnes_river']), 'argo'), 20);
  });
  it('sans Héros Vivant : 0', () => {
    assert.equal(points(play(['argo', 'daphnes_river'], ['theseus']), 'argo'), 0);
  });
});

card('charmed_bridle', () => {
  it('masque le malus de la Créature choisie', () => {
    const r = play(['charmed_bridle', 'sirens', 'atalanta'], [], { charmed_bridle: { monster: 'sirens' } });
    assert.equal(zone(r, 'atalanta'), 'hand');
  });
  it('facultatif : sans choix, rien n’est masqué', () => {
    assert.equal(zone(play(['charmed_bridle', 'sirens', 'atalanta']), 'atalanta'), 'afterlife');
  });
  it('le meilleur choix masque la Créature qui pénalise', () => {
    assert.equal(zone(playBest(['charmed_bridle', 'sirens', 'atalanta']), 'atalanta'), 'hand');
  });
  it('ne vise pas une carte qui n’est pas une Créature', () => {
    const r = play(['charmed_bridle', 'river_styx'], [], { charmed_bridle: { monster: 'river_styx' } });
    assert.equal(points(r, 'river_styx'), -20);
  });
});

card('cornucopia', () => {
  it('aucun effet sur le score', () => {
    assert.equal(points(play(['cornucopia', 'zeus']), 'cornucopia'), 2);
  });
});

card('golden_apples', () => {
  it('+14 avec une QUÊTE', () => {
    assert.equal(points(play(['golden_apples', 'long_journey']), 'golden_apples'), 17);
  });
  it('sans Quête : valeur de base', () => {
    assert.equal(points(play(['golden_apples']), 'golden_apples'), 3);
  });
});

card('golden_fleece', () => {
  it('+12 avec HÉROS Vivant et MAGIQUE', () => {
    assert.equal(points(play(['golden_fleece', 'theseus', 'moly']), 'golden_fleece'), 18);
    assert.equal(points(play(['golden_fleece', 'medea']), 'golden_fleece'), 18);
  });
  it('rien sans MAGIQUE', () => {
    assert.equal(points(play(['golden_fleece', 'theseus']), 'golden_fleece'), 6);
  });
  it('rien sans Héros Vivant', () => {
    assert.equal(points(play(['golden_fleece', 'moly'], ['theseus']), 'golden_fleece'), 6);
  });
});

card('helm_darkness', () => {
  it('garde en vie le Héros choisi face à une Créature', () => {
    const r = play(['helm_darkness', 'sirens', 'theseus', 'atalanta'], [], { helm_darkness: { hero: 'theseus' } });
    assert.equal(zone(r, 'theseus'), 'hand');
    assert.equal(zone(r, 'atalanta'), 'afterlife');
  });
  it('garde en vie le Héros visé par Hercule', () => {
    const r = play(['helm_darkness', 'herakles', 'theseus'], [], {
      helm_darkness: { hero: 'theseus' },
      herakles: { hero: 'theseus' },
    });
    assert.equal(zone(r, 'theseus'), 'hand');
  });
  it('ne protège que le Héros choisi', () => {
    const r = play(['helm_darkness', 'sirens', 'theseus', 'atalanta'], [], { helm_darkness: { hero: 'atalanta' } });
    assert.equal(zone(r, 'theseus'), 'afterlife');
  });
});

card('moly', () => {
  it('masque le malus choisi', () => {
    assert.equal(points(play(['moly', 'river_styx'], [], { moly: { target: 'river_styx' } }), 'river_styx'), 0);
  });
  it('facultatif : sans choix, rien n’est masqué', () => {
    assert.equal(points(play(['moly', 'river_styx']), 'river_styx'), -20);
  });
  it('agit avant les malus qui masquent (Champ de lotus)', () => {
    const r = play(['moly', 'lotus_field', 'helen', 'ares'], [], { moly: { target: 'lotus_field' } });
    assert.equal(points(r, 'helen'), 12);
  });
  it('masque un malus de fin de partie', () => {
    const r = play(['moly', 'sirens', 'atalanta'], [], { moly: { target: 'sirens' } });
    assert.equal(zone(r, 'atalanta'), 'hand');
  });
  it('le meilleur choix vise le malus le plus coûteux', () => {
    const r = playBest(['moly', 'river_styx', 'cerberus']);
    assert.equal(r.choices.moly.target, 'river_styx');
  });
});

card('pomegranate', () => {
  it('envoie un DIEU de la main dans l’Au-delà', () => {
    const r = play(['pomegranate', 'zeus']);
    assert.equal(zone(r, 'zeus'), 'afterlife');
    assert.equal(r.afterlifeScore, -10);
  });
  it('sans Dieu en main, rien', () => {
    assert.equal(play(['pomegranate'], ['zeus']).afterlifeScore, -10);
  });
});

card('trojan_horse', () => {
  it('+15 avec RUSÉ et 2 HÉROS Vivants ou plus', () => {
    assert.equal(points(play(['trojan_horse', 'medea', 'theseus']), 'trojan_horse'), 19);
    assert.equal(points(play(['trojan_horse', 'athena', 'theseus', 'atalanta']), 'trojan_horse'), 19);
  });
  it('rien avec un seul Héros Vivant', () => {
    assert.equal(points(play(['trojan_horse', 'medea']), 'trojan_horse'), 4);
  });
  it('rien sans RUSÉ', () => {
    assert.equal(points(play(['trojan_horse', 'theseus', 'atalanta']), 'trojan_horse'), 4);
  });
});

card('winged_sandals', () => {
  it('+15 avec HÉROS Vivant et 2 LIEUX ou plus', () => {
    assert.equal(points(play(['winged_sandals', 'theseus', 'oracle_delphi', 'temple']), 'winged_sandals'), 25);
  });
  it('rien avec un seul Lieu', () => {
    assert.equal(points(play(['winged_sandals', 'theseus', 'oracle_delphi']), 'winged_sandals'), 10);
  });
  it('ajoute AGILE au Héros choisi', () => {
    const r = play(['winged_sandals', 'hippolyta', 'scylla_charybdis'], [], { winged_sandals: { hero: 'hippolyta' } });
    assert.ok(tagsOf(r, 'hippolyta').includes('nimble'));
    assert.equal(zone(r, 'hippolyta'), 'hand');
  });
});

// ---------- Lieux ----------

card('daphnes_river', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['daphnes_river', 'zeus']), 'daphnes_river'), 12);
  });
});

card('garden_hesperides', () => {
  it('−12 sauf avec une CRÉATURE HOSTILE', () => {
    assert.equal(points(play(['garden_hesperides']), 'garden_hesperides'), 5);
    assert.equal(points(play(['garden_hesperides', 'dryads']), 'garden_hesperides'), 5);
  });
  it('pas de malus avec une Créature hostile', () => {
    assert.equal(points(play(['garden_hesperides', 'minotaur']), 'garden_hesperides'), 17);
  });
});

card('lotus_field', () => {
  it('masque tous vos HÉROS Vivants, qui valent alors 0', () => {
    const r = play(['lotus_field', 'helen', 'ares', 'achilles']);
    assert.equal(points(r, 'helen'), 0);
    assert.equal(points(r, 'achilles'), 0);
    assert.deepEqual(tagsOf(r, 'achilles'), []);
  });
  it('n’affecte pas les Héros de l’Au-delà', () => {
    assert.equal(points(play(['lotus_field', 'ares'], ['helen']), 'helen'), 12);
  });
});

card('mount_olympus', () => {
  it('+6 pour chaque DIEU', () => {
    assert.equal(points(play(['mount_olympus', 'zeus', 'hades']), 'mount_olympus'), 18);
  });
  it('sans Dieu : valeur de base', () => {
    assert.equal(points(play(['mount_olympus']), 'mount_olympus'), 6);
  });
});

card('oracle_delphi', () => {
  it('aucun effet sur le score', () => {
    assert.equal(points(play(['oracle_delphi', 'zeus']), 'oracle_delphi'), 7);
  });
});

card('palace', () => {
  it('+7 avec MONARQUE, +7 pour chaque ARTISTE', () => {
    assert.equal(points(play(['palace', 'agamemnon', 'homer', 'muses']), 'palace'), 28);
  });
  it('le bonus MONARQUE n’est pas cumulable', () => {
    assert.equal(points(play(['palace', 'agamemnon', 'hippolyta']), 'palace'), 14);
  });
  it('sinon : valeur de base', () => {
    assert.equal(points(play(['palace']), 'palace'), 7);
  });
});

card('persephones_garden', () => {
  it('+4 pour chaque OBJET VÉGÉTAL', () => {
    assert.equal(points(play(['persephones_garden', 'cornucopia', 'golden_apples']), 'persephones_garden'), 12);
  });
  it('un VÉGÉTAL qui n’est pas un Objet ne compte pas', () => {
    assert.equal(points(play(['persephones_garden', 'dryads', 'golden_fleece']), 'persephones_garden'), 4);
  });
});

card('river_lethe', () => {
  it('−20 sauf dans l’Au-delà', () => {
    assert.equal(points(play(['river_lethe']), 'river_lethe'), -14);
    assert.equal(points(play([], ['river_lethe']), 'river_lethe'), 6);
  });
  it('ignore les bonus des HÉROS de l’Au-delà', () => {
    assert.equal(points(play(['ares'], ['river_lethe', 'helen']), 'helen'), 2);
  });
  it('ignore les icônes des HÉROS de l’Au-delà', () => {
    assert.equal(points(play(['ares'], ['river_lethe', 'achilles']), 'ares'), 7);
    assert.equal(points(play(['ares'], ['achilles']), 'ares'), 14);
  });
  it('n’affecte pas les Héros Vivants', () => {
    assert.equal(points(play(['ares', 'achilles'], ['river_lethe']), 'ares'), 14);
  });
  it('masqué par Moly, plus d’oubli', () => {
    const r = play(['moly', 'ares'], ['river_lethe', 'achilles'], { moly: { target: 'river_lethe' } });
    assert.equal(points(r, 'ares'), 14);
  });
});

card('river_styx', () => {
  it('+5 avec DIEU et HÉROS Vivant', () => {
    assert.equal(points(play(['zeus', 'theseus'], ['river_styx']), 'river_styx'), 5);
  });
  it('rien sans Héros Vivant', () => {
    assert.equal(points(play(['zeus'], ['river_styx', 'theseus']), 'river_styx'), 0);
  });
  it('−20 sauf dans l’Au-delà', () => {
    assert.equal(points(play(['river_styx', 'zeus', 'theseus']), 'river_styx'), -15);
    assert.equal(points(play(['river_styx']), 'river_styx'), -20);
  });
});

card('sacrificial_altar', () => {
  it('+7 pour chaque HÉROS dans l’Au-delà', () => {
    assert.equal(points(play(['sacrificial_altar'], ['theseus', 'atalanta']), 'sacrificial_altar'), 14);
  });
  it('les Héros Vivants ne comptent pas', () => {
    assert.equal(points(play(['sacrificial_altar', 'theseus'], ['zeus']), 'sacrificial_altar'), 0);
  });
});

card('temple', () => {
  it('+6 avec DIEU, +6 pour chaque ARTISTE', () => {
    assert.equal(points(play(['temple', 'zeus', 'apollo']), 'temple'), 18);
    assert.equal(points(play(['temple', 'homer', 'penelope']), 'temple'), 18);
  });
  it('le bonus DIEU n’est pas cumulable', () => {
    assert.equal(points(play(['temple', 'zeus', 'hades']), 'temple'), 12);
  });
});

card('labyrinth', () => {
  it('+10 avec CRÉATURE HOSTILE, +10 avec HÉROS Vivant RUSÉ', () => {
    assert.equal(points(play(['labyrinth', 'minotaur', 'medea']), 'labyrinth'), 23);
  });
  it('chaque condition seule', () => {
    assert.equal(points(play(['labyrinth', 'minotaur', 'theseus']), 'labyrinth'), 13);
    assert.equal(points(play(['labyrinth', 'medea']), 'labyrinth'), 13);
  });
  it('un RUSÉ qui n’est pas un Héros Vivant ne compte pas', () => {
    assert.equal(points(play(['labyrinth', 'athena'], ['medea']), 'labyrinth'), 3);
  });
});

// ---------- Créatures ----------

const sendsHeroes = (monster, saved, lost) => {
  it(`les Héros restent avec ${saved}`, () => {
    assert.equal(zone(play([monster, saved]), saved), 'hand');
  });
  it(`tous les Héros partent avec seulement ${lost}`, () => {
    const r = play([monster, lost]);
    assert.equal(zone(r, lost), 'afterlife');
    assert.equal(line(r, lost).inst.sentBy.card.id, monster);
  });
};

card('antaeus', () => sendsHeroes('antaeus', 'hippolyta', 'medea'));

card('calydonian_boar', () => {
  it('les Héros restent s’il y a 3 HÉROS Vivants ou plus', () => {
    assert.equal(zone(play(['calydonian_boar', 'theseus', 'medea', 'atalanta']), 'medea'), 'hand');
  });
  it('tous les Héros partent avec 2 Héros Vivants', () => {
    const r = play(['calydonian_boar', 'theseus', 'medea']);
    assert.equal(zone(r, 'theseus'), 'afterlife');
    assert.equal(zone(r, 'medea'), 'afterlife');
  });
  it('les Héros déjà dans l’Au-delà ne comptent pas', () => {
    assert.equal(zone(play(['calydonian_boar', 'theseus', 'medea'], ['atalanta']), 'medea'), 'afterlife');
  });
});

card('cerberus', () => {
  it('+5 pour chaque HÉROS dans l’Au-delà', () => {
    assert.equal(points(play([], ['cerberus', 'theseus', 'atalanta']), 'cerberus'), 15);
  });
  it('−5 sauf dans l’Au-delà', () => {
    assert.equal(points(play(['cerberus'], ['theseus']), 'cerberus'), 5);
    assert.equal(points(play(['cerberus']), 'cerberus'), 0);
  });
});

card('chiron', () => {
  it('ajoute l’icône choisie au Héros choisi', () => {
    const r = play(['chiron', 'hippolyta', 'scylla_charybdis'], [], { chiron: { hero: 'hippolyta', tag: 'nimble' } });
    assert.ok(tagsOf(r, 'hippolyta').includes('nimble'));
    assert.equal(zone(r, 'hippolyta'), 'hand');
  });
  it('le meilleur choix trouve l’icône qui protège', () => {
    const r = playBest(['chiron', 'hippolyta', 'scylla_charybdis']);
    assert.equal(zone(r, 'hippolyta'), 'hand');
  });
});

card('dryads', () => {
  it('aucun effet', () => {
    assert.equal(points(play(['dryads', 'zeus']), 'dryads'), 14);
  });
});

card('hydra', () => {
  it('les Héros restent si un HÉROS Vivant a 3 icônes différentes', () => {
    assert.equal(zone(play(['hydra', 'penelope', 'theseus']), 'theseus'), 'hand');
  });
  it('les icônes de plusieurs Héros ne s’additionnent pas', () => {
    assert.equal(zone(play(['hydra', 'theseus', 'medea']), 'theseus'), 'afterlife');
  });
  it('les icônes ajoutées comptent', () => {
    const r = play(['hydra', 'theseus', 'pegasus'], [], { pegasus: { hero: 'theseus' } });
    assert.equal(zone(r, 'theseus'), 'hand');
  });
});

card('medusa', () => {
  sendsHeroes('medusa', 'atalanta', 'hippolyta');
  it('RUSÉ protège aussi', () => {
    assert.equal(zone(play(['medusa', 'medea']), 'medea'), 'hand');
  });
});

card('minotaur', () => {
  sendsHeroes('minotaur', 'hippolyta', 'atalanta');
  it('RUSÉ protège aussi', () => {
    assert.equal(zone(play(['minotaur', 'medea']), 'medea'), 'hand');
  });
});

card('pegasus', () => {
  it('−10 sauf avec SAGE', () => {
    assert.equal(points(play(['pegasus']), 'pegasus'), 10);
    assert.equal(points(play(['pegasus', 'tiresias']), 'pegasus'), 20);
  });
  it('ajoute ARTISTE et AGILE au Héros choisi', () => {
    const r = play(['pegasus', 'tiresias'], [], { pegasus: { hero: 'tiresias' } });
    assert.deepEqual(tagsOf(r, 'tiresias'), ['artistic', 'nimble', 'wise']);
  });
});

card('scylla_charybdis', () => sendsHeroes('scylla_charybdis', 'atalanta', 'medea'));

card('sirens', () => sendsHeroes('sirens', 'medea', 'atalanta'));

// ---------- Quêtes ----------

card('twelve_labors', () => {
  it('+12 pour chaque ROBUSTE et pour chaque CRÉATURE HOSTILE', () => {
    assert.equal(points(play(['twelve_labors', 'theseus', 'minotaur']), 'twelve_labors'), 24);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['twelve_labors', 'antaeus'], ['theseus']), 'twelve_labors'), 0);
  });
});

card('apotheosis', () => {
  it('+28 avec HÉROS (Vivant ou dans l’Au-delà), DIEU, DIVIN et MAGIQUE', () => {
    assert.equal(points(play(['apotheosis', 'zeus', 'oracle_delphi', 'medea']), 'apotheosis'), 28);
    assert.equal(points(play(['apotheosis', 'zeus', 'oracle_delphi', 'moly'], ['theseus']), 'apotheosis'), 28);
  });
  it('rien s’il manque une condition', () => {
    assert.equal(points(play(['apotheosis', 'zeus', 'oracle_delphi', 'moly']), 'apotheosis'), 0);
    assert.equal(points(play(['apotheosis', 'zeus', 'medea']), 'apotheosis'), 0);
  });
});

card('eleusinian_mysteries', () => {
  it('+27 avec HÉROS Vivant, VÉGÉTAL, ARTISTE et MAGIQUE', () => {
    assert.equal(points(play(['eleusinian_mysteries', 'theseus', 'cornucopia', 'apollo', 'moly']), 'eleusinian_mysteries'), 27);
  });
  it('rien sans Héros Vivant', () => {
    assert.equal(points(play(['eleusinian_mysteries', 'cornucopia', 'apollo', 'moly'], ['theseus']), 'eleusinian_mysteries'), 0);
  });
  it('rien sans ARTISTE', () => {
    assert.equal(points(play(['eleusinian_mysteries', 'theseus', 'cornucopia', 'moly']), 'eleusinian_mysteries'), 0);
  });
});

card('epic_quest', () => {
  it('+30 avec HÉROS Vivant, DIEU, LIEU, CRÉATURE et OBJET', () => {
    assert.equal(points(play(['epic_quest', 'theseus', 'zeus', 'oracle_delphi', 'dryads', 'cornucopia']), 'epic_quest'), 30);
  });
  it('rien s’il manque une famille', () => {
    assert.equal(points(play(['epic_quest', 'theseus', 'zeus', 'oracle_delphi', 'dryads']), 'epic_quest'), 0);
  });
});

card('glimpse_divine', () => {
  it('+8 pour chaque DIEU et chaque DIVIN', () => {
    assert.equal(points(play(['glimpse_divine', 'theseus', 'zeus', 'oracle_delphi']), 'glimpse_divine'), 16);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['glimpse_divine', 'zeus']), 'glimpse_divine'), 0);
  });
});

card('long_journey', () => {
  it('+11 pour chaque LIEU', () => {
    assert.equal(points(play(['long_journey', 'theseus', 'oracle_delphi', 'temple']), 'long_journey'), 22);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['long_journey', 'oracle_delphi']), 'long_journey'), 0);
  });
});

card('lost_knowledge', () => {
  it('+7 pour chaque ARTISTE, MAGIQUE et SAGE', () => {
    assert.equal(points(play(['lost_knowledge', 'theseus', 'apollo', 'moly', 'tiresias']), 'lost_knowledge'), 21);
  });
  it('une carte avec deux de ces icônes compte deux fois', () => {
    assert.equal(points(play(['lost_knowledge', 'circe']), 'lost_knowledge'), 14);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['lost_knowledge', 'apollo']), 'lost_knowledge'), 0);
  });
});

card('olympic_games', () => {
  it('+11 pour chaque HÉROS Vivant ROBUSTE et/ou AGILE', () => {
    assert.equal(points(play(['olympic_games', 'theseus', 'atalanta', 'medea']), 'olympic_games'), 22);
  });
  it('les Héros de l’Au-delà ne comptent pas', () => {
    assert.equal(points(play(['olympic_games'], ['theseus']), 'olympic_games'), 0);
  });
});

card('rebellious_kingdom', () => {
  it('+27 avec un HÉROS Vivant MONARQUE et un SAGE', () => {
    assert.equal(points(play(['rebellious_kingdom', 'hippolyta', 'tiresias']), 'rebellious_kingdom'), 27);
    assert.equal(points(play(['rebellious_kingdom', 'agamemnon', 'zeus']), 'rebellious_kingdom'), 27);
  });
  it('rien sans SAGE', () => {
    assert.equal(points(play(['rebellious_kingdom', 'hippolyta']), 'rebellious_kingdom'), 0);
  });
  it('rien si le MONARQUE est dans l’Au-delà', () => {
    assert.equal(points(play(['rebellious_kingdom', 'tiresias'], ['hippolyta']), 'rebellious_kingdom'), 0);
  });
});

card('trojan_war', () => {
  it('+13 pour chaque GUERRIER', () => {
    assert.equal(points(play(['trojan_war', 'achilles', 'ares']), 'trojan_war'), 26);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['trojan_war', 'ares'], ['achilles']), 'trojan_war'), 0);
  });
});

card('visit_underworld', () => {
  it('+6 pour chaque carte dans l’Au-delà', () => {
    assert.equal(points(play(['visit_underworld', 'theseus'], ['fates', 'oracle_delphi']), 'visit_underworld'), 12);
  });
  it('requiert un HÉROS Vivant', () => {
    assert.equal(points(play(['visit_underworld'], ['theseus']), 'visit_underworld'), 0);
  });
});

describe('couverture', () => {
  it('chaque carte a ses tests', () => {
    const missing = CARDS.map((c) => c.id).filter((id) => !covered.has(id));
    assert.deepEqual(missing, []);
  });
});
