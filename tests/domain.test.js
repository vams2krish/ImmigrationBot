import test from "node:test";
import assert from "node:assert/strict";
import {
  checklist,
  milestones,
  validateReceipt,
  validDate,
  cosine,
  chunks,
} from "../domain.js";
const profile = {
  visa: "H1B",
  location: "inside",
  dependents: false,
  translations: false,
  target: "2027-01-15",
};
test("receipt format rejects URLs, partial numbers and extra characters", () => {
  assert.equal(validateReceipt("IOE1234567890"), true);
  for (const v of [
    "IOE123",
    "https://evil.test",
    "1234567890123",
    "IOE12345678900",
  ])
    assert.equal(validateReceipt(v), false);
});
test("checklist adapts to visa, location and dependent documents", () => {
  const base = checklist(profile);
  assert.ok(base.some((i) => i.id === "i94"));
  const abroad = checklist({
    ...profile,
    location: "outside",
    dependents: true,
    translations: true,
  });
  assert.ok(!abroad.some((i) => i.id === "i94"));
  assert.ok(
    ["consular", "dependents", "translations"].every((id) =>
      abroad.some((i) => i.id === id),
    ),
  );
  assert.ok(checklist({ ...profile, visa: "F1" }).some((i) => i.id === "i20"));
  assert.ok(
    checklist({ ...profile, visa: "FAMILY" }).some((i) => i.id === "medical"),
  );
});
test("planning dates use UTC calendar arithmetic across year boundaries", () => {
  assert.equal(checklist(profile)[0].due, "2026-12-11");
  assert.equal(milestones(profile)[2].due, "2027-01-15");
  assert.ok(checklist({ ...profile, target: "" }).every((i) => i.due === null));
});
test("retrieval cosine scores zero vectors and mismatched dimensions safely", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([0, 0], [1, 0]), 0);
  assert.equal(cosine([1], [1, 2]), 0);
});
test("chunking keeps overlap and covers full input", () => {
  const s = "a".repeat(3500);
  const c = chunks(s);
  assert.equal(c[0].length, 1300);
  assert.equal(c.length, 4);
  assert.equal(c.at(-1).length, 140);
});
test("date validation rejects impossible calendar dates", () => {
  assert.equal(validDate("2027-02-31"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2027-02-29"), false);
});
