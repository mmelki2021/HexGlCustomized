'use strict';

// Protege bkcore.controllers.TouchController
// (bkcore.coffee/controllers/TouchController.js) : suivi du stick virtuel
// tactile (zone gauche de l'ecran, cf. `stickMargin`) et remontee des
// touches "bouton" (zone droite). C'est ce qui pilote ShipControls en mode
// tactile ; on simule des evenements tactiles minimalistes (pas de DOM reel).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const TouchController = require(
  path.join(__dirname, '..', 'bkcore.coffee', 'controllers', 'TouchController.js')
).bkcore.controllers.TouchController;

function fakeDom() {
  const handlers = {};
  return {
    addEventListener(name, fn) { handlers[name] = fn; },
    trigger(name, event) { handlers[name](event); }
  };
}

test('un toucher dans la marge gauche demarre le stick a (0,0)', () => {
  const dom = fakeDom();
  const ctrl = new TouchController(dom, 100, null);

  dom.trigger('touchstart', {
    changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
    touches: []
  });

  assert.equal(ctrl.stickID, 1);
  assert.equal(ctrl.stickVector.x, 0);
  assert.equal(ctrl.stickVector.y, 0);
});

test('un deplacement du doigt du stick met a jour stickVector (delta depuis le point de depart)', () => {
  const dom = fakeDom();
  const ctrl = new TouchController(dom, 100, null);

  dom.trigger('touchstart', {
    changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
    touches: []
  });
  dom.trigger('touchmove', {
    preventDefault() {},
    changedTouches: [{ identifier: 1, clientX: 40, clientY: 50 }],
    touches: []
  });

  assert.equal(ctrl.stickVector.x, 30);
  assert.equal(ctrl.stickVector.y, 30);
});

test('relacher le doigt du stick reinitialise stickID et stickVector', () => {
  const dom = fakeDom();
  const ctrl = new TouchController(dom, 100, null);

  dom.trigger('touchstart', {
    changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
    touches: []
  });
  dom.trigger('touchend', {
    changedTouches: [{ identifier: 1 }],
    touches: []
  });

  assert.equal(ctrl.stickID, -1);
  assert.equal(ctrl.stickVector.x, 0);
  assert.equal(ctrl.stickVector.y, 0);
});

test('un toucher hors de la marge du stick declenche buttonCallback(true/false) sans toucher au stick', () => {
  const dom = fakeDom();
  const calls = [];
  const ctrl = new TouchController(dom, 100, (state, touch) => {
    calls.push({ state, id: touch.identifier });
  });

  dom.trigger('touchstart', {
    changedTouches: [{ identifier: 2, clientX: 500, clientY: 20 }],
    touches: []
  });
  dom.trigger('touchend', {
    changedTouches: [{ identifier: 2 }],
    touches: []
  });

  assert.equal(ctrl.stickID, -1); // le stick n'a jamais ete assigne a ce doigt
  assert.deepEqual(calls, [
    { state: true, id: 2 },
    { state: false, id: 2 }
  ]);
});

test('isCompatible() reflete "ontouchstart" sur document.documentElement', () => {
  const originalDocument = global.document;
  global.document = { documentElement: { ontouchstart: null } };
  assert.equal(TouchController.isCompatible(), true);

  global.document = { documentElement: {} };
  assert.equal(TouchController.isCompatible(), false);

  global.document = originalDocument;
});
