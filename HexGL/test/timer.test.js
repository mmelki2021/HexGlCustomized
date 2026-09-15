'use strict';

// Protege bkcore.Timer (bkcore.coffee/Timer.js) : decomposition d'une duree en
// heures / minutes / secondes / millisecondes et formatage avec zeros de tete.
// C'est ce formatage qui produit le temps de course et les temps au tour
// affiches par le HUD et par l'ecran de fin.
//
// msToTime(), msToTimeString() et zfill() sont des fonctions statiques pures.
// getElapsedTime() et update() ne lisent l'horloge que lorsqu'elles sont
// reellement appelees, ce qui permet de les exercer sans navigateur.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Timer = require(path.join(__dirname, '..', 'bkcore.coffee', 'Timer.js')).bkcore.Timer;

test('msToTime decompose une duree nulle', () => {
  assert.deepEqual(Timer.msToTime(0), { h: 0, m: 0, s: 0, ms: 0 });
});

test('msToTime decompose une duree inferieure a la seconde', () => {
  assert.deepEqual(Timer.msToTime(432), { h: 0, m: 0, s: 0, ms: 432 });
});

test('msToTime decompose minutes, secondes et millisecondes', () => {
  // 65 432 ms = 1 min 5 s 432 ms
  assert.deepEqual(Timer.msToTime(65432), { h: 0, m: 1, s: 5, ms: 432 });
});

test('msToTime decompose les heures', () => {
  // 3 723 004 ms = 1 h 2 min 3 s 4 ms
  assert.deepEqual(Timer.msToTime(3723004), { h: 1, m: 2, s: 3, ms: 4 });
});

test('msToTime ne bascule pas en jours : les heures ne sont pas bornees', () => {
  // Une course tres longue doit continuer a s'afficher en heures.
  assert.deepEqual(Timer.msToTime(25 * 3600000), { h: 25, m: 0, s: 0, ms: 0 });
});

test('msToTimeString padde h/m/s sur 2 chiffres et ms sur 4', () => {
  const t = Timer.msToTimeString(65432);
  assert.equal(t.h, '00');
  assert.equal(t.m, '01');
  assert.equal(t.s, '05');
  assert.equal(t.ms, '0432');
});

test('msToTimeString padde aussi les petites valeurs', () => {
  const t = Timer.msToTimeString(5);
  assert.deepEqual(t, { h: '00', m: '00', s: '00', ms: '0005' });
});

test('msToTimeString ne tronque pas une valeur plus longue que le pad', () => {
  const t = Timer.msToTimeString(100 * 3600000 + 1); // 100 h 0 min 0 s 1 ms
  assert.equal(t.h, '100');
});

test('zfill complete avec des zeros de tete', () => {
  assert.equal(Timer.zfill(5, 2), '05');
  assert.equal(Timer.zfill(42, 4), '0042');
});

test('zfill ne tronque jamais une valeur deja plus longue que la taille demandee', () => {
  assert.equal(Timer.zfill(12345, 2), '12345');
});

test('getElapsedTime formate time.elapsed via msToTime', () => {
  const timer = new Timer();
  timer.time.elapsed = 65432;
  assert.deepEqual(timer.getElapsedTime(), { h: 0, m: 1, s: 5, ms: 432 });
});

test('update() est sans effet tant que le timer est inactif', () => {
  const timer = new Timer();
  assert.equal(timer.active, false);
  timer.time.elapsed = 999;
  timer.update();
  assert.equal(timer.time.elapsed, 999);
});

test('pause(true) desactive le timer, pause(false) le reactive', () => {
  const timer = new Timer();
  timer.pause(false);
  assert.equal(timer.active, true);
  timer.pause(true);
  assert.equal(timer.active, false);
});
