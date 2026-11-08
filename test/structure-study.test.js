const test = require('node:test');
const assert = require('node:assert/strict');
const brain = require('../data/brain.json');

test('audit preserves unverified rule and unresolved conflict boundaries', () => {
  const audit = brain.journal_audit;
  assert.equal(audit.total_records, 40);
  assert.deepEqual(Object.values(audit.setup_label_counts), [34, 5, 1]);
  assert.deepEqual(audit.verified_rules, []);
  assert.deepEqual(audit.clear_examples, []);
  assert.deepEqual(audit.conflicts.map(x => x.row_1_based), [14, 15, 26]);
  assert.equal(audit.usable_screenshots, null);
  assert.equal(audit.screenshot_review.reviewed_complete_sequence, 0);
  assert.equal(audit.screenshot_review.unreviewed, 22);
  assert.equal(audit.needs_review_count, 40);
  assert.equal(brain.mt5_connected, false);
  assert.equal(brain.scanning, false);
});
