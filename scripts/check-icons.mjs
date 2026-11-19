/** Enforce the icon registry boundary in just check using TypeScript's existing source parser. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "app/package.json"));
const ts = require("typescript");
const ignored = new Set(["node_modules", ".next", ".git", "examples", ".cache"]);

/** Inspect imports, re-exports, require and dynamic imports, including multiline syntax and subpaths. */
export function violations(text, file = "source.tsx") {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    let module;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) module = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) module = node.argument.literal;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === "require")) module = node.arguments[0];
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) module = node.moduleReference.expression;
    if (module && ts.isStringLiteralLike(module) && /^lucide-react(?:\/|$)/.test(module.text)) {
      found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: import icons through @/components/icon`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function checkDirectory(directory) {
  let errors = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) errors = errors.concat(checkDirectory(file));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(file) && file !== path.join(root, "app/lib/ui/icons.ts")) errors = errors.concat(violations(readFileSync(file, "utf8"), path.relative(root, file)));
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkDirectory(root);
  if (errors.length) { errors.forEach((error) => console.error(`FAIL ${error}`)); process.exitCode = 1; }
  else console.log("PASS icon imports: only app/lib/ui/icons.ts may import lucide-react");
}
