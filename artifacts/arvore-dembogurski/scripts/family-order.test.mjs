import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareFamilyOrder } from '../src/family-order.ts';

test('keeps siblings without birth dates in insertion order', () => {
  const people = [
    { id: 19, data_nascimento: null },
    { id: 14, data_nascimento: null },
    { id: 8, data_nascimento: null },
  ].sort(compareFamilyOrder);

  assert.deepEqual(people.map((person) => person.id), [8, 14, 19]);
});

test('sorts dated siblings chronologically with insertion order as tie-breaker', () => {
  const people = [
    { id: 12, data_nascimento: '1990-05-10' },
    { id: 15, data_nascimento: '1980-01-20' },
    { id: 11, data_nascimento: '1980-01-20' },
  ].sort(compareFamilyOrder);

  assert.deepEqual(people.map((person) => person.id), [11, 15, 12]);
});

test('places siblings with known dates before those without a date', () => {
  const people = [
    { id: 5, data_nascimento: null },
    { id: 9, data_nascimento: '2000-02-01' },
    { id: 6, data_nascimento: null },
  ].sort(compareFamilyOrder);

  assert.deepEqual(people.map((person) => person.id), [9, 5, 6]);
});
