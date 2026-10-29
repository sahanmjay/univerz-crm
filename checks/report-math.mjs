// Checks the Finance Reports money rules against the Oct 2026 director payout sample.
// Run: node checks/report-math.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = name => {
  const i = src.indexOf(`function ${name}(`);
  let depth = 0, j = src.indexOf("{", i);
  for(;; j++){ if(src[j] === "{") depth++; if(src[j] === "}" && --depth === 0) break; }
  return src.slice(i, j + 1);
};
const fmtMoney = (n, c = "Rs.") => `${n < 0 ? "-" : ""}${c} ${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const { rpAllocate, rpGroupDesc } = new Function("fmtMoney",
  `${grab("rpAllocate")}\n${grab("rpGroupDesc")}\nreturn { rpAllocate, rpGroupDesc };`)(fmtMoney);

// 35 / 20 / 25 / 20 of Rs. 139,750 — whole rupees that still add up to the base
const alloc = rpAllocate(139750, [35, 20, 25, 20]);
assert.deepEqual(alloc, [48913, 27950, 34937, 27950]);
assert.equal(alloc.reduce((a, b) => a + b, 0), 139750);

// Awkward bases never drift from the total
for(const base of [1, 99, 100001, 77294.6, 0])
  assert.equal(rpAllocate(base, [33.3, 33.3, 33.4]).reduce((a, b) => a + b, 0), Math.round(base));

// Option B fits the 20% salary bucket: Rs. 27,950 / 6, rounded down to Rs. 50
assert.equal(Math.floor(27950 / 6 / 50) * 50, 4650);

// Afford-table labels
assert.equal(rpGroupDesc([5000, 5000, 5000, 5000, 5000, 5000]), "6 × Rs. 5,000");
assert.equal(rpGroupDesc([2000, 2000, 2000, 2000, 1000, 0]), "4 × Rs. 2,000 + 1 × Rs. 1,000");

console.log("report math OK");
