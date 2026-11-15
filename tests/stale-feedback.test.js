import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

const actions = [
  { action: "copy", port: "otp", method: "copy" },
  { action: "next", port: "otp", method: "copy" },
  { action: "uri", port: "accounts", method: "copyURI" },
  { action: "link", port: "accounts", method: "copyShareLink" },
];

function fixture(t, { action, port, method }) {
  const window = new Window({ url: "https://cyberpunk.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  let resolve, reject;
  const pending = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  let commands = 0;
  mock.sdk[port][method] = () => {
    commands++;
    return pending;
  };
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  if (["uri", "link"].includes(action))
    root.querySelector('[data-account="google"] [data-action="menu"]').click();
  root
    .querySelector(`[data-account="google"] [data-action="${action}"]`)
    .click();
  assert.equal(commands, 1, "The original command must start exactly once");
  return {
    mock,
    resolve,
    reject,
    notice: root.querySelector('[role="status"]'),
    get commands() {
      return commands;
    },
  };
}

async function flush() {
  for (let index = 0; index < 6; index++) await Promise.resolve();
}

for (const command of actions) {
  for (const settlement of ["resolve", "reject"]) {
    test(`${command.action}: a changed account generation suppresses late ${settlement} feedback in the same session`, async (t) => {
      const h = fixture(t, command);
      const session = h.mock.state.epochs.session;
      h.mock.state.library.accounts.find((item) => item.ref.id === "google").ref
        .generation++;
      h.mock.emit();
      assert.equal(h.mock.state.epochs.session, session);
      if (settlement === "resolve")
        h.resolve({
          status: "settled",
          clipboard: "copied",
          reservation: "not-attempted",
        });
      else h.reject(new Error("Synthetic late clipboard failure"));
      await flush();
      assert.equal(h.notice.hidden, true);
      assert.equal(h.notice.textContent, "");
      assert.equal(h.commands, 1, "Invalidation must never retry the command");
    });
  }
  test(`${command.action}: an unchanged account still receives copy feedback`, async (t) => {
    const h = fixture(t, command);
    h.resolve({
      status: "settled",
      clipboard: "copied",
      reservation: "not-attempted",
    });
    await flush();
    assert.equal(h.notice.hidden, false);
    assert.equal(h.notice.dataset.kind, "success");
    assert.equal(h.commands, 1);
  });
}
