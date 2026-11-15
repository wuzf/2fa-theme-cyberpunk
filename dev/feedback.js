/** Development-only feedback; no real account forms or writes are performed. */
export function createPreviewFeedback(document) {
  const dialog = document.querySelector("#dev-action-dialog");
  const title = document.querySelector("#dev-action-title");
  const description = document.querySelector("#dev-action-description");
  const close = document.querySelector("#dev-action-close");
  const context = document.querySelector("#dev-action-context");
  let returnFocus = null;
  let onClose = () => {};
  const copy = {
    "zh-CN": [
      "主题示例预览",
      "这是主题示例。请在安装了此主题的 2FA 实例中使用此操作；本页不会添加或修改真实账户。",
      "知道了",
    ],
    "zh-TW": [
      "主題示例預覽",
      "這是主題示例。請在安裝了此主題的 2FA 實例中使用此操作；本頁不會新增或修改真實帳戶。",
      "知道了",
    ],
    en: [
      "Theme preview",
      "This is a theme preview. Use this action in your 2FA instance after installing the theme. This page does not add or change real accounts.",
      "Close",
    ],
    de: [
      "Designvorschau",
      "Dies ist eine Designvorschau. Verwenden Sie diese Aktion nach der Installation des Designs in Ihrer 2FA-Instanz. Diese Seite fügt keine echten Konten hinzu und ändert sie nicht.",
      "Schließen",
    ],
  };
  dialog.addEventListener("close", () => {
    onClose();
    if (returnFocus?.isConnected && !returnFocus.closest("[hidden]")) {
      returnFocus.focus({ preventScroll: true });
    } else {
      document
        .querySelector('.cyberpunk-topbar-actions [data-action="route"]')
        ?.focus({ preventScroll: true });
    }
    returnFocus = null;
    onClose = () => {};
  });
  return {
    palette(tokens) {
      for (const name of [
        "surface",
        "text",
        "muted",
        "line",
        "accent",
        "accentText",
      ]) {
        dialog.style.setProperty("--preview-" + name, tokens[name]);
      }
    },
    show({ label, language, trigger, closed }) {
      const words = copy[language] || copy.en;
      context.textContent = words[0];
      title.textContent = label || words[0];
      description.textContent = words[1];
      close.textContent = words[2];
      dialog.lang = language;
      returnFocus = trigger || document.activeElement;
      onClose = closed;
      if (!dialog.open) dialog.showModal();
    },
  };
}
