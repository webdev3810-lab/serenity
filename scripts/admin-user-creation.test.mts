import assert from "node:assert/strict";
import test from "node:test";
import { parseNewAdminUser } from "../src/lib/adminUserCreation.ts";

const valid = { email: " Team@Example.com ", username: " team.member ", password: "securepass123", role: "editor" };

test("new admin validation normalizes email and username without altering password", () => {
  assert.deepEqual(parseNewAdminUser(valid), { value: { email: "team@example.com", username: "team.member", password: "securepass123", role: "editor" } });
});

test("new admin validation rejects missing credentials and invalid roles", () => {
  for (const input of [null, {}, { ...valid, email: "invalid" }, { ...valid, username: "a" }, { ...valid, username: "bad name" }, { ...valid, password: "short" }, { ...valid, password: "        " }, { ...valid, role: "owner" }]) {
    assert.ok(parseNewAdminUser(input).error);
  }
});
