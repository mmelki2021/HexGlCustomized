'use strict';

// Protege bkcore.Timer (bkcore.coffee/Timer.js) : conversion et formatage de
// durees utilisees pour l'affichage du temps de course et des temps au tour.
// Ce sont des fonctions statiques pures, sans dependance au DOM.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { bkcore } = require(path.join('..', 'bkcore.coffee', 'Timer.js'));
const Timer = bkcore.Timer;

test('msToTime decompose 0 ms en zeros', () => {
  assert.deepEqual(Timer.msToTime(0), { h: 0, m: 0, s: 0, ms: 0 });
});

test('msToTime decompose une duree sous la seconde', () => {
  assert.deepEqual(Timer.msToTime(432), { h: 0, m: 0, s: 0, ms: 432 });
});

test('msToTime decompose minutes/secondes/millisecondes', () => {
  // 65432 ms = 1 min, 5 s, 432 ms
  assert.deepEqual(Timer.msToTime(65432), { h: 0, m: 1, s: 5, ms: 432 });
});

test('msToTime decompose les heures', () => {
  // 3 723 004 ms = 1h 2min 3s 4ms
  assert.deepEqual(Timer.msToTime(3723004), { h: 1, m: 2, s: 3, ms: 4 });
});

test('msToTimeString applique un zero-padding sur h/m/s (2) et ms (4)', () => {
  const t = Timer.msToTimeString(65432);
  assert.equal(t.h, '00');
  assert.equal(t.m, '01');
  assert.equal(t.s, '05');
  assert.equal(t.ms, '0432');
});

test('msToTimeString ne tronque pas une valeur deja plus longue que le pad', () => {
  // 100h -> "h" n'est zero-padde que sur 2 caracteres, la valeur reste lisible
  const t = Timer.msToTimeString(100 * 3600000);
  assert.equal(t.h, '100');
});

test('zfill ajoute des zeros de tete jusqu\'a la taille demandee', () => {
  assert.equal(Timer.zfill(5, 2), '05');
  assert.equal(Timer.zfill(42, 4), '0042');
});

test('zfill ne modifie pas un nombre deja assez long', () => {
  assert.equal(Timer.zfill(12345, 2), '12345');
});
