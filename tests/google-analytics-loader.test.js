const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loaderPath = path.join(
  __dirname,
  "..",
  "shared",
  "google-analytics.js"
);
const loaderSource = fs.readFileSync(loaderPath, "utf8");
const repoRoot = path.join(__dirname, "..");
const fingerprintedLoader =
  '<script src="/shared/google-analytics.4fee7e2daffc.js"></script>';

function findHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".worktrees", "node_modules"].includes(entry.name)) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(entryPath));
    } else if (entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }
  return files;
}

function runLoader(hostname) {
  const appendedScripts = [];
  const document = {
    createElement(tagName) {
      assert.equal(tagName, "script");
      return {};
    },
    head: {
      appendChild(element) {
        appendedScripts.push(element);
      },
    },
  };
  const sandbox = {
    document,
    location: { hostname },
  };
  sandbox.window = sandbox;

  vm.runInNewContext(loaderSource, sandbox, {
    filename: "shared/google-analytics.js",
  });

  return { appendedScripts, sandbox };
}

test("canonical production host loads and configures the approved GA identity", () => {
  const { appendedScripts, sandbox } = runLoader("mangrovetools.com");

  assert.equal(appendedScripts.length, 1);
  assert.equal(appendedScripts[0].async, true);
  assert.equal(
    appendedScripts[0].src,
    "https://www.googletagmanager.com/gtag/js?id=G-E20401V5WB"
  );
  assert.equal(typeof sandbox.gtag, "function");
  assert.equal(sandbox.dataLayer.length, 2);
  assert.equal(Array.from(sandbox.dataLayer[0])[0], "js");
  assert.equal(Array.from(sandbox.dataLayer[1])[0], "config");
  assert.equal(Array.from(sandbox.dataLayer[1])[1], "G-E20401V5WB");
});

for (const hostname of [
  "localhost",
  "mangrove-tools-5cz2ebru8-mangrovetools.vercel.app",
  "6a5e60057d3b5f00086acae9--letterroi.netlify.app",
]) {
  test(`${hostname} does not load or initialize Google Analytics`, () => {
    const { appendedScripts, sandbox } = runLoader(hostname);

    assert.deepEqual(appendedScripts, []);
    assert.equal(Object.hasOwn(sandbox, "dataLayer"), false);
    assert.equal(Object.hasOwn(sandbox, "gtag"), false);
  });
}

test("every public HTML page uses the fingerprinted guard instead of a direct Google tag", () => {
  const htmlFiles = findHtmlFiles(repoRoot);

  assert.ok(htmlFiles.length > 0);
  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, "utf8");
    const relativePath = path.relative(repoRoot, htmlFile);
    assert.equal(
      html.split(fingerprintedLoader).length - 1,
      1,
      `${relativePath} must load the production-only analytics guard once`
    );
    assert.equal(
      html.includes("www.googletagmanager.com/gtag/js"),
      false,
      `${relativePath} must not load Google Analytics directly`
    );
  }
});
