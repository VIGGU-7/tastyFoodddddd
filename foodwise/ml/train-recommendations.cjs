/** Rebuild the content model without touching the nutrition-grade training pipeline. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");

// Load the same pure TypeScript feature code used by inference, ensuring export parity.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(result.outputText, filename);
};
const domain = path.resolve(__dirname, "../src/features/nutrition/domain");
const { catalog } = require(path.join(domain, "catalog.ts"));
const { fitVocabulary } = require(path.join(domain, "food-vectors.ts"));
const digest = crypto
  .createHash("sha256")
  .update(JSON.stringify(catalog))
  .digest("hex");
const artifact = {
  version: `content-tfidf-v1-${digest.slice(0, 12)}`,
  algorithm:
    "TF-IDF cosine similarity with individual preference and rating vectors",
  catalogDigest: digest,
  documents: catalog.length,
  vocabulary: fitVocabulary(catalog),
  evaluation:
    "Preference accuracy is not evaluated; real held-out user ratings are required.",
};
fs.writeFileSync(
  path.join(domain, "recommendation-artifact.json"),
  JSON.stringify(artifact, null, 2) + "\n",
);
console.log(
  `Fitted ${artifact.version} on ${artifact.documents} public food descriptions.`,
);
