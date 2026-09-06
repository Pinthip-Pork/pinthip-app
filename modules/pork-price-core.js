/**
 * Pork Price Analytics - Core Algorithms
 * Linear Regression, Moving Average, and Statistics
 */
(function () {
  'use strict';

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function toTime(dateStr) {
    const t = new Date(dateStr).getTime();
    return isFinite(t) ? t : null;
  }

  /**
   * X axis in days elapsed since the first row, not row index.
   * Scraped data is weekly (one report per Buddhist holy day), so an index axis
   * produces a per-report slope that is then labelled per-day — a 7x error.
   * Falls back to the index when a date is missing/unparseable.
   */
  function dayOffsets(data) {
    const base = data.length ? toTime(data[0].date) : null;
    if (base === null) return data.map((_, i) => i);

    return data.map((point, i) => {
      const t = toTime(point.date);
      return t === null ? i : (t - base) / MS_PER_DAY;
    });
  }

  // Median gap between consecutive rows, in days. Used to space predictions the
  // same way the history is spaced (daily input -> daily output, weekly -> weekly).
  function medianStepDays(data) {
    const xs = dayOffsets(data);
    const gaps = [];
    for (let i = 1; i < xs.length; i++) {
      const gap = xs[i] - xs[i - 1];
      if (gap > 0) gaps.push(gap);
    }
    if (!gaps.length) return 1;

    gaps.sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
    return Math.max(1, Math.round(median));
  }

  function linearRegression(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    const xs = dayOffsets(data);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, index) => {
      const x = xs[index];
      const y = point.price;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const denominator = n * sumX2 - sumX * sumX;
    // All rows share the same date: no trend can be fitted, so report a flat
    // line at the mean instead of NaN leaking into every prediction.
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  function calculateMovingAverage(data, period) {
    if (data.length < period) return [];
    
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].price;
      }
      result.push({
        date: data[i].date,
        price: sum / period
      });
    }
    return result;
  }

  /**
   * Project `pointsToPredict` future rows, spaced by the same interval as the
   * history (medianStepDays). Returns [] when there is not enough data to fit
   * a line.
   */
  function predictFuturePrices(historicalData, pointsToPredict) {
    if (historicalData.length < 2) return [];

    const regression = linearRegression(historicalData);
    const xs = dayOffsets(historicalData);
    const lastX = xs[xs.length - 1];
    const step = medianStepDays(historicalData);
    const predictions = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= pointsToPredict; i++) {
      const offsetDays = step * i;
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + offsetDays);

      // Evaluate the fit on the same day axis it was built on.
      const predictedPrice = regression.intercept + regression.slope * (lastX + offsetDays);

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        price: Math.max(0, predictedPrice)
      });
    }

    return predictions;
  }

  function calculateStatistics(data) {
    if (data.length === 0) return null;

    const prices = data.map(d => d.price);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const max = Math.max(...prices);
    const min = Math.min(...prices);

    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg ? 'เพิ่มขึ้น' : (secondAvg < firstAvg ? 'ลดลง' : 'คงที่');
    const trendPercent = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(2);

    return { avg, max, min, trend, trendPercent };
  }

  // Renders D/M/YYYY in the Gregorian year (ค.ศ.), matching the rest of the app.
  // The "Thai" in the name refers to the D/M/Y ordering, not the Buddhist era.
  function formatThaiDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (!window.PinThipSafe) window.PinThipSafe = {};
  window.PinThipSafe.porkCore = {
    linearRegression,
    calculateMovingAverage,
    predictFuturePrices,
    calculateStatistics,
    formatThaiDate,
    dayOffsets,
    medianStepDays
  };

})();
