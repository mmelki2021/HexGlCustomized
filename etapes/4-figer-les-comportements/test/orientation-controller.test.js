'use strict';

// Protege bkcore.controllers.OrientationController
// (bkcore.coffee/controllers/OrientationController.js) : le premier
// evenement "deviceorientation" recu sert de calibration (offset 0,0,0), et
// les evenements suivants sont exprimes en relatif par rapport a cette
// calibration. C'est cette logique qui pilote ShipControls en mode gyroscope.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const OrientationController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'OrientationController.js')
).bkcore.controllers.OrientationController;

const originalWindow = global.window;

function fakeWindow() {
  const handlers = {};
  return {
    addEventListener(name, fn) { handlers[name] = fn; },
    trigger(name, event) { handlers[name](event); }
  };
}

afterEach(() => {
  global.window = originalWindow;
});

test('le premier evenement calibre la reference (deltas a 0)', () => {
  global.window = fakeWindow();
  const dom = { addEventListener() {} };
  const ctrl = new OrientationController(dom, false, null);

  global.window.trigger('deviceorientation', { alpha: 100, beta: 10, gamma: 5 });

  assert.equal(ctrl.alpha, 0);
  assert.equal(ctrl.beta, 0);
  assert.equal(ctrl.gamma, 0);
});

test('les evenements suivants sont relatifs a la calibration initiale', () => {
  global.window = fakeWindow();
  const dom = { addEventListener() {} };
  const ctrl = new OrientationController(dom, false, null);

  global.window.trigger('deviceorientation', { alpha: 100, beta: 10, gamma: 5 });
  global.window.trigger('deviceorientation', { alpha: 110, beta: 15, gamma: 5 });

  assert.equal(ctrl.alpha, 10);
  assert.equal(ctrl.beta, 5);
  assert.equal(ctrl.gamma, 0);
});

test('aucune mise a jour si le controller est inactif', () => {
  global.window = fakeWindow();
  const dom = { addEventListener() {} };
  const ctrl = new OrientationController(dom, false, null);
  ctrl.active = false;

  global.window.trigger('deviceorientation', { alpha: 100, beta: 10, gamma: 5 });

  assert.equal(ctrl.alpha, 0);
  assert.equal(ctrl.beta, 0);
  assert.equal(ctrl.gamma, 0);
  assert.equal(ctrl.dalpha, null); // pas encore calibre
});

test('isCompatible() reflete la presence de DeviceOrientationEvent sur window', () => {
  global.window = { DeviceOrientationEvent: function () {} };
  assert.equal(OrientationController.isCompatible(), true);

  global.window = {};
  assert.equal(OrientationController.isCompatible(), false);
});
