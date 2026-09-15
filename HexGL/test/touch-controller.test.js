'use strict';

// Protege bkcore.controllers.TouchController
// (bkcore.coffee/controllers/TouchController.js) : detection de compatibilite,
// capture du joystick tactile (le "stick") dans la marge gauche de l'ecran,
// suivi de son deplacement, et remontee des touches hors marge au callback de
// bouton.
//
// C'est le controleur par defaut sur appareil tactile (choisi par launch.js),
// donc une regression ici casserait le jeu sur mobile.
//
// Le DOM est remplace par un objet minimal qui enregistre ses ecouteurs.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const TouchController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'TouchController.js')
).bkcore.controllers.TouchController;

function withGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  };
}

// Faux element DOM : enregistre le type des ecouteurs qui lui sont attaches.
function fakeDom() {
  const listeners = [];
  return {
    listeners,
    addEventListener(type) {
      listeners.push(type);
    }
  };
}

test('isCompatible suit la presence de ontouchstart sur documentElement', (t) => {
  const restore = withGlobal('document', { documentElement: { ontouchstart: null } });
  t.after(restore);
  assert.equal(TouchController.isCompatible(), true);
});

test('isCompatible est faux sans ontouchstart', (t) => {
  const restore = withGlobal('document', { documentElement: {} });
  t.after(restore);
  assert.equal(TouchController.isCompatible(), false);
});

test('le constructeur applique ses valeurs par defaut et ecoute les 3 evenements tactiles', () => {
  const dom = fakeDom();
  const controller = new TouchController(dom);

  assert.equal(controller.stickMargin, 200);
  assert.equal(controller.buttonCallback, null);
  assert.equal(controller.active, true);
  assert.equal(controller.stickID, -1);
  assert.deepEqual(dom.listeners, ['touchstart', 'touchmove', 'touchend']);
});

test('touchStart capture le stick pour une touche dans la marge gauche', () => {
  const controller = new TouchController(fakeDom(), 200, () => {
    throw new Error('le callback de bouton ne doit pas etre appele pour le stick');
  });
  const touch = { identifier: 7, clientX: 50, clientY: 20 };

  controller.touchStart({ changedTouches: [touch], touches: [touch] });

  assert.equal(controller.stickID, 7);
  assert.equal(controller.stickStartPos.x, 50);
  assert.equal(controller.stickStartPos.y, 20);
  assert.equal(controller.stickVector.x, 0);
  assert.equal(controller.stickVector.y, 0);
});

test('touchStart remonte au callback les touches hors de la marge du stick', () => {
  const calls = [];
  const controller = new TouchController(fakeDom(), 200, (...args) => calls.push(args));
  const touch = { identifier: 9, clientX: 400, clientY: 20 };

  controller.touchStart({ changedTouches: [touch], touches: [touch] });

  assert.equal(controller.stickID, -1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], true); // true = appui
  assert.equal(calls[0][1], touch);
});

test('touchMove deplace le stick et met a jour stickVector', () => {
  const controller = new TouchController(fakeDom());
  const down = { identifier: 3, clientX: 100, clientY: 100 };
  controller.touchStart({ changedTouches: [down], touches: [down] });

  controller.touchMove({
    changedTouches: [{ identifier: 3, clientX: 130, clientY: 90 }],
    touches: [],
    preventDefault() {}
  });

  assert.equal(controller.stickPos.x, 130);
  assert.equal(controller.stickVector.x, 30);
  assert.equal(controller.stickVector.y, -10);
});

test('touchMove ignore les touches qui ne sont pas le stick', () => {
  const controller = new TouchController(fakeDom());
  const down = { identifier: 3, clientX: 100, clientY: 100 };
  controller.touchStart({ changedTouches: [down], touches: [down] });

  controller.touchMove({
    changedTouches: [{ identifier: 4, clientX: 10, clientY: 10 }],
    touches: [],
    preventDefault() {}
  });

  assert.equal(controller.stickVector.x, 0);
  assert.equal(controller.stickVector.y, 0);
});

test('touchEnd relache le stick et remet stickVector a zero', () => {
  const controller = new TouchController(fakeDom());
  const down = { identifier: 3, clientX: 100, clientY: 100 };
  controller.touchStart({ changedTouches: [down], touches: [down] });
  controller.touchMove({
    changedTouches: [{ identifier: 3, clientX: 150, clientY: 100 }],
    touches: [],
    preventDefault() {}
  });

  controller.touchEnd({ changedTouches: [{ identifier: 3 }], touches: [] });

  assert.equal(controller.stickID, -1);
  assert.equal(controller.stickVector.x, 0);
  assert.equal(controller.stickVector.y, 0);
});

test('un controleur inactif ignore les evenements', () => {
  const calls = [];
  const controller = new TouchController(fakeDom(), 200, () => calls.push(1));
  controller.active = false;

  controller.touchStart({ changedTouches: [{ identifier: 1, clientX: 500, clientY: 0 }], touches: [] });

  assert.equal(calls.length, 0);
  assert.equal(controller.touches, null);
});
