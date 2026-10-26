/* eslint-disable @typescript-eslint/no-require-imports -- Exercise TypeScript route handlers with an isolated database. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const houseId = "00000000-0000-0000-0000-000000000007";
const otherHouseId = "00000000-0000-0000-0000-000000000009";

function fixture({ authenticated = true, failWrites = false } = {}) {
  const tables = {
    properties: [{ id: houseId, slug: "serenity-7", nightly_price: 240 }],
    property_date_prices: [
      { property_id: houseId, price_date: "2026-12-24", nightly_price: 400, label: "Christmas", is_active: true },
      { property_id: houseId, price_date: "2026-12-31", nightly_price: 500, label: "New Year", is_active: true },
      { property_id: otherHouseId, price_date: "2026-12-24", nightly_price: 350, is_active: true },
    ],
  };
  const writes = [], invalidated = [];
  const supabase = { from(table) {
    const matches = [];
    let operation = "select", payload;
    const run = () => {
      const rows = tables[table];
      const selected = rows.filter(row => matches.every(filter => filter(row)));
      if (operation === "select") return { data: selected[0] ?? null, error: null };
      if (failWrites) return { error: new Error("Database unavailable") };
      writes.push(table);
      if (operation === "update") for (const row of selected) Object.assign(row, payload);
      if (operation === "delete") tables[table] = rows.filter(row => !selected.includes(row));
      if (operation === "upsert") for (const incoming of payload) {
        const existing = rows.find(row => row.property_id === incoming.property_id && row.price_date === incoming.price_date);
        if (existing) Object.assign(existing, incoming); else rows.push(incoming);
      }
      return { error: null };
    };
    const query = {
      select() { return query; },
      eq(key, value) { matches.push(row => row[key] === value); return query; },
      in(key, values) { matches.push(row => values.includes(row[key])); return query; },
      update(value) { operation = "update"; payload = value; return query; },
      delete() { operation = "delete"; return query; },
      upsert(value) { operation = "upsert"; payload = value; return query; },
      maybeSingle: async () => run(),
      then(resolve) { return Promise.resolve(run()).then(resolve); },
    };
    return query;
  } };
  const mocks = {
    "next/server": { NextResponse: Response },
    "next/cache": { revalidatePath: value => invalidated.push(value) },
    "@/src/lib/supabase/auth": { getAdminUser: async () => authenticated ? { user: { id: "admin" } } : null },
    "@/src/lib/supabase/admin": { createSupabaseAdminClient: () => supabase },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(__dirname, "..", file);
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("require", "module", "exports", code)(name => {
      if (mocks[name]) return mocks[name];
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name + ".ts"));
      return require(name);
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const { PATCH } = load("app/api/admin/calendar/prices/route.ts");
  const patch = body => PATCH(new Request("http://localhost/api/admin/calendar/prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  return { tables, writes, invalidated, patch };
}

test("changing the default saves only the base rate and preserves every special date", async () => {
  const app = fixture(), before = structuredClone(app.tables.property_date_prices);
  const response = await app.patch({ propertyId: houseId, action: "default", rate: 275.50 });
  assert.equal(response.status, 200);
  assert.equal(app.tables.properties[0].nightly_price, 275.50);
  assert.deepEqual(app.tables.property_date_prices, before);
  assert.deepEqual(app.writes, ["properties"]);
  assert.ok(app.invalidated.includes("/properties/serenity-7"));
  assert.ok(app.invalidated.includes("/corporate-stays"));
});

test("Christmas prices include both selected nights and preserve other dates and houses", async () => {
  const app = fixture();
  const response = await app.patch({ propertyId: houseId, action: "override", startDate: "2026-12-24", endDate: "2026-12-26", rate: 450.25, label: "Christmas" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).nights, 3);
  for (const date of ["2026-12-24", "2026-12-25", "2026-12-26"]) assert.equal(app.tables.property_date_prices.find(row => row.property_id === houseId && row.price_date === date).nightly_price, 450.25);
  assert.equal(app.tables.property_date_prices.find(row => row.price_date === "2026-12-31").nightly_price, 500);
  assert.equal(app.tables.property_date_prices.find(row => row.property_id === otherHouseId).nightly_price, 350);
  assert.equal(app.tables.properties[0].nightly_price, 240);
});

test("resetting a single night removes only its override so it follows future default changes", async () => {
  const app = fixture();
  assert.equal((await app.patch({ propertyId: houseId, action: "reset", startDate: "2026-12-24", endDate: "2026-12-24" })).status, 200);
  assert.equal(app.tables.property_date_prices.length, 2);
  assert.ok(app.tables.property_date_prices.some(row => row.property_id === otherHouseId));
  assert.ok(app.tables.property_date_prices.some(row => row.price_date === "2026-12-31"));
});

test("the price endpoint rejects unauthenticated and invalid changes without writing", async () => {
  const guest = fixture({ authenticated: false });
  assert.equal((await guest.patch({ propertyId: houseId, action: "default", rate: 500 })).status, 401);
  assert.deepEqual(guest.writes, []);
  const app = fixture();
  for (const body of [
    { action: "default", rate: "" }, { action: "default", rate: null }, { action: "default", rate: -1 },
    { action: "default", rate: 100001 }, { action: "override", rate: 400, startDate: "2026-02-30", endDate: "2026-03-02" },
    { action: "reset", startDate: "2026-12-26", endDate: "2026-12-24" },
    { action: "override", rate: 400, startDate: "2026-12-24", endDate: "2029-12-24" },
  ]) assert.equal((await app.patch({ propertyId: houseId, ...body })).status, 400);
  assert.deepEqual(app.writes, []);
});
