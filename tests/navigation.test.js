import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t, configure = () => {}) {
  const window = new Window({ url: "https://cyberpunk.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  mock.sdk.identity.mode = "live";
  configure(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  const navigate = (page) => {
    window.location.hash = "#/theme/cyberpunk/" + page;
    window.dispatchEvent(new window.Event("hashchange"));
  };
  const group = (key) =>
    root.querySelector(`[data-action="management-group"][data-value="${key}"]`);
  const feature = (id) =>
    root.querySelector(`.cyberpunk-feature[data-value="${id}"]`);
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { window, root, mock, app, navigate, group, feature };
}
const toolIds = [
  "tool:qr-decode",
  "tool:qr-generate",
  "tool:base32",
  "tool:timestamp",
  "tool:key-check",
  "tool:key-generate",
];
const providerIds = [
  "sync-provider:webdav",
  "sync-provider:s3",
  "sync-provider:onedrive",
  "sync-provider:gdrive",
];

test("normal account chrome has only manage; account creation remains in management", (t) => {
  const h = fixture(t);
  assert.deepEqual(
    [...h.root.querySelectorAll(".cyberpunk-topbar-actions button")].map(
      (n) => n.dataset.value,
    ),
    ["more"],
  );
  assert.equal(
    h.root.querySelector(".cyberpunk-account-page h2").className,
    "cyberpunk-sr-only",
  );
  assert.equal(
    h.root
      .querySelector(".cyberpunk-section-description")
      .classList.contains("cyberpunk-sr-only"),
    true,
  );
  assert.equal(h.root.querySelector(".cyberpunk-states").hidden, true);
  assert.equal(
    h.root.querySelectorAll(".cyberpunk-toolbar input[type=search]").length,
    1,
  );
  assert.equal(
    h.root.querySelectorAll('.cyberpunk-toolbar select[data-setting="service"]')
      .length,
    1,
  );
  assert.equal(
    h.root.querySelectorAll('.cyberpunk-toolbar [data-action="refresh"]')
      .length,
    0,
  );
  assert.equal(
    h.root.querySelectorAll(".cyberpunk-management-group").length,
    4,
  );
  h.navigate("more");
  const add = h.feature("account-add");
  assert.ok(add && !add.closest("[hidden]"));
  assert.equal(
    add.closest(".cyberpunk-management-list").id,
    h.group("data").getAttribute("aria-controls"),
  );
  add.click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, { kind: "account-add" });
  assert.equal(h.mock.calls.at(-1).value.options.returnFocus, h.group("data"));
  assert.equal(
    h.root.querySelector('.cyberpunk-management-list [data-action="refresh"]'),
    null,
  );
});

for (const unavailable of ["disabled", "absent"])
  test(`exact aggregate ${unavailable} keeps every tool/provider atom and its request`, (t) => {
    const h = fixture(t, (mock) => {
      const all = mock.sdk.host.listActions();
      for (const id of ["tools", "settings:sync"]) {
        const descriptor = all.find((action) => action.actionId === id);
        descriptor.enabled = false;
        descriptor.reason = "unavailable";
      }
      mock.sdk.host.listActions = () =>
        unavailable === "absent"
          ? all.filter(
              (item) => !["tools", "settings:sync"].includes(item.actionId),
            )
          : all;
    });
    h.navigate("more");
    for (const [group, ids] of [
      ["tools", toolIds],
      ["settings", providerIds],
    ]) {
      h.group(group).click();
      for (const id of ids) {
        const node = h.feature(id);
        assert.ok(node && !node.closest("[hidden]"));
        const before = h.mock.calls.length;
        node.click();
        assert.equal(h.mock.calls.length, before + 1);
        assert.deepEqual(
          h.mock.calls.at(-1).value.request,
          h.mock.sdk.host.listActions().find((item) => item.actionId === id)
            .request,
        );
        assert.equal(
          h.mock.calls.at(-1).value.options.returnFocus,
          h.group(group),
        );
      }
    }
    if (unavailable === "disabled") {
      for (const id of ["tools", "settings:sync"]) {
        assert.equal(h.feature(id).disabled, true);
        assert.equal(h.feature(id).querySelector("small").hidden, false);
        assert.equal(
          h.feature(id).querySelector("small").textContent,
          "Unavailable",
        );
      }
    }
  });

test("unknown global descriptors survive exact dedup, contextual actions never gain missing-argument navigation", (t) => {
  const h = fixture(t, (mock) => {
    const descriptors = mock.sdk.host.listActions();
    descriptors.push({
      actionId: "tool:future",
      labelKey: "futureTool",
      request: { kind: "tool", tool: "future" },
      requires: null,
      enabled: true,
    });
    descriptors.push({
      actionId: "custom:account",
      labelKey: "futureAccount",
      request: { kind: "custom" },
      requires: "account",
      enabled: true,
    });
    descriptors.push({
      actionId: "custom:operation",
      labelKey: "futureOperation",
      request: { kind: "custom" },
      requires: "operationId",
      enabled: true,
    });
  });
  h.navigate("more");
  h.group("application").click();
  assert.ok(h.feature("tool:future"));
  assert.equal(h.feature("custom:account"), null);
  assert.equal(h.feature("custom:operation"), null);
  assert.equal(h.feature("account-edit"), null);
  assert.equal(h.feature("offline-queue-retry"), null);
  h.feature("tool:future").click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, {
    kind: "tool",
    tool: "future",
  });
  assert.equal(h.mock.calls.length, 1);
});

test("management accordion, unknown availability updates and snapshot ticks preserve focus and single-open state", (t) => {
  const h = fixture(t, (mock) => {
    mock.sdk.host
      .listActions()
      .find((item) => item.actionId === "tools").enabled = false;
  });
  h.navigate("more");
  h.group("tools").focus();
  h.group("tools").dispatchEvent(
    new h.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  const target = h.feature("tool:qr-decode");
  target.focus();
  const option = h.root.querySelector('[data-setting="service"]').options[0];
  for (let index = 0; index < 20; index++) h.mock.emit();
  assert.equal(h.window.document.activeElement, target);
  assert.equal(h.feature("tool:qr-decode"), target);
  assert.equal(
    h.root.querySelector('[data-setting="service"]').options[0],
    option,
  );
  assert.equal(
    h.root.querySelectorAll('.cyberpunk-group-toggle[aria-expanded="true"]')
      .length,
    1,
  );
  h.mock.sdk.host
    .listActions()
    .find((item) => item.actionId === "tools").enabled = true;
  h.mock.emit();
  assert.equal(h.feature("tool:qr-decode"), null);
  assert.equal(h.window.document.activeElement, h.group("tools"));
  h.feature("tools").focus();
  h.feature("tools").dispatchEvent(
    new h.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(h.group("tools").getAttribute("aria-expanded"), "false");
  assert.equal(h.window.document.activeElement, h.group("tools"));
  h.group("settings").click();
  assert.equal(
    h.root.querySelectorAll('.cyberpunk-group-toggle[aria-expanded="true"]')
      .length,
    1,
  );
});

test("legacy preferences route has a unique usable host entry and preserves account selection without automatic modal calls", (t) => {
  const h = fixture(t);
  h.mock.sdk.view.setQuery("Google");
  h.mock.sdk.view.setServiceFilter("Google");
  const before = h.mock.calls.length;
  h.navigate("preferences");
  assert.equal(h.root.querySelector(".cyberpunk-subpage").hidden, false);
  assert.equal(h.group("settings").getAttribute("aria-expanded"), "true");
  assert.equal(
    h.root.querySelectorAll('[data-value="settings:preferences"]').length,
    1,
  );
  assert.equal(
    h.root.querySelectorAll(
      '.cyberpunk-preferences-grid, [data-setting="language"]',
    ).length,
    0,
  );
  assert.equal(h.mock.calls.length, before);
  h.feature("settings:preferences").click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, {
    kind: "settings",
    section: "preferences",
  });
  assert.equal(
    h.mock.calls.at(-1).value.options.returnFocus,
    h.group("settings"),
  );
  h.navigate("accounts");
  assert.equal(h.mock.state.library.view.query, "Google");
  assert.equal(h.mock.state.library.view.serviceFilter, "Google");
  h.navigate("more");
  h.navigate("preferences");
  assert.equal(
    h.root.querySelectorAll('[data-value="settings:preferences"]').length,
    1,
  );
});

test("status controls remain stable through 20 OTP publications and offline resources are not mislabelled as network offline", (t) => {
  const h = fixture(t, (mock) => {
    mock.state.library.hidden.count = 2;
    mock.state.host.offlineReady = false;
  });
  const hidden = h.root.querySelector('[data-state="hidden"]');
  hidden.focus();
  for (let index = 0; index < 20; index++) h.mock.emit();
  assert.equal(h.root.querySelector('[data-state="hidden"]'), hidden);
  assert.equal(h.window.document.activeElement, hidden);
  assert.equal(h.root.querySelector('[data-state="offline"]'), null);
  assert.equal(
    h.root.querySelector('[data-state="offline-ready"]').textContent,
    "Offline resources not ready",
  );
  hidden.click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, {
    kind: "hidden-accounts",
  });
  h.mock.state.library.hidden.count = 0;
  h.mock.emit();
  assert.equal(
    h.window.document.activeElement,
    h.root.querySelector('[data-action="route"][data-value="more"]'),
  );
});

test("TOTP cards show no type, digits or algorithm and HOTP cards keep only the HOTP badge", (t) => {
  const h = fixture(t);
  const card = h.root.querySelector('[data-account="google"]');
  const details = h.window.document.getElementById(
    card.querySelector('[data-action="copy"]').getAttribute("aria-describedby"),
  );
  assert.doesNotMatch(details.textContent, /TOTP|SHA|\b6\b/);
  assert.ok(card.querySelector(".cyberpunk-badge").hidden === true);
  // The countdown can be any number, so only the words are checked here.
  assert.doesNotMatch(card.textContent, /TOTP|SHA/);
  const described = [card, ...card.querySelectorAll("*")]
    .flatMap((node) =>
      ["aria-label", "aria-description", "title"].map(
        (name) => node.getAttribute(name) || "",
      ),
    )
    .join(" | ");
  assert.doesNotMatch(described, /TOTP|SHA|\b6\b/);
  const hotp = h.root.querySelector('[data-account="hotp"]');
  const badge = hotp.querySelector(".cyberpunk-badge");
  assert.ok(badge.textContent === "HOTP");
  assert.ok(badge.hidden === false);
  // The counter stays visible beside the code.
  const account = h.mock.state.library.accounts.find(
    (item) => item.ref.id === "hotp",
  );
  account.counter = 42;
  h.mock.emit();
  assert.match(hotp.querySelector(".cyberpunk-expiry").textContent, /42/);
  assert.ok(badge.textContent === "HOTP");
  // Changing the type hides the badge again.
  account.type = "TOTP";
  h.mock.emit();
  assert.ok(badge.hidden === true);
  assert.ok(badge.textContent === "");
});

test("cards keep explicit HOTP/error status", async (t) => {
  const h = fixture(t);
  const card = h.root.querySelector('[data-account="google"]');
  const copy = card.querySelector('[data-action="copy"]');
  const metadata = h.window.document.getElementById(
    copy.getAttribute("aria-describedby"),
  );
  assert.doesNotMatch(metadata.textContent, /TOTP|SHA|\b6\b/);
  assert.equal(card.querySelector(".cyberpunk-hotp-label").hidden, true);
  const hotp = h.root.querySelector('[data-account="hotp"]');
  assert.equal(hotp.querySelector(".cyberpunk-hotp-label").hidden, false);
  assert.equal(hotp.querySelector(".cyberpunk-hotp-label").textContent, "HOTP");
  assert.equal(hotp.querySelector('[data-action="next"]').hidden, true);
  h.mock.state.library.accounts[0].otp.state = "error";
  h.mock.state.library.accounts[0].otp.current.copyAvailability = "not-ready";
  h.mock.emit();
  assert.equal(copy.disabled, true);
  assert.equal(card.querySelector(".cyberpunk-code-status").hidden, false);
  assert.match(
    card.querySelector(".cyberpunk-code-status").textContent,
    /could not be completed/,
  );
  h.app.update({ settings: { density: "compact" } });
  assert.equal(h.root.querySelector('[data-account="google"]'), card);
});

for (const [from, to] of [
  ["more", "accounts"],
  ["preferences", "accounts"],
  ["accounts", "more"],
  ["accounts", "preferences"],
])
  test(`history ${from} -> ${to} moves focus out of the newly hidden page without scrolling or opening dialogs`, (t) => {
    const h = fixture(t, (mock) => {
      mock.state.library.view.query = "Google";
      mock.state.library.view.serviceFilter = "Google";
    });
    h.navigate(from);
    const search = h.root.querySelector('[data-setting="query"]');
    const back = h.root.querySelector(
      '.cyberpunk-subpage [data-action="route"][data-value="accounts"]',
    );
    const heading = h.root.querySelector(".cyberpunk-management-heading h2");
    const source = from === "accounts" ? search : back;
    source.focus();
    const target = to === "accounts" ? search : heading;
    const focusOptions = [];
    const focus = target.focus.bind(target);
    target.focus = (options) => {
      focusOptions.push(options);
      focus(options);
    };
    h.navigate(to);
    assert.equal(h.window.document.activeElement, target);
    assert.equal(Boolean(target.closest("[hidden]")), false);
    assert.deepEqual(focusOptions, [{ preventScroll: true }]);
    h.navigate(from);
    assert.equal(
      Boolean(h.window.document.activeElement.closest("[hidden]")),
      false,
    );
    assert.equal(h.mock.state.library.view.query, "Google");
    assert.equal(h.mock.state.library.view.serviceFilter, "Google");
    assert.equal(h.mock.calls.length, 0);
  });

test("history navigation preserves focus that stays visible, including controls outside the theme", (t) => {
  const h = fixture(t);
  h.navigate("more");
  const back = h.root.querySelector(
    '.cyberpunk-subpage [data-action="route"][data-value="accounts"]',
  );
  back.focus();
  h.navigate("preferences");
  assert.equal(h.window.document.activeElement, back);
  h.navigate("more");
  assert.equal(h.window.document.activeElement, back);
  const outside = h.window.document.createElement("input");
  h.window.document.body.append(outside);
  outside.focus();
  h.navigate("accounts");
  assert.equal(h.window.document.activeElement, outside);
  h.navigate("preferences");
  assert.equal(h.window.document.activeElement, outside);
});

test("history and legacy preference group changes never steal focus while a host dialog owns it", (t) => {
  const h = fixture(t);
  h.navigate("more");
  const pendingReturn = h.feature("import");
  pendingReturn.focus();
  h.mock.state.host.dialogOpen = true;
  h.mock.emit();
  // The modal may be in its opening transition with its old return target still focused.
  h.navigate("preferences");
  assert.equal(h.window.document.activeElement, pendingReturn);
  const modal = h.window.document.createElement("div");
  modal.className = "modal";
  const input = h.window.document.createElement("input");
  modal.append(input);
  h.window.document.body.append(modal);
  input.focus();
  for (const page of ["accounts", "more", "preferences", "accounts"]) {
    h.navigate(page);
    assert.equal(h.window.document.activeElement, input);
  }
  // Even an explicit theme click cannot override active host dialog focus.
  h.root.querySelector('[data-action="route"][data-value="more"]').click();
  assert.equal(h.window.document.activeElement, input);
  assert.equal(h.mock.calls.length, 0);
});

test("explicit page navigation retains its visible heading and account-section focus targets with preventScroll", (t) => {
  const h = fixture(t);
  const heading = h.root.querySelector(".cyberpunk-management-heading h2");
  const accountPage = h.root.querySelector(".cyberpunk-account-page");
  const calls = [];
  for (const node of [heading, accountPage]) {
    const focus = node.focus.bind(node);
    node.focus = (options) => {
      calls.push({ node, options });
      focus(options);
    };
  }
  h.root.querySelector('[data-action="route"][data-value="more"]').click();
  assert.equal(h.window.document.activeElement, heading);
  h.root
    .querySelector(
      '.cyberpunk-subpage [data-action="route"][data-value="accounts"]',
    )
    .click();
  assert.equal(h.window.document.activeElement, accountPage);
  assert.deepEqual(calls, [
    { node: heading, options: { preventScroll: true } },
    { node: accountPage, options: { preventScroll: true } },
  ]);
});
