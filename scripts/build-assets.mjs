/**
 * 자산 미니파이 + 난독화 빌드
 * - CSS: clean-css
 * - classic JS: terser minify + javascript-obfuscator (경량)
 * - ES module JS: terser minify only (import 유지)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify as terserMinify } from "terser";
import JavaScriptObfuscator from "javascript-obfuscator";
import CleanCSS from "clean-css";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_JS = path.join(ROOT, "assets", "js", "dist");
const OUT_CSS = path.join(ROOT, "assets", "css", "dist");

const CLASSIC_JS = [
  "entry-hub.js",
  "entry-animation.js",
  "detail-character-preload.js",
  "ai-order-config.js",
  "ai-voice-preflight.js"
];

const MODULE_JS = [
  "hero-character.js",
  "hero-character-config.js",
  "detail-character.js"
];

const CSS_FILES = [
  "site-typography.css",
  "blue-glass-theme.css",
  "detail-character.css"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function minifyModule(srcName) {
  const src = path.join(ROOT, "assets", "js", srcName);
  const code = fs.readFileSync(src, "utf8");
  const result = await terserMinify(code, {
    module: true,
    compress: { passes: 2, drop_console: false },
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error("terser failed: " + srcName);
  const out = path.join(OUT_JS, srcName.replace(/\.js$/, ".min.js"));
  fs.writeFileSync(out, result.code, "utf8");
  console.log("module min:", srcName, "→", path.relative(ROOT, out));
}

async function obfuscateClassic(srcName) {
  const src = path.join(ROOT, "assets", "js", srcName);
  const code = fs.readFileSync(src, "utf8");
  const min = await terserMinify(code, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false }
  });
  if (!min.code) throw new Error("terser failed: " + srcName);

  const obfuscated = JavaScriptObfuscator.obfuscate(min.code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    stringArray: true,
    stringArrayThreshold: 0.6,
    unicodeEscapeSequence: false
  }).getObfuscatedCode();

  const out = path.join(OUT_JS, srcName.replace(/\.js$/, ".min.js"));
  fs.writeFileSync(out, obfuscated, "utf8");
  console.log("classic obfuscate:", srcName, "→", path.relative(ROOT, out));
}

function minifyCss(srcName) {
  const src = path.join(ROOT, "assets", "css", srcName);
  const code = fs.readFileSync(src, "utf8");
  const outCss = new CleanCSS({
    level: 2,
    inline: false,
    rebase: false
  }).minify(code);
  if (outCss.errors && outCss.errors.length) {
    throw new Error(srcName + ": " + outCss.errors.join("; "));
  }
  const out = path.join(OUT_CSS, srcName.replace(/\.css$/, ".min.css"));
  fs.writeFileSync(out, outCss.styles, "utf8");
  console.log("css min:", srcName, "→", path.relative(ROOT, out));
}

function patchHtmlToDist() {
  const htmlFiles = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith(".html") && !f.startsWith("daum-") && f !== "netlify-deploy-guide.html");

  const map = {
    "assets/css/site-typography.css": "assets/css/dist/site-typography.min.css",
    "assets/css/blue-glass-theme.css": "assets/css/dist/blue-glass-theme.min.css",
    "assets/css/detail-character.css": "assets/css/dist/detail-character.min.css",
    "assets/js/entry-hub.js": "assets/js/dist/entry-hub.min.js",
    "assets/js/entry-animation.js": "assets/js/dist/entry-animation.min.js",
    "assets/js/detail-character-preload.js": "assets/js/dist/detail-character-preload.min.js",
    "assets/js/ai-order-config.js": "assets/js/dist/ai-order-config.min.js",
    "assets/js/ai-voice-preflight.js": "assets/js/dist/ai-voice-preflight.min.js",
    "assets/js/hero-character.js": "assets/js/dist/hero-character.min.js",
    "assets/js/detail-character.js": "assets/js/dist/detail-character.min.js"
  };

  htmlFiles.forEach((file) => {
    const full = path.join(ROOT, file);
    let html = fs.readFileSync(full, "utf8");
    let changed = false;
    Object.keys(map).forEach((from) => {
      const re = new RegExp(from.replace(/\./g, "\\.") + "(\\?v=[^\"]*)?", "g");
      if (re.test(html)) {
        html = html.replace(re, map[from] + "?v=20260717af");
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(full, html, "utf8");
      console.log("html patched:", file);
    }
  });
}

async function patchHeroConfigImport() {
  const heroMin = path.join(OUT_JS, "hero-character.min.js");
  if (!fs.existsSync(heroMin)) return;
  let code = fs.readFileSync(heroMin, "utf8");
  code = code.replace(
    /hero-character-config\.js\?v=[^"']+/g,
    "hero-character-config.min.js?v=20260717af"
  );
  code = code.replace(
    /\.\/hero-character-config\.js/g,
    "./hero-character-config.min.js"
  );
  fs.writeFileSync(heroMin, code, "utf8");
}

async function main() {
  ensureDir(OUT_JS);
  ensureDir(OUT_CSS);

  for (const f of CSS_FILES) minifyCss(f);
  for (const f of CLASSIC_JS) {
    const src = path.join(ROOT, "assets", "js", f);
    if (fs.existsSync(src)) await obfuscateClassic(f);
  }
  for (const f of MODULE_JS) {
    const src = path.join(ROOT, "assets", "js", f);
    if (fs.existsSync(src)) await minifyModule(f);
  }

  await patchHeroConfigImport();
  patchHtmlToDist();
  console.log("build complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
