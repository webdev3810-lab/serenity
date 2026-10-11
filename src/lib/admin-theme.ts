export type AdminTheme = "light" | "dark";
export const ADMIN_THEME_KEY = "serenity-admin-theme";
export const ADMIN_THEME_STYLE_ID = "serenity-admin-theme-rules";

export const adminThemeDeclarations = {
  light: `
  --admin-bg: #f6f7fb;
  --admin-surface: #ffffff;
  --admin-surface-alt: #f3f5fa;
  --admin-surface-raised: #f9faff;
  --admin-input: #ffffff;
  --admin-border: #e5e9f2;
  --admin-border-strong: #c6cfde;
  --admin-text: #202a40;
  --admin-muted: #68748a;
  --admin-subtle: #77839a;
  --admin-accent: #2563eb;
  --admin-on-accent: #ffffff;
  --admin-nav-active-bg: #eaf2ff;
  --admin-nav-active-text: #1d4ed8;
  --admin-shadow: 0 5px 22px rgba(37, 50, 91, .035);
  --admin-success-bg: #eaf8f0; --admin-success-border: #b7e3c8; --admin-success-text: #247d4d;
  --admin-warning-bg: #fff8e9; --admin-warning-border: #f2dfaa; --admin-warning-text: #875e18;
  --admin-info-bg: #edf3ff; --admin-info-border: #c8d9fa; --admin-info-text: #3763a5;
  --admin-violet-bg: #eaf2ff; --admin-violet-border: #bfd8ff; --admin-violet-text: #1d4ed8;
  --admin-danger-bg: #fff0f0; --admin-danger-border: #f2c3c9; --admin-danger-text: #ac3b4a;
  visibility:visible;color-scheme:light;--serenity-theme:light;--admin-moon-display:block;--admin-sun-display:none;`,
  dark: `
  --admin-bg: #111827;
  --admin-surface: #1b2535;
  --admin-surface-alt: #263247;
  --admin-surface-raised: #161f2f;
  --admin-input: #202c3d;
  --admin-border: #344159;
  --admin-border-strong: #63728d;
  --admin-text: #f1f4fa;
  --admin-muted: #aab6c9;
  --admin-subtle: #9aa9bf;
  --admin-accent: #60a5fa;
  --admin-on-accent: #10233d;
  --admin-nav-active-bg: #1d3b61;
  --admin-nav-active-text: #bfdbfe;
  --admin-shadow: 0 10px 30px rgba(0, 0, 0, .12);
  --admin-success-bg: #1d3a30; --admin-success-border: #37624b; --admin-success-text: #a6e8bf;
  --admin-warning-bg: #3e3525; --admin-warning-border: #74613b; --admin-warning-text: #f3d89e;
  --admin-info-bg: #213b57; --admin-info-border: #395f87; --admin-info-text: #b5d8ff;
  --admin-violet-bg: #203d62; --admin-violet-border: #376491; --admin-violet-text: #bfdbfe;
  --admin-danger-bg: #452933; --admin-danger-border: #82505d; --admin-danger-text: #ffc1c9;
  visibility:visible;color-scheme:dark;--serenity-theme:dark;--admin-moon-display:none;--admin-sun-display:block;`,
};

export const adminThemeCss = '.admin-theme-context{visibility:hidden;' + adminThemeDeclarations.light.replace('visibility:visible;', '') + '}@media(prefers-color-scheme:dark){.admin-theme-context{' + adminThemeDeclarations.dark.replace('visibility:visible;', '') + '}}';
// CSSOM changes do not mutate React-owned DOM attributes or style text.
export const adminThemeBootstrap = '(function(){var v;try{v=localStorage.getItem("serenity-admin-theme");if(v==="night"){v="dark";localStorage.setItem("serenity-admin-theme",v)}}catch(e){}var t=v==="light"||v==="dark"?v:matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";var s=document.getElementById("serenity-admin-theme-rules");if(s&&s.sheet)s.sheet.insertRule("#serenity-admin{"+' + JSON.stringify(adminThemeDeclarations) + '[t]+"}",s.sheet.cssRules.length)})()';
