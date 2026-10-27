const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePagination, paginateResult } = require("./pagination");

test("parsePagination applique des bornes sûres", () => {
  assert.equal(parsePagination({}), null);
  assert.deepEqual(parsePagination({ page: "2", pageSize: "500" }), { page: 2, pageSize: 100, skip: 100, take: 100 });
});

test("paginateResult retourne les métadonnées de navigation", () => {
  assert.deepEqual(paginateResult(["item"], 51, { page: 2, pageSize: 25 }), {
    items: ["item"],
    pagination: { page: 2, pageSize: 25, total: 51, pageCount: 3 }
  });
});
