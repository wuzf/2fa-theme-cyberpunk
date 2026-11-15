import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t, setup = () => {}) {
  const window = new Window({ url: "https://cyberpunk.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  setup(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { root, mock };
}
const about = (root) => root.querySelector(".cyberpunk-footer-about");

// The official footer is replaced by the theme; the theme carries what it showed.
test("the footer shows the 2FA version and the project links", (t) => {
  const { root, mock } = fixture(t);
  const row = about(root);
  assert.equal(row.hidden, false);
  assert.equal(
    row.querySelector(".cyberpunk-footer-version").textContent,
    "2FA v1.13.1",
  );
  assert.equal(row.querySelector(".cyberpunk-footer-update").hidden, true);
  const links = [...row.querySelectorAll("a.cyberpunk-footer-link")];
  assert.deepEqual(
    links.map((link) => [link.textContent, link.getAttribute("href")]),
    [
      ["Documentation", "https://github.com/wuzf/2fa/blob/main/README.md"],
      ["Report an issue", "https://github.com/wuzf/2fa/issues"],
      ["Source code", "https://github.com/wuzf/2fa"],
    ],
  );
  for (const link of links) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
  }
  const extension = row.querySelector('button[data-value="extension"]');
  assert.equal(extension.textContent, "Browser extension");
  extension.click();
  assert.deepEqual(
    mock.calls.filter((call) => call.method === "host.open").at(-1).value
      .request,
    { kind: "extension" },
  );
  // Without the host's extension page there is nothing to open.
  mock.sdk.host
    .listActions()
    .find((item) => item.actionId === "extension").enabled = false;
  mock.emit();
  assert.equal(extension.hidden, true);
});

test("a newer release shows a link to it, and goes when there is none", (t) => {
  const { root, mock } = fixture(t);
  mock.state.host.about = {
    ...mock.state.host.about,
    latestVersion: "1.14.0",
    upToDate: false,
  };
  mock.emit();
  const update = about(root).querySelector(".cyberpunk-footer-update");
  assert.equal(update.hidden, false);
  assert.equal(update.textContent, "🆕 New version available: v1.14.0");
  assert.equal(
    update.getAttribute("href"),
    "https://github.com/wuzf/2fa/releases/latest",
  );
  assert.equal(update.target, "_blank");
  assert.equal(update.rel, "noopener noreferrer");
  mock.state.host.about = { ...mock.state.host.about, latestVersion: null };
  mock.emit();
  assert.equal(update.hidden, true);
});

test("a host without version data shows no version line", (t) => {
  const { root } = fixture(t, (mock) => {
    delete mock.state.host.about;
  });
  assert.equal(about(root).hidden, true);
});

// Rules with the at-rules around them, from plain CSS text.
function rules(css) {
  const out = [];
  const stack = [];
  let start = 0;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      const prelude = text.slice(start, i).trim();
      stack.push(prelude);
      if (!prelude.startsWith("@"))
        out.push({ prelude, within: stack.slice(0, -1), start: i + 1 });
      start = i + 1;
    } else if (text[i] === "}") {
      const rule = out.findLast((item) => item.end === undefined);
      if (stack.pop()?.startsWith("@") === false && rule) {
        rule.body = text.slice(rule.start, i);
        rule.end = i;
      }
      start = i + 1;
    } else if (text[i] === ";") start = i + 1;
  }
  return out;
}

// On a phone a wrapped row left one link alone on its last line. The version (and
// a newer release) lead, and the links form two even columns below them.
test("on a phone the links form two even columns under the version", async (t) => {
  const { root, mock } = fixture(t);
  const row = about(root);
  const head = row.querySelector(".cyberpunk-footer-about-head");
  const grid = row.querySelector(".cyberpunk-footer-links");
  assert.deepEqual(
    [...head.children].map((node) => node.className),
    ["cyberpunk-footer-version", "cyberpunk-footer-update"],
  );
  assert.deepEqual(
    [...grid.children].map((node) => node.textContent),
    ["Documentation", "Browser extension", "Report an issue", "Source code"],
  );
  // A hidden entry takes no cell: the others close up.
  mock.sdk.host
    .listActions()
    .find((item) => item.actionId === "extension").enabled = false;
  mock.emit();
  assert.deepEqual(
    [...grid.children]
      .filter((node) => !node.hidden)
      .map((node) => node.textContent),
    ["Documentation", "Report an issue", "Source code"],
  );
  const css = await readFile(
    new URL("../src/styles/components.css", import.meta.url),
    "utf8",
  );
  const phone = (selector) =>
    rules(css).find(
      (rule) =>
        rule.prelude === selector &&
        rule.within.includes("@media (max-width: 600px)"),
    )?.body || "";
  const links = phone(".cyberpunk-theme .cyberpunk-footer-links");
  assert.match(links, /display: grid;/);
  assert.match(links, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(links, /justify-items: start;/);
  assert.match(
    phone(".cyberpunk-theme .cyberpunk-footer-about"),
    /display: grid;/,
  );
  assert.match(
    phone(".cyberpunk-theme .cyberpunk-footer-about-head"),
    /flex-wrap: wrap;/,
  );
  // Hidden entries must not keep a cell in the grid.
  assert.match(
    css,
    /\.cyberpunk-theme \[hidden\] \{\s*display: none !important;/,
  );
});
