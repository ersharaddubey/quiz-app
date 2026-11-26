const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registryPath = path.join(__dirname, '..', 'data', 'government-exam-sources.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

test('government source registry covers 28 states and 8 union territories', () => {
  assert.equal(registry.statePublicServiceCommissions.length, 28);
  assert.equal(registry.unionTerritories.length, 8);
});

test('government source registry has unique authority ids and valid HTTPS portals', () => {
  const authorities = registry.nationalAuthorities;
  assert.ok(authorities.length >= 15);
  assert.equal(new Set(authorities.map(item => item.id)).size, authorities.length);
  for (const item of authorities) {
    assert.ok(item.id && item.name && item.portal, 'authority metadata is required');
    assert.equal(new URL(item.portal).protocol, 'https:');
    assert.ok(Array.isArray(item.dataTypes) && item.dataTypes.length > 0);
  }
});

test('state PSC entries have unique regions and HTTPS portals', () => {
  const entries = registry.statePublicServiceCommissions;
  assert.equal(new Set(entries.map(item => item.region)).size, entries.length);
  for (const item of entries) {
    assert.ok(item.body && item.region && item.portal);
    assert.equal(new URL(item.portal).protocol, 'https:');
  }
});

test('all UT administrations are represented with official starting portals', () => {
  for (const item of registry.unionTerritories) {
    assert.ok(item.region && item.portal);
    assert.equal(new URL(item.portal).protocol, 'https:');
  }
});
