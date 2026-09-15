'use strict';

// Protege bkcore.controllers.OrientationController
// (bkcore.coffee/controllers/OrientationController.js) : detection de
// compatibilite et logique de calibration du gyroscope.
//
// Le premier evenement d'orientation sert de reference (calibration) et remet
// alpha / beta / gamma a zero ; les evenements suivants sont exprimes en ecart
// par rapport a cette reference. C'est ce qui permet de jouer avec le telephone
// dans n'importe quelle position de depart.
//
// La logique d'orientation est exercee en appelant directement la methode du
// prototype sur un objet factice, sans passer par le constructeur (qui exige
// window.addEventListener).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const OrientationController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'OrientationController.js')
).bkcore.controllers.OrientationController;

const proto = OrientationController.prototype;

function withGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  };
}

// Etat interne minimal attendu par orientationChange().
function fakeContext() {
  return {
    active: true,
    alpha: 0.0,
    beta: 0.0,
    gamma: 0.0,
    dalpha: null,
    dbeta: null,
    dgamma: null
  };
}

test('isCompatible suit la presence de DeviceOrientationEvent sur window', (t) => {
  const restore = withGlobal('window', { DeviceOrientationEvent: function () {} });
  t.after(restore);
  assert.equal(OrientationController.isCompatible(), true);
});

test('isCompatible est faux sans DeviceOrientationEvent', (t) => {
  const restore = withGlobal('window', {});
  t.after(restore);
  assert.equal(OrientationController.isCompatible(), false);
});

test('le premier evenement calibre le gyroscope et remet les angles a zero', (t) => {
  // Le code trace la calibration dans la console : on la neutralise pour ne pas
  // polluer la sortie des tests.
  const realLog = console.log;
  console.log = () => {};
  t.after(() => { console.log = realLog; });

  const ctx = fakeContext();
  proto.orientationChange.call(ctx, { alpha: 10, beta: 20, gamma: 30 });

  assert.equal(ctx.dalpha, 10);
  assert.equal(ctx.dbeta, 20);
  assert.equal(ctx.dgamma, 30);
  assert.equal(ctx.alpha, 0);
  assert.equal(ctx.beta, 0);
  assert.equal(ctx.gamma, 0);
});

test('les evenements suivants sont exprimes en ecart par rapport a la calibration', () => {
  const ctx = fakeContext();
  ctx.dalpha = 10;
  ctx.dbeta = 20;
  ctx.dgamma = 30;

  proto.orientationChange.call(ctx, { alpha: 15, beta: 25, gamma: 35 });

  assert.equal(ctx.alpha, 5);
  assert.equal(ctx.beta, 5);
  assert.equal(ctx.gamma, 5);
});

test('un controleur inactif ignore les evenements d orientation', () => {
  const ctx = fakeContext();
  ctx.active = false;

  proto.orientationChange.call(ctx, { alpha: 10, beta: 20, gamma: 30 });

  assert.equal(ctx.dalpha, null);
  assert.equal(ctx.alpha, 0);
});

test('le constructeur applique ses valeurs par defaut et enregistre les ecouteurs', (t) => {
  const added = [];
  const restore = withGlobal('window', { addEventListener: (type) => added.push(type) });
  t.after(restore);

  const dom = { addEventListener: (type) => added.push(type) };
  const controller = new OrientationController(dom);

  assert.equal(controller.active, true);
  assert.equal(controller.registerTouch, true);
  assert.equal(controller.touchCallback, null);
  assert.equal(controller.dalpha, null);
  assert.deepEqual(added, ['deviceorientation', 'touchstart', 'touchend']);
});

test('registerTouch a false n ecoute pas les evenements tactiles', (t) => {
  const added = [];
  const restore = withGlobal('window', { addEventListener: (type) => added.push(type) });
  t.after(restore);

  const dom = { addEventListener: (type) => added.push(type) };
  new OrientationController(dom, false);

  assert.deepEqual(added, ['deviceorientation']);
});
