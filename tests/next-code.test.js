import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t) {
  const window = new Window({ url: "https://card-copy.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  mock.emit();
  const controller = new AbortController();
  const app = mount({
    root,
    sdk: mock.sdk,
    appearance: { settings: {} },
    signal: controller.signal,
  });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  const card = root.querySelector('article[data-account="google"]');
  assert.ok(card, "google card");
  const copies = () =>
    mock.calls
      .filter((call) => call.method === "otp.copy")
      .map((call) => call.value);
  return { root, window, mock, card, copies };
}

// This theme keeps its visible "next" caption as part of its style; like the
// built-in view, the button also explains itself in a tooltip.
test("the next-code button keeps its caption and has a tooltip", async (t) => {
  const h = fixture(t);
  const next = h.card.querySelector('[data-action="next"]');
  assert.ok(next, "next-code button");
  const value = next.querySelector(".cyberpunk-next-value");
  assert.ok(value, "next code");
  assert.ok(
    next.textContent.trim().length > value.textContent.trim().length,
    "caption beside the code",
  );
  assert.ok(next.title, "tooltip");
  assert.ok(
    next.getAttribute("aria-label").startsWith(`${next.title} · `),
    next.getAttribute("aria-label"),
  );
});
