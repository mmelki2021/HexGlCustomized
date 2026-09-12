'use strict';

// Protege une partie de bkcore.Utils (bkcore.coffee/Utils.js) : detection
// tactile, lecture des parametres d'URL (utilises par launch.coffee pour
// pre-remplir les reglages controlType/quality/hud/godmode) et calcul d'offset
// DOM. Ces methodes lisent `window`/`navigator`/des objets DOM simples, mais
// ne font aucun rendu : elles sont mockables sans navigateur.
//
// Note Node >= 21 : `navigator` est une propriete globale native en lecture
// seule (accessor getter). Une simple affectation `global.navigator = {...}`
// est silencieusement ignoree ; il faut redefinir la propriete.

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const utilsPath = path.join(__dirname, '..', 'bkcore.coffee', 'Utils.js');
const Utils = require(utilsPath).bkcore.Utils;

const originalWindow = global.window;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true
  });
}

afterEach(() => {
  global.window = originalWindow;
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  }
  // Reinitialise le cache statique de getURLParameter entre les tests.
  Utils.URLParameters = null;
});

test('isTouchDevice() est false quand aucun indice tactile n\'est present', () => {
  global.window = {};
  setNavigator({});
  assert.equal(Utils.isTouchDevice(), false);
});

test('isTouchDevice() detecte "ontouchstart" sur window', () => {
  global.window = { ontouchstart: null };
  setNavigator({});
  assert.equal(Utils.isTouchDevice(), true);
});

test('isTouchDevice() ignore navigator.maxTouchPoints (bug de casse existant)', () => {
  // La casse standard actuelle est "maxTouchPoints" ; le code lit
  // "MaxTouchPoints" (majuscule) et ne la detecte donc jamais.
  // Ce test fige ce comportement pour qu'un refactor involontaire ne le
  // "corrige" pas silencieusement sans decision explicite.
  global.window = {};
  setNavigator({ maxTouchPoints: 5 });
  assert.equal(Utils.isTouchDevice(), false);
});

test('isTouchDevice() detecte navigator.MaxTouchPoints (casse historique lue par le code)', () => {
  global.window = {};
  setNavigator({ MaxTouchPoints: 5 });
  assert.equal(Utils.isTouchDevice(), true);
});

test('isTouchDevice() detecte navigator.msMaxTouchPoints (IE/Edge legacy)', () => {
  global.window = {};
  setNavigator({ msMaxTouchPoints: 5 });
  assert.equal(Utils.isTouchDevice(), true);
});

test('getURLParameter lit un parametre present dans window.location.href', () => {
  global.window = { location: { href: 'http://example.com/?controlType=1&quality=3' } };
  assert.equal(Utils.getURLParameter('controlType'), '1');
  assert.equal(Utils.getURLParameter('quality'), '3');
});

test('getURLParameter retourne undefined pour un parametre absent', () => {
  global.window = { location: { href: 'http://example.com/?controlType=1' } };
  assert.equal(Utils.getURLParameter('missing'), undefined);
});

test('getURLParameter met en cache le premier href lu (ne se remet pas a jour ensuite)', () => {
  // Comportement actuel : @URLParameters est un cache statique rempli au
  // premier appel. Un changement ulterieur de window.location.href n'est
  // pas repris tant que le cache n'est pas explicitement vide.
  global.window = { location: { href: 'http://example.com/?quality=1' } };
  assert.equal(Utils.getURLParameter('quality'), '1');

  global.window = { location: { href: 'http://example.com/?quality=9' } };
  assert.equal(Utils.getURLParameter('quality'), '1');
});

test('getOffsetTop cumule offsetTop en remontant la chaine offsetParent', () => {
  const grandparent = { offsetTop: 100, offsetParent: null };
  const parent = { offsetTop: 50, offsetParent: grandparent };
  const el = { offsetTop: 10, offsetParent: parent };
  assert.equal(Utils.getOffsetTop(el), 160);
});

test('getOffsetTop sans offsetParent retourne juste offsetTop de l\'element', () => {
  const el = { offsetTop: 42, offsetParent: null };
  assert.equal(Utils.getOffsetTop(el), 42);
});
