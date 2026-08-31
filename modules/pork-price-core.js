/**
 * Pork Price Analytics - Core Algorithms
 * Linear Regression, Moving Average, and Statistics
 */
(function () {
  'use strict';

  function linearRegression(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((point, index) => {
      const x = index;
      const y = point.price;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
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

  function predictFuturePrices(historicalData, daysToPredict) {
    if (historicalData.length < 2) return [];

    const regression = linearRegression(historicalData);
    const predictions = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= daysToPredict; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      
      const predictedPrice = regression.intercept + regression.slope * (historicalData.length + i - 1);
      
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
    formatThaiDate
  };

})();
