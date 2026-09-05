import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignProgress, passTierForLamports } from '../backend/src/index.ts';

void test('maps contribution amounts to Creator Pass tiers', () => {
  assert.equal(passTierForLamports(5_000_000_000n), 'Supporter');
  assert.equal(passTierForLamports(20_000_000_000n), 'Insider');
  assert.equal(passTierForLamports(50_000_000_000n), 'Producer');
  assert.equal(passTierForLamports(100_000_000_000n), 'Executive');
});

void test('caps campaign progress at 100 percent', () => {
  assert.equal(campaignProgress({ campaignId: 1, creator: 'creator', goalLamports: 100n, raisedLamports: 125n, deadlineUnix: 0 }), 100);
});
