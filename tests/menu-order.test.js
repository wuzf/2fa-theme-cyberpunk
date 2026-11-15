import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t, setup = () => {}) {
  const window = new Window({ url: "https://cyberpunk.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  mock.state.host.installAvailable = true;
  setup(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  window.location.hash = "#/theme/cyberpunk/more";
  window.dispatchEvent(new window.Event("hashchange"));
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  const toggles = () => [
    ...root.querySelectorAll('[data-action="management-group"]'),
  ];
  const panel = (key) =>
    root.querySelector(
      "#" +
        root
          .querySelector(
            `[data-action="management-group"][data-value="${key}"]`,
          )
          .getAttribute("aria-controls"),
    );
  // Entries as their action ids; the theme's own scheme switch is "scheme".
  const entries = (parent) =>
    [...parent.children]
      .filter((node) => !node.hidden)
      .map(
        (node) =>
          node.dataset.value ||
          (node.dataset.action === "scheme" ? "scheme" : node.textContent),
      );
  return { root, mock, toggles, panel, entries };
}

// Vault sectors named plainly enough to read at a glance; the vault opens with scanning.
test("the sectors are Vault, Tools, System and Session, each in its own order", (t) => {
  const h = fixture(t);
  assert.deepEqual(
    h.toggles().map((node) => [node.dataset.value, node.textContent]),
    [
      ["data", "Vault"],
      ["tools", "Tools"],
      ["settings", "System"],
      ["application", "Session"],
    ],
  );
  assert.deepEqual(h.entries(h.panel("data")), [
    "scan-import",
    "account-add",
    "import",
    "export",
    "backup",
  ]);
  assert.deepEqual(h.entries(h.panel("tools")), ["tools", "quick-otp"]);
  // About sits right below the theme settings.
  assert.deepEqual(h.entries(h.panel("settings")), [
    "scheme",
    "settings:security",
    "settings:sync",
    "settings:preferences",
    "settings:custom-code",
    "appearance",
    "settings:about",
  ]);
  assert.deepEqual(h.entries(h.panel("application")), [
    "extension",
    "pwa-install",
    "logout",
  ]);
});

test("signing out, or in, is the last entry of the whole menu", (t) => {
  const h = fixture(t);
  const last = () =>
    h.root.querySelector(".cyberpunk-management-groups").lastElementChild
      .lastElementChild.lastElementChild;
  assert.equal(last().dataset.value, "logout");
  h.mock.state.session.state = "logged-out";
  h.mock.emit();
  assert.equal(last().dataset.value, "login");
});

test("no two entries share a name and the extension is listed once", (t) => {
  for (const language of ["en", "zh-CN"]) {
    const h = fixture(t, (mock) => {
      mock.state.preferences.resolvedLanguage = language;
    });
    const labels = [
      ...h.root.querySelectorAll(
        ".cyberpunk-management-groups :is(.cyberpunk-feature > span:first-child, [data-action='scheme'])",
      ),
    ].map((node) => node.textContent.trim());
    assert.ok(labels.length >= 16, language);
    assert.deepEqual(
      labels.filter((label, index) => labels.indexOf(label) !== index),
      [],
      language,
    );
    assert.equal(
      h.root.querySelectorAll(
        '.cyberpunk-management-groups [data-value="extension"]',
      ).length,
      1,
    );
    if (language === "zh-CN")
      assert.deepEqual(
        h.toggles().map((node) => node.textContent),
        ["密库", "工具", "系统", "会话"],
      );
  }
});

test("an entry the theme does not know yet still joins the closest sector", (t) => {
  const h = fixture(t, (mock) => {
    const actions = mock.sdk.host.listActions();
    for (const id of ["settings:future", "future"])
      actions.push({
        actionId: id,
        labelKey: id,
        requires: null,
        enabled: true,
        reason: null,
        request: { kind: "future", id },
      });
  });
  // A new setting comes before the theme settings, so About stays right below them.
  assert.deepEqual(h.entries(h.panel("settings")).slice(-3), [
    "settings:future",
    "appearance",
    "settings:about",
  ]);
  // Anything else joins Session, still above signing out.
  assert.deepEqual(h.entries(h.panel("application")).slice(-2), [
    "future",
    "logout",
  ]);
});
