require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assess, rank, glucoseMgDl } = require("../lib/food/engine.ts");
const { emptyProfile } = require("../lib/food/types.ts");
const { normalizeProduct } = require("../lib/food/products.ts");
const { predictGrade } = require("../lib/food/model.ts");
const food = {
  id: "one",
  name: "Test meal",
  kind: "meal",
  category: "Breakfast",
  cuisine: "Indian",
  ingredients: ["oats", "milk"],
  allergens: ["Milk"],
  ingredientsComplete: true,
  diet: ["Vegetarian"],
  dietVerified: true,
  serving: "1 bowl",
  nutrients: {
    energy: 200,
    sugar: 9,
    carbs: 30,
    sodium: 200,
    saturatedFat: 2,
    protein: 8,
    fiber: 4,
  },
  grade: "b",
  gradeSource: "source",
};
const profile = (extra) => ({ ...emptyProfile, ...extra });
test("known allergies override favorable grade and positive taste feedback", () => {
  const p = profile({ allergies: ["Milk"] });
  assert.equal(assess(food, p).verdict, "Avoid");
  assert.equal(
    rank([food], p, [{ foodId: "one", rating: 5, tried: true }]).length,
    0,
  );
});
test("missing ingredients never confirm allergy compatibility", () => {
  assert.equal(
    assess(
      { ...food, allergens: [], ingredientsComplete: false },
      profile({ allergies: ["Peanuts"] }),
    ).verdict,
    "Not enough information",
  );
});
test("missing nutrition is unknown rather than zero", () =>
  assert.equal(
    assess({ ...food, nutrients: { sugar: 1 } }).verdict,
    "Not enough information",
  ));
test("per-serving limit exceeds produce Limit; zero is a valid limit", () => {
  assert.equal(
    assess(food, profile({ limits: { sugar: 8 } })).verdict,
    "Limit",
  );
  assert.equal(
    assess(food, profile({ limits: { sugar: 0 } })).verdict,
    "Limit",
  );
});
test("missing a requested nutrient gives unknown", () =>
  assert.equal(
    assess(
      { ...food, nutrients: { carbs: 30 } },
      profile({ limits: { sugar: 8 } }),
    ).verdict,
    "Not enough information",
  ));
test("guest assessment identifies general nutrition scope", () => {
  const r = assess(food);
  assert.equal(r.personalized, false);
  assert.equal(r.verdict, "Good fit");
});
test("known dietary incompatibility is excluded; unknown remains unknown", () => {
  assert.equal(assess(food, profile({ diet: "Vegan" })).verdict, "Avoid");
  assert.equal(
    assess({ ...food, dietVerified: false }, profile({ diet: "Vegan" }))
      .verdict,
    "Not enough information",
  );
});
test("no grade means unknown unless explicit serving limits can be checked", () => {
  assert.equal(
    assess({ ...food, grade: undefined }).verdict,
    "Not enough information",
  );
  assert.equal(
    assess({ ...food, grade: undefined }, profile({ limits: { sugar: 10 } }))
      .verdict,
    "Good fit",
  );
});
test("tried-food ratings change taste ranking", () => {
  const a = { ...food, id: "a", cuisine: "Indian" };
  const b = { ...food, id: "b", cuisine: "Japanese", ingredients: ["rice"] };
  assert.equal(
    rank([a, b], null, [{ foodId: "b", rating: 5, tried: true }])[0].food.id,
    "b",
  );
});
test("untried feedback is ignored", () => {
  const a = { ...food, id: "a" },
    b = { ...food, id: "b", ingredients: ["rice"] };
  assert.equal(
    rank([a, b], null, [{ foodId: "b", rating: 5, tried: false }])[0].food.id,
    "a",
  );
});
test("blank preferences do not exclude every candidate", () =>
  assert.equal(rank([food], profile({ dislikes: [" "] })).length, 1));
test("glucose conversion preserves units", () =>
  assert.ok(Math.abs(glucoseMgDl(5.5, "mmol/L") - 99.1001) < 0.001));
test("product nutrients convert sodium and serving quantities", () => {
  const f = normalizeProduct(
    {
      serving_quantity: 30,
      nutriments: {
        sugars_100g: 10,
        sodium_100g: 0.4,
        carbohydrates_100g: 20,
        "saturated-fat_100g": 2,
      },
    },
    "12345678",
  );
  assert.equal(f.nutrients.sugar, 3);
  assert.equal(f.nutrients.sodium, 120);
  assert.equal(f.nutrients.carbs, 6);
});
test("product missing serving size uses explicit 100g basis", () => {
  const f = normalizeProduct({ nutriments: { sugars_100g: 10 } }, "12345678");
  assert.match(f.serving, /100 g/);
  assert.equal(f.nutrients.sugar, 10);
});
test("allergen aliases include wheat, nuts, and traces", () => {
  const f = normalizeProduct(
    {
      ingredients_text: "wheat flour, almonds",
      allergens_tags: [],
      traces_tags: ["en:milk"],
    },
    "12345678",
  );
  assert.deepEqual(f.allergens, ["Milk", "Gluten", "Tree nuts"]);
});
test("negative nutrient data is treated as missing", () =>
  assert.equal(
    normalizeProduct({ nutriments: { sugars_100g: -1 } }, "12345678").nutrients
      .sugar,
    undefined,
  ));
test("untrained artifact produces no invented grade", () =>
  assert.equal(predictGrade({}, "unknown"), null));
test("invalid negative serving size cannot create negative nutrient values", () => {
  const f = normalizeProduct(
    { serving_quantity: -30, nutriments: { sugars_100g: 10 } },
    "12345678",
  );
  assert.equal(f.nutrients.sugar, 10);
  assert.equal(f.grams, 100);
});
