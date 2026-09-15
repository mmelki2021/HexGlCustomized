'use strict';

// Protege bkcore.Utils (bkcore.coffee/Utils.js) : detection du tactile, lecture
// des parametres d'URL et calcul d'offset DOM.
//
// getURLParameter() est utilise par launch.js pour pre-remplir les quatre
// reglages du menu (controlType / quality / hud / godmode) : c'est le seul moyen
// de parametrer une partie par l'URL avant l'ecran-titre.
//
// Ces methodes ne font aucun rendu, mais lisent window / navigator / document.
//
// Note Node >= 21 : `navigator` est un accesseur global natif en lecture seule.
// Une affectation `global.navigator = {...}` est silencieusement ignoree ; il
// faut redefinir la propriete avec Object.defineProperty.

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Utils = require(path.join(__dirname, '..', 'bkcore.coffee', 'Utils.js')).bkcore.Utils;

const savedDescriptors = new Map();

function setGlobal(name, value) {
  if (!savedDescriptors.has(name)) {
    savedDescriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

beforeEach(() => {
  // getURLParameter met la reponse en cache dans une propriete statique :
  // elle doit etre videe entre les tests pour que chacun reparte de son URL.
  Utils.URLParameters = null;
});

afterEach(() => {
  for (const [name, descriptor] of savedDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  savedDescriptors.clear();
  Utils.URLParameters = null;
});

test('isTouchDevice detecte ontouchstart sur window', () => {
  setGlobal('window', { ontouchstart: null });
  setGlobal('navigator', {});
  assert.equal(Utils.isTouchDevice(), true);
});

test('isTouchDevice reconnait navigator.msMaxTouchPoints (prefixe constructeur)', () => {
  setGlobal('window', {});
  setGlobal('navigator', { msMaxTouchPoints: 2 });
  assert.equal(Utils.isTouchDevice(), true);
});

test('isTouchDevice est faux sans aucun signal tactile', () => {
  setGlobal('window', {});
  setGlobal('navigator', {});
  assert.equal(Utils.isTouchDevice(), false);
});

// Remarque volontaire : le code lit `navigator.MaxTouchPoints` (majuscule), la
// propriete standard etant `maxTouchPoints`. Cette branche est donc inerte et
// n'est pas figee ici — la corriger plus tard ne doit pas casser ces tests.

test('getURLParameter extrait les parametres de window.location.href', () => {
  setGlobal('window', { location: { href: 'http://localhost:8000/?controlType=2&quality=3' } });
  assert.equal(Utils.getURLParameter('controlType'), '2');
  assert.equal(Utils.getURLParameter('quality'), '3');
});

test('getURLParameter gere plusieurs parametres et le separateur &', () => {
  setGlobal('window', {
    location: { href: 'http://localhost:8000/index.html?controlType=1&quality=2&hud=0' }
  });
  assert.equal(Utils.getURLParameter('controlType'), '1');
  assert.equal(Utils.getURLParameter('quality'), '2');
  assert.equal(Utils.getURLParameter('hud'), '0');
});

test('getURLParameter renvoie undefined pour un parametre absent', () => {
  setGlobal('window', { location: { href: 'http://localhost:8000/?controlType=2' } });
  assert.equal(Utils.getURLParameter('godmode'), undefined);
});

test('getURLParameter renvoie toujours une chaine, jamais un nombre', () => {
  // launch.js se sert de cette valeur comme index dans ses tableaux de libelles :
  // la valeur "0" ne doit pas etre confondue avec le nombre 0.
  setGlobal('window', { location: { href: 'http://localhost:8000/?godmode=0' } });
  assert.equal(typeof Utils.getURLParameter('godmode'), 'string');
});

test('getOffsetTop additionne la chaine des offsetParent', () => {
  const element = {
    offsetTop: 10,
    offsetParent: { offsetTop: 5, offsetParent: { offsetTop: 2, offsetParent: null } }
  };
  assert.equal(Utils.getOffsetTop(element), 17);
});

test('getOffsetTop se limite a offsetTop quand il n y a pas d offsetParent', () => {
  assert.equal(Utils.getOffsetTop({ offsetTop: 42, offsetParent: null }), 42);
});
