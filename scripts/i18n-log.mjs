/** 轻量日志（供 i18n-engine 使用，无额外依赖） */
export const colors = {
  reset: '',
  bold: '',
  dim: '',
  green: '',
  yellow: '',
  cyan: '',
};

export const log = {
  info: (m) => console.log(`[i18n] ${m}`),
  warn: (m) => console.warn(`[i18n] ${m}`),
  error: (m) => console.error(`[i18n] ${m}`),
  success: (m) => console.log(`[i18n] ${m}`),
  dim: (m) => console.log(`[i18n] ${m}`),
  title: (m) => console.log(`\n${m}`),
};
