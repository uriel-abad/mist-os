"use strict";
function toNumber(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === "") return fallback;
  const cleaned = String(value).replace(/\s/g, "").replace(/₱|PHP/gi, "").replace(/,/g, "").replace(/[^0-9.+-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}
const cases = [
  [899, 899], ["899.00", 899], ["₱899.00", 899], ["PHP 1,299.50", 1299.5],
  ["", 0], [null, 0], [undefined, 0], ["not a price", 0], [NaN, 0]
];
for (const [input, expected] of cases) {
  const actual = toNumber(input, 0);
  if (actual !== expected || Number.isNaN(actual)) throw new Error(`${String(input)} => ${actual}; expected ${expected}`);
}
console.log("PASS: defensive number parsing");
