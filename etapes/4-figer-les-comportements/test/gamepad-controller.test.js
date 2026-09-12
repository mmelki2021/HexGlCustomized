'use strict';

// Protege bkcore.controllers.GamepadController
// (bkcore.coffee/controllers/GamepadController.js) : lecture d'un gamepad
// et compatibilite avec les deux formes historiques de la Gamepad API
// (boutons objets {pressed:bool} vs boutons "bruts" 0/1 sur les anciens
// navigateurs). C'est cette logique qui alimente ShipControls en entrees
// manette ; la casser change silencieusement le comportement de jeu.
//
// Note Node >= 21 : `navigator` est un accessor global natif en lecture
// seule, une simple affectation `global.navigator = {...}` est ignoree ;
// on redefinit la propriete via Object.defineProperty.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const GamepadController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'GamepadController.js')
).bkcore.controllers.GamepadController;

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true
  });
}

afterEach(() => {
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  }
});

test('updateAvailable() renvoie false et ne fait rien si le controller est inactif', () => {
  let called = false;
  const ctrl = new GamepadController(() => { called = true; });
  ctrl.active = false;
  setNavigator({ getGamepads: () => [{ axes: [0], buttons: [] }] });

  assert.equal(ctrl.updateAvailable(), false);
  assert.equal(called, false);
});

test('updateAvailable() renvoie false si aucun gamepad n\'est connecte', () => {
  const ctrl = new GamepadController(() => {});
  setNavigator({ getGamepads: () => [] });

  assert.equal(ctrl.updateAvailable(), false);
});

test('updateAvailable() mappe axes/boutons avec la Gamepad API moderne ({pressed})', () => {
  let received = null;
  const ctrl = new GamepadController((c) => { received = c; });
  setNavigator({
    getGamepads: () => [{
      axes: [0.75],
      buttons: [
        { pressed: true },  // 0: acceleration
        null, null, null, null, null,
        { pressed: false }, // 6: ltrigger
        { pressed: false }, // 7: rtrigger
        { pressed: false }  // 8: select
      ]
    }]
  });

  assert.equal(ctrl.updateAvailable(), true);
  assert.equal(ctrl.lstickx, 0.75);
  assert.equal(received.acceleration, true);
  assert.equal(received.ltrigger, false);
  assert.equal(received.rtrigger, false);
  assert.equal(received.select, false);
});

test('updateAvailable() retombe sur des valeurs brutes pour l\'ancienne Gamepad API', () => {
  // Anciens navigateurs : gp.buttons[i] est un nombre (0/1), pas un objet
  // {pressed}. Le code utilise alors ce nombre tel quel comme valeur.
  let received = null;
  const ctrl = new GamepadController((c) => { received = c; });
  setNavigator({
    getGamepads: () => [{
      axes: [0.2],
      buttons: [1, null, null, null, null, null, 0, 0, 1]
    }]
  });

  assert.equal(ctrl.updateAvailable(), true);
  assert.equal(received.acceleration, 1);
  assert.equal(received.ltrigger, 0);
  assert.equal(received.rtrigger, 0);
  assert.equal(received.select, 1);
});

test('isCompatible() detecte getGamepads ou webkitGetGamepads sur navigator', () => {
  setNavigator({ getGamepads: () => [] });
  assert.equal(GamepadController.isCompatible(), true);

  setNavigator({ webkitGetGamepads: () => [] });
  assert.equal(GamepadController.isCompatible(), true);

  setNavigator({});
  assert.equal(GamepadController.isCompatible(), false);
});
