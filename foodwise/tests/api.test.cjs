require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const records = new Map(),
  cache = new Map();
let user = null,
  fetchCount = 0;
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...values) {
        args = values;
        return this;
      },
      async all() {
        const owner = args[0],
          kind = args[1];
        return {
          results: [...records.values()]
            .filter((r) => r.owner === owner && (!kind || r.kind === kind))
            .sort((a, b) => b.created_at - a.created_at),
        };
      },
      async first() {
        return cache.get(args[0]) || null;
      },
      async run() {
        if (sql.startsWith("INSERT INTO records")) {
          const [id, owner, kind, payload, created_at] = args;
          const old = records.get(id);
          if (!old || old.owner === owner)
            records.set(id, { id, owner, kind, payload, created_at });
        } else if (sql.startsWith("DELETE FROM records")) {
          for (const [id, r] of records)
            if (r.owner === args[0]) records.delete(id);
        } else if (sql.startsWith("INSERT INTO product_cache")) {
          cache.set(args[0], { payload: args[1], cached_at: args[2] });
        }
        return { success: true };
      },
    };
  },
};
const original = Module._load;
Module._load = function (id, parent, main) {
  if (id === "next/server")
    return {
      NextResponse: {
        json: (data, init) => new Response(JSON.stringify(data), init),
      },
    };
  if (id === "cloudflare:workers") return { env: { DB: db } };
  if (id.endsWith("/chatgpt-auth")) return { getChatGPTUser: async () => user };
  if (id === "zod" && process.env.FOODWISE_TEST_ZOD)
    return original(process.env.FOODWISE_TEST_ZOD, parent, main);
  return original(id, parent, main);
};
const { GET, POST } = require("../app/api/food/route.ts");
const { emptyProfile } = require("../lib/food/types.ts");
const { profileSchema, glucoseSchema } = require("../lib/food/validation.ts");
function get(action, extra = "") {
  const url = new URL(
    "https://foodwise.test/api/food?action=" + action + extra,
  );
  return GET({ nextUrl: url });
}
function post(action, body = {}, origin = "https://foodwise.test") {
  const req = new Request("https://foodwise.test/api/food", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify({ action, ...body }),
  });
  req.nextUrl = new URL(req.url);
  return POST(req);
}
test("anonymous visitors can load catalog and model status", async () => {
  user = null;
  assert.equal((await get("catalog")).status, 200);
  const model = await (await get("model")).json();
  assert.equal(model.status, "untrained");
  assert.equal(model.metrics, null);
});
test("anonymous visitors cannot read, save, or delete account records", async () => {
  user = null;
  assert.equal((await get("records")).status, 401);
  assert.equal((await post("profile", { data: emptyProfile })).status, 401);
  assert.equal((await post("delete")).status, 401);
});
test("records are scoped to the authenticated account and body owner is ignored", async () => {
  user = { userId: "alice" };
  assert.equal(
    (
      await post("profile", {
        data: { ...emptyProfile, name: "Alice" },
        owner: "bob",
      })
    ).status,
    200,
  );
  user = { userId: "bob" };
  assert.equal((await (await get("records")).json()).records.length, 0);
  await post("profile", { data: { ...emptyProfile, name: "Bob" } });
  user = { userId: "alice" };
  const result = await (await get("records")).json();
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].payload.name, "Alice");
});
test("deleting one account preserves another account", async () => {
  user = { userId: "alice" };
  await post("delete");
  assert.equal((await (await get("records")).json()).records.length, 0);
  user = { userId: "bob" };
  assert.equal(
    (await (await get("records")).json()).records[0].payload.name,
    "Bob",
  );
});
test("cross-origin writes are rejected", async () => {
  user = { userId: "bob" };
  assert.equal((await post("delete", {}, "https://other.test")).status, 403);
});
test("invalid ratings and glucose inputs are rejected", async () => {
  user = { userId: "bob" };
  assert.equal(
    (await post("rating", { data: { foodId: "test", rating: 6, tried: true } }))
      .status,
    400,
  );
  assert.equal(
    (
      await post("glucose", {
        data: {
          value: -2,
          unit: "mg/dL",
          timing: "fasting",
          timestamp: new Date().toISOString(),
        },
      })
    ).status,
    400,
  );
});
test("glucose validates units and future dates, permits optional profile data", () => {
  assert.equal(
    glucoseSchema.safeParse({
      value: 5.5,
      unit: "mmol/L",
      timing: "after-meal",
      timestamp: new Date().toISOString(),
    }).success,
    true,
  );
  assert.equal(
    glucoseSchema.safeParse({
      value: 500,
      unit: "mmol/L",
      timing: "fasting",
      timestamp: new Date().toISOString(),
    }).success,
    false,
  );
  assert.equal(
    glucoseSchema.safeParse({
      value: 100,
      unit: "mg/dL",
      timing: "fasting",
      timestamp: "2099-01-01T00:00:00.000Z",
    }).success,
    false,
  );
  assert.equal(profileSchema.safeParse(emptyProfile).success, true);
});
test("barcode lookup rejects malformed identifiers", async () =>
  assert.equal((await get("barcode", "&code=abc")).status, 400));
test("provider failures and missing products remain explicit", async () => {
  const old = global.fetch;
  try {
    global.fetch = async () => new Response("down", { status: 500 });
    assert.equal((await get("barcode", "&code=12345678")).status, 502);
    global.fetch = async () => Response.json({ status: 0 });
    assert.equal((await get("barcode", "&code=12345678")).status, 404);
    global.fetch = async () => {
      throw new Error("timeout");
    };
    assert.equal((await get("barcode", "&code=12345678")).status, 503);
  } finally {
    global.fetch = old;
  }
});
test("successful lookup normalizes data and subsequent requests use cache", async () => {
  const old = global.fetch;
  try {
    global.fetch = async () => {
      fetchCount++;
      return Response.json({
        status: 1,
        product: {
          product_name: "Test oats",
          serving_quantity: 30,
          nutriments: { sugars_100g: 10, sodium_100g: 0.4 },
          ingredients_text: "oats",
          allergens_tags: ["en:gluten"],
        },
      });
    };
    let result = await (await get("barcode", "&code=12345678")).json();
    assert.equal(result.food.name, "Test oats");
    assert.equal(result.food.nutrients.sugar, 3);
    assert.equal((await get("barcode", "&code=12345678")).status, 200);
    assert.equal(fetchCount, 1);
  } finally {
    global.fetch = old;
  }
});
test("account recommendation events use server-owned catalog data", async () => {
  user = { userId: "bob" };
  assert.equal(
    (await post("recommendation", { foodId: "overnight-oats", name: "Forged" }))
      .status,
    200,
  );
  const records = (await (await get("records")).json()).records;
  const event = records.find((r) => r.kind === "recommendation");
  assert.equal(event.payload.name, "Berry overnight oatmeal");
  assert.equal(
    (await post("recommendation", { foodId: "missing" })).status,
    400,
  );
});
