/** Keep official dialogs and public pages in the same Neon Vault palette. */
export function hostAppearance(settings = {}, dark = false) {
  const cyan = settings.accent === "cyan";
  return {
    surface: dark ? "#111a2b" : "#ffffff",
    subtle: dark ? "#080c17" : "#f2f0fa",
    hover: dark ? "#19263b" : "#ebe6f8",
    text: dark ? "#eef4ff" : "#1a1736",
    muted: dark ? "#99a9c0" : "#565473",
    line: dark ? "#2c3c53" : "#cfc6e8",
    stroke: dark ? "#526783" : "#7c74a0",
    accent: dark
      ? cyan
        ? "#66e9ef"
        : "#e7f56b"
      : cyan
        ? "#00788a"
        : "#b4116b",
    accentHover: dark
      ? cyan
        ? "#a1f4f7"
        : "#f3ff9a"
      : cyan
        ? "#005f6d"
        : "#8f0d55",
    accentText: dark ? "#101522" : "#ffffff",
    selected: dark
      ? cyan
        ? "#13313d"
        : "#2a321f"
      : cyan
        ? "#e1f4f6"
        : "#fbe6f1",
    danger: dark ? "#ff9cb3" : "#a52349",
    dangerBackground: dark ? "#381a30" : "#ffe8ef",
    dangerFill: dark ? "#ff9cb3" : "#a52349",
    dangerFillHover: dark ? "#ffc2d0" : "#831838",
    dangerText: dark ? "#101522" : "#ffffff",
    warning: dark ? "#f6cd70" : "#775207",
    warningBackground: dark ? "#302919" : "#fff0ce",
    success: dark ? "#66e9ef" : "#006b78",
    successBackground: dark ? "#13313d" : "#d7f0f2",
    radius: 4,
    controlRadius: 3,
    borderWidth: 1,
    shadow: {
      x: 0,
      y: 8,
      blur: 40,
      spread: 0,
      color: dark ? "#00000080" : "#1a173626",
    },
    controlShadow: null,
    fontFamily: ["Bahnschrift", "Segoe UI", "Microsoft YaHei", "sans-serif"],
  };
}
