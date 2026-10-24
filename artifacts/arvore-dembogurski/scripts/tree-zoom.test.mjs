import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitTreeZoom } from '../src/tree-zoom.ts';

test('fits a wide family tree inside the available projector area', () => {
  const zoom = fitTreeZoom(4200, 900, 1200, 650);
  assert.ok(4200 * zoom <= 1200);
  assert.ok(900 * zoom <= 650);
  assert.ok(zoom > 0.28 && zoom < 0.29);
});
test('fits tall generations without clipping the bottom row', () => {
  const zoom = fitTreeZoom(500, 2000, 1200, 650);
  assert.equal(zoom, 0.325);
});
test('keeps small trees at natural size and handles unavailable measurements', () => {
  assert.equal(fitTreeZoom(500, 300, 1200, 650), 1);
  assert.equal(fitTreeZoom(0, 300, 1200, 650), 1);
  assert.equal(fitTreeZoom(NaN, 300, 1200, 650), 1);
});
test('fits all generations on one A4 landscape page regardless of screen zoom', () => {
  const paperWidth = 277 * 96 / 25.4;
  const paperHeight = 188 * 96 / 25.4;
  for (const [width, height] of [[4400, 900], [600, 3500], [12000, 5000]]) {
    const zoom = fitTreeZoom(width, height, paperWidth, paperHeight);
    assert.ok(width * zoom <= paperWidth);
    assert.ok(height * zoom <= paperHeight);
  }
});
