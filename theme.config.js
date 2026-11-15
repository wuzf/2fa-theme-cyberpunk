export const theme = {
  themeApiVersion: 2,
  kind: "app",
  sdkApiVersion: 1,
  id: "cyberpunk-for-2fa",
  name: "Neon Vault · 霓虹密库",
  version: "1.0.0",
  author: "2FA Theme Contributors",
  description:
    "赛博朋克验证器：倒计时反应堆、发光服务导轨与错落的切角保险库面板。",
  entry: "src/theme.js",
  preview: "preview.webp",
  styles: [
    "src/styles/tokens.css",
    "src/styles/components.css",
    "src/styles/application.css",
    "src/styles/hud.css",
  ],
  capabilities: ["accounts", "host-flows", "preferences"],
  settings: [
    {
      key: "density",
      type: "select",
      label: "信息密度 / Density",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "舒适 / Comfortable" },
        { value: "compact", label: "紧凑 / Compact" },
      ],
    },
    {
      key: "accent",
      type: "select",
      label: "霓虹强调色 / Neon accent",
      default: "yellow",
      options: [
        { value: "yellow", label: "电光黄 / Electric yellow" },
        { value: "cyan", label: "冰青 / Ice cyan" },
      ],
    },
    {
      key: "grid",
      type: "boolean",
      label: "背景网格 / Background grid",
      default: true,
    },
    {
      key: "glow",
      type: "boolean",
      label: "霓虹辉光 / Neon glow",
      default: true,
    },
  ],
};
