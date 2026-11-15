import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

// Groups of 2, 3, 4 and 8 accounts end the staggered wall in every way.
const plan = [
  ["Two", 2],
  ["Three", 3],
  ["Four", 4],
  ["Eight", 8],
];

async function fixture(t, { settings = {}, dark = false } = {}) {
  const window = new Window({ url: "https://cyberpunk.test/" });
  for (const path of ["tokens", "components", "application", "hud"]) {
    const style = window.document.createElement("style");
    style.textContent = await readFile(
      new URL(`../src/styles/${path}.css`, import.meta.url),
      "utf8",
    );
    window.document.head.append(style);
  }
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  const template = mock.state.library.accounts[0];
  let index = 0;
  mock.state.library.accounts = plan.flatMap(([label, count]) =>
    Array.from({ length: count }, () => ({
      ...structuredClone(template),
      ref: { id: `account-${index++}`, generation: 1 },
      service: { label, groupId: label },
    })),
  );
  if (dark) mock.state.preferences.resolvedTheme = "dark";
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  // happy-dom keeps computed styles across viewport changes until the DOM changes.
  const resize = (width) => {
    window.happyDOM.setViewport({ width, height: 900 });
    window.document.body.dataset.viewport = String(width);
  };
  const spans = () =>
    Object.fromEntries(
      [...root.querySelectorAll(".cyberpunk-account-grid")].map((grid) => [
        grid.children.length,
        [...grid.children].map((card) =>
          Number(
            window.getComputedStyle(card).gridColumn.match(/span (\d+)/)?.[1],
          ),
        ),
      ]),
    );
  return { window, root, resize, spans };
}

test("every group's last row of the staggered wall is filled", async (t) => {
  const h = await fixture(t);
  h.resize(1440);
  assert.deepEqual(h.spans(), {
    // Wide and medium share the row; the medium card no longer drops below.
    2: [7, 5],
    // A card left alone spans the row.
    3: [7, 5, 12],
    // Two standard cards share the last row.
    4: [7, 5, 6, 6],
    8: [7, 5, 4, 4, 4, 7, 5, 12],
  });
  // Below 1180px: one full row, then pairs; a card without a partner spans
  // the row.
  // happy-dom mis-ranks the selector list that gives the second card span 6
  // (Chrome applies it), so only the first and last cards are compared.
  h.resize(1100);
  const ends = Object.fromEntries(
    Object.entries(h.spans()).map(([count, list]) => [
      count,
      [list[0], list.at(-1)],
    ]),
  );
  assert.deepEqual(ends, {
    2: [12, 12],
    3: [12, 6],
    4: [12, 12],
    8: [12, 6],
  });
});

test("compact panels put the next code beside the countdown on every screen", async (t) => {
  const comfortable = await fixture(t);
  const compact = await fixture(t, { settings: { density: "compact" } });
  for (const h of [comfortable, compact]) h.resize(1440);
  const card = (h) => h.root.querySelector(".cyberpunk-card");
  const style = (h, node) => h.window.getComputedStyle(node);
  assert.notEqual(style(comfortable, card(comfortable)).display, "grid");
  assert.equal(style(compact, card(compact)).display, "grid");
  assert.equal(
    style(compact, card(compact).querySelector(".cyberpunk-codes")).display,
    "contents",
  );
  // The code label stays for screen readers only.
  const label = card(compact).querySelector(".cyberpunk-otp-label");
  assert.equal(style(compact, label).position, "absolute");
  assert.equal(style(compact, label).width, "1px");
  assert.notEqual(
    style(comfortable, card(comfortable).querySelector(".cyberpunk-otp-label"))
      .position,
    "absolute",
  );
  assert.ok(
    parseFloat(style(compact, card(compact)).paddingTop) <
      parseFloat(style(comfortable, card(comfortable)).paddingTop),
  );
});

test("the dark service rail scrolls with a thin cyan thumb", async (t) => {
  const h = await fixture(t, { dark: true });
  assert.equal(
    h.root.querySelector(".cyberpunk-theme").dataset.colorScheme,
    "dark",
  );
  const rail = h.window.getComputedStyle(
    h.root.querySelector(".cyberpunk-rail-list"),
  );
  assert.equal(rail.scrollbarWidth, "thin");
  assert.match(rail.scrollbarColor, /cyberpunk-code|color-mix/);
});
