import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "./synthetic-sdk.js";
import { languages } from "../src/i18n.js";
import { createPreviewFeedback } from "./feedback.js";
const params = new URLSearchParams(window.location.search);
const selectedLanguage = languages.some(
  ([id]) => id === params.get("lang") && id !== "auto",
)
  ? params.get("lang")
  : "zh-CN";
const selectedScheme = params.get("scheme") === "light" ? "light" : "dark";
document.documentElement.lang = selectedLanguage;
const previewFeedback = createPreviewFeedback(document);
const shell = createSyntheticSdk({
  onCall(method, value) {
    if (method === "host.setAppearance") {
      previewFeedback.palette(value);
      return;
    }
    if (method !== "host.open") return;
    const action = shell.sdk.host
      .listActions()
      .find((item) =>
        Object.entries(item.request).every(
          ([key, itemValue]) => value.request[key] === itemValue,
        ),
      );
    previewFeedback.show({
      label: action ? shell.sdk.i18n.t(action.labelKey) : "",
      language: shell.state.preferences.resolvedLanguage,
      trigger: value.options?.returnFocus,
      closed() {
        shell.state.host.dialogOpen = false;
        shell.emit();
      },
    });
    shell.state.host.dialogOpen = true;
    shell.emit();
  },
});
const labels = {
  themeLight: "切换浅色",
  themeDark: "切换深色",
  searchInputPlaceholder: "搜索服务或账户",
  searchInputAriaLabel: "搜索账户",
  searchClearAriaLabel: "清除搜索",
  cardMenuAriaLabel: "账户操作",
  copyOtpBtnTitle: "复制验证码",
  copyOtpBtnAriaLabel: "复制当前验证码",
  copyNextOtpBtnTitle: "复制下一组验证码",
  otpNextLabel: "下一组",
  counterLabel: "计数器",
  viewModeLabel: "分组方式",
  viewModeGrouped: "按服务分组",
  viewModeFlat: "全部平铺",
  sortModeFlatLabel: "账户排序",
  sortModeLabel: "组内排序",
  sortOldestFirst: "最早添加优先",
  sortNewestFirst: "最新添加优先",
  sortServiceNameAsc: "服务名称 A–Z",
  sortServiceNameDesc: "服务名称 Z–A",
  sortAccountNameAsc: "账户名称 A–Z",
  sortAccountNameDesc: "账户名称 Z–A",
  groupSortLabel: "服务分组排序",
  groupSortNameAsc: "名称 A–Z",
  groupSortNameDesc: "名称 Z–A",
  searchFoundCount: "找到 {found} / {total} 个账户",
  searchNoMatch: "没有匹配的账户",
  searchNoMatchDesc: "试试其他服务名称或账户关键词。",
  emptyTitle: "还没有账户",
  emptyDesc: "添加账户，开始生成验证码。",
  emptyAddBtn: "添加账户",
  loadingSecrets: "正在加载账户",
  loginSubmitBtn: "登录",
  logoutBtn: "退出登录",
  fabAddSecret: "添加账户",
  cardMenuEdit: "编辑",
  cardMenuDelete: "删除",
  cardMenuQRCode: "二维码",
  cardMenuCopyURI: "复制密钥链接",
  cardMenuCopyLink: "复制分享链接",
  fabScanQR: "扫描二维码",
  fabImport: "导入账户",
  fabExport: "导出账户",
  fabBackup: "账户备份",
  fabTools: "工具",
  toolQrDecodeTitle: "识别二维码",
  toolQrGenTitle: "生成二维码",
  toolBase32Title: "Base32 编码",
  pageTimestampTitle: "时间戳",
  toolKeyCheckerTitle: "检查密钥",
  toolKeyGenTitle: "生成密钥",
  settingsTabSecurity: "安全设置",
  settingsTabPreferences: "使用偏好",
  settingsTabSync: "同步设置",
  settingsTabCustomCode: "自定义代码",
  appearanceTitle: "外观与主题",
  appearanceSafeMode: "安全模式",
  pageHiddenAccounts: "隐藏账户",
  offlineQueueView: "待同步修改",
  offlineQueueEditRetry: "编辑待同步修改",
  retry: "重试",
  offlineQueueCancelChange: "取消修改",
  restoreRefresh: "刷新",
  pageBrowserExtension: "浏览器扩展",
  pageDocumentation: "使用文档",
  pageFeedback: "反馈问题",
  aboutSourceCode: "源代码",
  settingsTabAbout: "关于",
  versionUpdateAvailable: "🆕 有新版本 {version}",
  pwaInstallBtn: "安装应用",
  appTitle: "快速验证码",
};
const translate = shell.sdk.i18n.t;
const germanLabels = {
  themeLight: "Helles Design",
  themeDark: "Dunkles Design",
  searchInputPlaceholder: "Dienst oder Konto durchsuchen",
  searchInputAriaLabel: "Konten durchsuchen",
  searchClearAriaLabel: "Suche löschen",
  cardMenuAriaLabel: "Kontoaktionen",
  copyOtpBtnTitle: "Code kopieren",
  copyOtpBtnAriaLabel: "Aktuellen Code kopieren",
  copyNextOtpBtnTitle: "Nächsten Code kopieren",
  otpNextLabel: "Nächster",
  counterLabel: "Zähler",
  fabAddSecret: "Konto hinzufügen",
  cardMenuEdit: "Bearbeiten",
  cardMenuDelete: "Löschen",
  cardMenuQRCode: "QR-Code",
  cardMenuCopyURI: "URI kopieren",
  cardMenuCopyLink: "Link kopieren",
  viewModeLabel: "Ansicht",
  viewModeGrouped: "Gruppiert",
  viewModeFlat: "Alle Konten",
  sortModeFlatLabel: "Konten sortieren",
  sortModeLabel: "Sortierung",
  sortOldestFirst: "Älteste zuerst",
  sortNewestFirst: "Neueste zuerst",
  sortServiceNameAsc: "Dienst A–Z",
  sortServiceNameDesc: "Dienst Z–A",
  sortAccountNameAsc: "Konto A–Z",
  sortAccountNameDesc: "Konto Z–A",
  groupSortLabel: "Gruppen sortieren",
  groupSortNameAsc: "Name A–Z",
  groupSortNameDesc: "Name Z–A",
};
shell.sdk.i18n.t = (key, params) => {
  const language = shell.state.preferences.resolvedLanguage;
  const dictionary = language.startsWith("zh")
    ? labels
    : language === "de"
      ? germanLabels
      : {};
  let text = dictionary[key] || translate(key, params);
  for (const [name, value] of Object.entries(params || {})) {
    text = text.replaceAll("{" + name + "}", String(value));
  }
  return text;
};
Object.assign(shell.state.preferences, {
  theme: selectedScheme,
  resolvedTheme: selectedScheme,
  language: selectedLanguage,
  resolvedLanguage: selectedLanguage,
});
shell.state.library.view.mode = "flat";
const demos = [
  ["Google", "studio@example.invalid"],
  ["GitHub", "neon-architect"],
  ["Cloudflare", "network@example.invalid"],
  ["Hardware key", "备用硬件令牌"],
  ["Vercel", "deploy@example.invalid"],
  ["霓虹工作室", "工作账户 / Studio"],
];
shell.state.library.accounts.forEach((account, index) => {
  const [service, label] = demos[index];
  account.service.label = service;
  account.service.groupId = service;
  account.accountLabel = label;
});
shell.sdk.clock.now = () => Date.now();
let lastWindow = -1;
function advanceDemo() {
  const period = Math.floor(Date.now() / 30000);
  if (period === lastWindow) return;
  lastWindow = period;
  shell.state.clock.correctedNow = Date.now();
  for (const [index, account] of shell.state.library.accounts.entries()) {
    if (account.type === "HOTP") continue;
    for (const [slot, offset] of [
      ["current", 0],
      ["next", 1],
    ]) {
      account.otp[slot].value = String(
        (period + offset + (index + 1) * 148329) % 10 ** account.digits,
      ).padStart(account.digits, "0");
      account.otp[slot].validFrom = (period + offset) * 30000;
      account.otp[slot].validUntil = (period + offset + 1) * 30000;
    }
    account.otp.displayRevision += 1;
  }
  shell.emit();
}
advanceDemo();
const app = mount({
  root: document.querySelector("#app"),
  sdk: shell.sdk,
  appearance: {
    package: { id: "cyberpunk-for-2fa", name: "Neon Vault", version: "1.0.0" },
    settings: {
      density: params.get("density") === "compact" ? "compact" : "comfortable",
      accent: params.get("accent") === "cyan" ? "cyan" : "yellow",
      grid: params.get("grid") !== "false",
      glow: params.get("glow") !== "false",
    },
  },
});
const timer = window.setInterval(advanceDemo, 1000);
window.addEventListener(
  "pagehide",
  () => {
    window.clearInterval(timer);
    app.unmount();
  },
  { once: true },
);
