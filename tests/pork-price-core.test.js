import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const loadPorkCore = async () => {
  const globals = { window: {}, console: { warn: () => {} } };
  const code = await fs.readFile('modules/pork-price-core.js', 'utf8');
  vm.runInNewContext(code, globals);
  return globals.window.PinThipSafe.porkCore;
};

const rows = (...prices) =>
  prices.map((price, index) => ({
    // 2024-01-01 onwards, one row per day
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    price
  }));

// Values returned from the vm realm have foreign prototypes, so copy arrays into
// host arrays before any structural comparison (same approach as the other tests).
const host = (arr) => [...arr];

test('linearRegression recovers the slope of a perfectly linear series', async () => {
  const core = await loadPorkCore();
  const { slope, intercept } = core.linearRegression(rows(80, 82, 84, 86));

  assert.equal(Math.round(slope * 1000) / 1000, 2);
  assert.equal(Math.round(intercept * 1000) / 1000, 80);
});

test('linearRegression returns a flat line for a single data point', async () => {
  const core = await loadPorkCore();
  const { slope, intercept } = core.linearRegression(rows(80));

  assert.equal(slope, 0);
  assert.equal(intercept, 0);
});

test('predictFuturePrices continues the trend on consecutive dates', async () => {
  const core = await loadPorkCore();
  const predictions = core.predictFuturePrices(rows(80, 82, 84, 86), 3);

  assert.equal(predictions.length, 3);
  assert.deepEqual(host(predictions.map((p) => p.date)), ['2024-01-05', '2024-01-06', '2024-01-07']);
  assert.deepEqual(host(predictions.map((p) => Math.round(p.price))), [88, 90, 92]);
});

test('predictFuturePrices needs at least two points', async () => {
  const core = await loadPorkCore();
  assert.equal(core.predictFuturePrices(rows(80), 7).length, 0);
  assert.equal(core.predictFuturePrices([], 7).length, 0);
});

test('predictFuturePrices never projects a negative price', async () => {
  const core = await loadPorkCore();
  // A steep downward trend would cross zero if left unclamped.
  const predictions = core.predictFuturePrices(rows(40, 20, 5), 10);

  assert.ok(predictions.length > 0);
  assert.ok(host(predictions).every((p) => p.price >= 0), 'expected every predicted price to be >= 0');
});

test('calculateMovingAverage averages over the requested window', async () => {
  const core = await loadPorkCore();
  const ma = core.calculateMovingAverage(rows(80, 82, 84, 86), 2);

  assert.deepEqual(host(ma.map((m) => m.price)), [81, 83, 85]);
  assert.deepEqual(host(ma.map((m) => m.date)), ['2024-01-02', '2024-01-03', '2024-01-04']);
});

test('calculateMovingAverage returns nothing when the window exceeds the data', async () => {
  const core = await loadPorkCore();
  assert.equal(core.calculateMovingAverage(rows(80, 82), 7).length, 0);
});

test('calculateStatistics reports min, max, average and a rising trend', async () => {
  const core = await loadPorkCore();
  const stats = core.calculateStatistics(rows(80, 82, 84, 86));

  assert.equal(stats.min, 80);
  assert.equal(stats.max, 86);
  assert.equal(stats.avg, 83);
  assert.equal(stats.trend, 'เพิ่มขึ้น');
});

test('calculateStatistics detects a falling trend', async () => {
  const core = await loadPorkCore();
  assert.equal(core.calculateStatistics(rows(90, 88, 82, 80)).trend, 'ลดลง');
});

test('calculateStatistics returns null for an empty series', async () => {
  const core = await loadPorkCore();
  assert.equal(core.calculateStatistics([]), null);
});

test('formatThaiDate renders D/M/YYYY', async () => {
  const core = await loadPorkCore();
  assert.equal(core.formatThaiDate('2024-01-05'), '5/1/2024');
});
