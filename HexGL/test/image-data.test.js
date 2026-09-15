'use strict';

// Protege bkcore.ImageData (bkcore.coffee/ImageData.js) : indexation des pixels
// RGBA et interpolation bilineaire.
//
// Ces methodes servent aux "analyseurs" de la piste (collision.png et
// height.png, chargees par Cityscape) : la lecture d'un pixel y determine le
// checkpoint franchi et la hauteur du vaisseau. Ce sont donc des fonctions
// sensibles du gameplay, et elles sont pures puisqu'elles ne lisent que
// this.pixels.
//
// Le constructeur, lui, exige Image et document.createElement('canvas') : les
// tests l'evitent en fabriquant un objet qui herite du prototype sans passer par
// le constructeur.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ImageData = require(path.join(__dirname, '..', 'bkcore.coffee', 'ImageData.js')).bkcore.ImageData;
const proto = ImageData.prototype;

// Construit un faux ImageData a partir d'une liste de pixels [r, g, b, a].
// L'objet herite du prototype reel, car getPixelF() et getPixelBilinear()
// s'appellent mutuellement via this.getPixel().
function fake(width, height, pixels) {
  const data = [];
  for (const pixel of pixels) data.push(...pixel);
  const img = Object.create(proto);
  img.pixels = { width, height, data };
  return img;
}

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

test('getPixel lit le bon pixel (indexation y * width + x)', () => {
  const img = fake(2, 2, [
    [10, 11, 12, 13], [20, 21, 22, 23],
    [30, 31, 32, 33], [40, 41, 42, 43]
  ]);
  assert.deepEqual(img.getPixel(0, 0), { r: 10, g: 11, b: 12, a: 13 });
  assert.deepEqual(img.getPixel(1, 0), { r: 20, g: 21, b: 22, a: 23 });
  assert.deepEqual(img.getPixel(0, 1), { r: 30, g: 31, b: 32, a: 33 });
  assert.deepEqual(img.getPixel(1, 1), { r: 40, g: 41, b: 42, a: 43 });
});

test('getPixel renvoie du transparent hors bornes', () => {
  const img = fake(2, 2, [
    [1, 2, 3, 4], [5, 6, 7, 8],
    [9, 10, 11, 12], [13, 14, 15, 16]
  ]);
  assert.deepEqual(img.getPixel(-1, 0), TRANSPARENT);
  assert.deepEqual(img.getPixel(0, -1), TRANSPARENT);
  assert.deepEqual(img.getPixel(2, 0), TRANSPARENT);
  assert.deepEqual(img.getPixel(0, 2), TRANSPARENT);
});

test('getPixel renvoie du transparent tant que les pixels ne sont pas charges', () => {
  const img = Object.create(proto);
  img.pixels = null;
  assert.deepEqual(img.getPixel(0, 0), TRANSPARENT);
});

test('getPixelF encode le RGB en entier 3 octets (r + g*255 + b*255*255)', () => {
  const img = fake(1, 3, [
    [255, 0, 0, 255],
    [0, 1, 0, 255],
    [0, 0, 1, 255]
  ]);
  assert.equal(img.getPixelF(0, 0), 255);
  assert.equal(img.getPixelF(0, 1), 255);
  assert.equal(img.getPixelF(0, 2), 65025);
});

test('getPixelF sature sur du blanc', () => {
  const img = fake(1, 1, [[255, 255, 255, 255]]);
  assert.equal(img.getPixelF(0, 0), 255 + 255 * 255 + 255 * 255 * 255);
});

test('getPixelBilinear renvoie le pixel lui-meme aux coordonnees demi-entieres', () => {
  // A (1.5, 1.5) les poids d'interpolation sont nuls : le resultat doit etre
  // exactement le pixel (1, 1).
  const img = fake(3, 3, [
    [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3],
    [4, 4, 4, 4], [5, 5, 5, 5], [6, 6, 6, 6],
    [7, 7, 7, 7], [8, 8, 8, 8], [9, 9, 9, 9]
  ]);
  assert.deepEqual(img.getPixelBilinear(1.5, 1.5), { r: 5, g: 5, b: 5, a: 5 });
});

test('getPixelBilinear interpole en moyenne des 4 voisins aux coordonnees entieres', () => {
  const img = fake(2, 2, [
    [0, 0, 0, 0], [100, 100, 100, 100],
    [50, 50, 50, 50], [150, 150, 150, 150]
  ]);
  // A (1, 1) : les 4 voisins pesent 1/4 chacun.
  const c = img.getPixelBilinear(1, 1);
  assert.equal(c.r, 0.25 * 0 + 0.25 * 100 + 0.25 * 50 + 0.25 * 150); // 75
  assert.equal(c.r, 75);
});

test('getPixelBilinear reste defini hors bornes (les voisins manquants valent 0)', () => {
  const img = fake(2, 2, [
    [10, 10, 10, 10], [10, 10, 10, 10],
    [10, 10, 10, 10], [10, 10, 10, 10]
  ]);
  const c = img.getPixelBilinear(-5, -5);
  for (const canal of ['r', 'g', 'b', 'a']) {
    assert.equal(Number.isFinite(c[canal]), true);
  }
});

test('getPixelFBilinear encode le resultat de getPixelBilinear', () => {
  const img = fake(3, 3, [
    [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3],
    [4, 4, 4, 4], [5, 5, 5, 5], [6, 6, 6, 6],
    [7, 7, 7, 7], [8, 8, 8, 8], [9, 9, 9, 9]
  ]);
  assert.equal(img.getPixelFBilinear(1.5, 1.5), img.getPixelF(1, 1));
});
