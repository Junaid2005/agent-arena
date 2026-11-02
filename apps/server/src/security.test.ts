import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientAddress, ConnectionLimits } from './security.ts';

function request(peer: string, forwarded?: string) {
  return { socket: { remoteAddress: peer }, headers: { 'x-forwarded-for': forwarded } };
}
test('forwarded addresses are accepted only from our Caddy/Docker gateway', () => {
  assert.equal(clientAddress(request('203.0.113.1', '198.51.100.1')), '203.0.113.1');
  assert.equal(clientAddress(request('::ffff:172.17.0.1', '198.51.100.1')), '198.51.100.1');
  assert.equal(clientAddress(request('127.0.0.1', 'spoofed, 198.51.100.1')), '198.51.100.1');
  assert.equal(clientAddress(request('127.0.0.1', 'garbage')), '127.0.0.1');
});
test('connection floods are bounded per client and globally without blocking other clients', () => {
  const limits = new ConnectionLimits();
  for (let i = 0; i < 60; i++) assert.equal(limits.allow('one', 0, 0), true);
  assert.equal(limits.allow('one', 0, 1), false);
  assert.equal(limits.allow('two', 0, 1), true);
  assert.equal(limits.allow('two', 128, 1), false);
  assert.equal(limits.allow('one', 0, 60_000), true);
  for (let i = 0; i < 24; i++) limits.opened('two');
  assert.equal(limits.allow('two', 24, 60_000), false);
  limits.closed('two');
  assert.equal(limits.allow('two', 23, 60_000), true);
  limits.prune(120_000);
  assert.equal(limits.allow('two', 23, 120_000), true);
});
