'use strict';

// Protege bkcore.controllers.GamepadController
// (bkcore.coffee/controllers/GamepadController.js) : detection de compatibilite
// et lecture du premier gamepad branche.
//
// updateAvailable() lit l'axe gauche (direction), le bouton 0 (acceleration),
// les boutons 6 et 7 (gachettes) et le bouton 8 (select, qui declenche un
// restart via ShipControls). C'est la seule source d'entree manette du jeu.
//
// navigator est fourni par le test ; il est redefini avec Object.defineProperty
// car c'est un accesseur natif en lecture seule depuis Node 21.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const GamepadController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'GamepadController.js')
).bkcore.controllers.GamepadController;

function withGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  };
}

// Gamepad factice : 9 boutons, aux index lus par le controleur.
function fakeGamepad({ axis = 0, accel = 0, lt = 0, rt = 0, sel = 0 } = {}) {
  return { axes: [axis], buttons: [accel, 0, 0, 0, 0, 0, lt, rt, sel] };
}

function withGamepads(t, gamepads) {
  t.after(withGlobal('navigator', { getGamepads: () => gamepads }));
}

test('isCompatible suit la presence de getGamepads sur navigator', (t) => {
  t.after(withGlobal('navigator', { getGamepads: () => [] }));
  assert.equal(GamepadController.isCompatible(), true);
});

test('isCompatible reconnait aussi le prefixe webkit', (t) => {
  t.after(withGlobal('navigator', { webkitGetGamepads: () => [] }));
  assert.equal(GamepadController.isCompatible(), true);
});

test('isCompatible est faux sans API gamepad', (t) => {
  t.after(withGlobal('navigator', {}));
  assert.equal(GamepadController.isCompatible(), false);
});

test('le constructeur stocke le callback et demarre actif', () => {
  const callback = () => {};
  const controller = new GamepadController(callback);

  assert.equal(controller.buttonPressCallback, callback);
  assert.equal(controller.active, true);
  assert.deepEqual(controller.leftStickArray, []);
  assert.deepEqual(controller.rightStickArray, []);
});

test('updateAvailable renvoie false quand le controleur est inactif', (t) => {
  withGamepads(t, [fakeGamepad()]);
  const controller = new GamepadController(() => {});
  controller.active = false;

  assert.equal(controller.updateAvailable(), false);
});

test('updateAvailable renvoie false quand aucun gamepad n est connecte', (t) => {
  withGamepads(t, []);
  const controller = new GamepadController(() => {});

  assert.equal(controller.updateAvailable(), false);
});

test('updateAvailable ne fait rien quand le gamepad n expose ni boutons ni axes', (t) => {
  withGamepads(t, [{ axes: null, buttons: null }]);
  const calls = [];
  const controller = new GamepadController(() => calls.push(1));

  assert.equal(controller.updateAvailable(), undefined);
  assert.equal(calls.length, 0);
});

test('updateAvailable mappe axe, acceleration, gachettes et select, puis rappelle le callback', (t) => {
  withGamepads(t, [fakeGamepad({ axis: -0.5, accel: 1, lt: 0.4, rt: 0.8, sel: 0 })]);
  const seen = [];
  const controller = new GamepadController((gamepad) => seen.push(gamepad));

  assert.equal(controller.updateAvailable(), true);
  assert.equal(controller.lstickx, -0.5);
  assert.equal(controller.acceleration, 1);
  assert.equal(controller.ltrigger, 0.4);
  assert.equal(controller.rtrigger, 0.8);
  assert.equal(controller.select, 0);
  assert.equal(seen.length, 1);
  assert.equal(seen[0], controller);
});

test('updateAvailable lit aussi la forme moderne { pressed } des boutons', (t) => {
  withGamepads(t, [fakeGamepad({
    accel: { pressed: true },
    lt: { pressed: false },
    rt: { pressed: true },
    sel: { pressed: false }
  })]);
  const controller = new GamepadController(() => {});

  controller.updateAvailable();

  assert.equal(controller.acceleration, true);
  assert.equal(controller.ltrigger, false);
  assert.equal(controller.rtrigger, true);
  assert.equal(controller.select, false);
});
