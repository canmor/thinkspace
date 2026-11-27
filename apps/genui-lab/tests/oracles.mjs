// Independent reference data from benchmark.md. Never import into the lab bundle.
const candidates = [
  ["Native Hybrid", [9, 8, 7]],
  ["Tauri", [7, 8, 8]],
  ["Electron", [6, 4, 10]],
];

export function ranking(weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return [];
  return candidates
    .map(([name, scores]) => ({
      name,
      score:
        scores.reduce((sum, value, i) => sum + value * weights[i], 0) / total,
    }))
    .sort((a, b) => b.score - a.score);
}

// Independent allowance lookup and per-kilogram summation.
export function* baggageCases() {
  for (const [fare, membership, allowance] of [
    ["Economy", "Standard", 23],
    ["Economy", "Gold", 28],
    ["Business", "Standard", 32],
    ["Business", "Gold", 37],
  ]) {
    let fee = 0;
    for (let weight = 10; weight <= 40; weight++) {
      if (weight > allowance) fee += 15;
      yield { fare, membership, allowance, weight, fee };
    }
  }
}
