'use strict';

// Protege bkcore.ImageData (bkcore.coffee/ImageData.js) : lecture de pixels
// (exacte et bilineaire) sur un buffer RGBA deja charge. C'est le moteur de
// detection de collision/hauteur/checkpoint (lecture de textures analysees).
// On contourne le constructeur (qui a besoin d'un <canvas>/<img>) en injectant
// directement `pixels` sur un objet cree via Object.create.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { bkcore } = require(path.join('..', 'bkcore.coffee', 'ImageData.js'));
const ImageDataClass = bkcore.ImageData;

function makeImage(width, height, data) {
  const img = Object.create(ImageDataClass.prototype);
  img.pixels = { width, height, data };
  img.loaded = true;
  return img;
}

// Grille 2x2, seul le canal R varie pour rendre les calculs lisibles :
// (0,0)=0   (1,0)=100
// (0,1)=50  (1,1)=200
function makeSampleImage() {
  return makeImage(2, 2, [
    0, 10, 20, 255,     100, 10, 20, 255,
    50, 10, 20, 255,    200, 10, 20, 255
  ]);
}

test('getPixel lit les 4 canaux RGBA a un index exact', () => {
  const img = makeSampleImage();
  assert.deepEqual(img.getPixel(0, 0), { r: 0, g: 10, b: 20, a: 255 });
  assert.deepEqual(img.getPixel(1, 1), { r: 200, g: 10, b: 20, a: 255 });
});

test('getPixel hors limites retourne du noir transparent (comportement actuel)', () => {
  const img = makeSampleImage();
  assert.deepEqual(img.getPixel(-1, 0), { r: 0, g: 0, b: 0, a: 0 });
  assert.deepEqual(img.getPixel(0, 99), { r: 0, g: 0, b: 0, a: 0 });
});

test('getPixel sur une image non chargee (pixels=null) retourne du noir transparent', () => {
  const img = Object.create(ImageDataClass.prototype);
  img.pixels = null;
  assert.deepEqual(img.getPixel(0, 0), { r: 0, g: 0, b: 0, a: 0 });
});

test('getPixelF encode r + g*255 + b*255*255', () => {
  const img = makeSampleImage();
  // pixel (1,0) = r:100, g:10, b:20
  assert.equal(img.getPixelF(1, 0), 100 + 10 * 255 + 20 * 255 * 255);
});

test('getPixelBilinear au centre exact d\'un pixel retourne ce pixel inchange', () => {
  const img = makeSampleImage();
  assert.deepEqual(img.getPixelBilinear(0.5, 0.5), { r: 0, g: 10, b: 20, a: 255 });
  assert.deepEqual(img.getPixelBilinear(1.5, 1.5), { r: 200, g: 10, b: 20, a: 255 });
});

test('getPixelBilinear a la frontiere de l\'image melange avec le noir hors-limites', () => {
  const img = makeSampleImage();
  // A (1.0, 0.0), deux des quatre voisins sont hors image -> traites comme noir.
  // Valeur figee du comportement actuel (voir docs/architecture.md, section bugs).
  const result = img.getPixelBilinear(1.0, 0.0);
  assert.deepEqual(result, { r: 25, g: 5, b: 10, a: 127.5 });
});

test('getPixelFBilinear applique la meme formule que getPixelF sur un pixel interpole', () => {
  const img = makeSampleImage();
  assert.equal(img.getPixelFBilinear(0.5, 0.5), 0 + 10 * 255 + 20 * 255 * 255);
});
