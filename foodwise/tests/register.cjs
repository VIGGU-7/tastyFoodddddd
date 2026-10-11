const fs = require("node:fs");
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/usr/share/nodejs/typescript/lib/typescript.js");
}
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  });
  module._compile(result.outputText, filename);
};
