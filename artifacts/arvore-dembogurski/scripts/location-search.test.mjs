import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePlaces, searchPlaces } from '../src/location-search.ts';

const place = (coordinates, properties = { name: 'Curitiba', city: 'Curitiba', state: 'Paraná', country: 'Brasil' }) => ({
  geometry: { type: 'Point', coordinates }, properties,
});

test('GeoJSON longitude/latitude are mapped to the correct fields and labels are deduplicated', () => {
  assert.deepEqual(parsePlaces({ features: [place([-49.2733, -25.4284])] }), [
    { label: 'Curitiba, Paraná, Brasil', latitude: -25.4284, longitude: -49.2733 },
  ]);
});

test('invalid coordinates and unnamed places cannot be selected', () => {
  assert.deepEqual(parsePlaces({ features: [null, place([181, 0]), place([0, 91]), place([NaN, 0]), place(['0', 0]), place([0, 0], {})] }), []);
  assert.throws(() => parsePlaces({ error: 'unavailable' }));
  assert.equal(parsePlaces({ features: [place([0, 0])] })[0].latitude, 0);
});

test('search encodes the query, reuses cached results and reports provider failures', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url.searchParams.get('q'), 'Curitiba & Paraná');
      assert.equal(url.searchParams.get('limit'), '5');
      assert.equal(options.signal, controller.signal);
      assert.equal(options.credentials, 'omit');
      return { ok: true, json: async () => ({ features: [place([-49.2733, -25.4284])] }) };
    };
    const first = await searchPlaces(' Curitiba & Paraná ', controller.signal);
    assert.deepEqual(await searchPlaces('curitiba & paraná', controller.signal), first);
    assert.equal(calls, 1);
    await assert.rejects(searchPlaces('ab', controller.signal), /3 caracteres/);
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(searchPlaces('Encarnación', controller.signal), /indisponível/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
