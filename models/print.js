const { getSettings } = require('../config/settings');

const ALLOWED_SIZES = new Set(['a4','a5','letter','letterhead','legal','half-a4','thermal-80mm','thermal-58mm','barcode-80x150']);
const ALLOWED_THEMES = new Set(['mobile-shop','tally','classic','modern-blue','minimal','saffron']);

function sanitizePrintOpts(req) {
  const settings = req.query.settingsJson ? JSON.parse(req.query.settingsJson) : req.locals?.settings;
  const size = req.query.size || settings?.print?.default_size || 'a4';
  const theme = req.query.theme || settings?.print?.default_theme || 'default';
  return {
    size: ALLOWED_SIZES.has(size) ? size : 'a4',
    theme: ALLOWED_THEMES.has(theme) ? theme : 'classic',
  };
}

function printBodyClass({ size, theme }) {
  return `print-theme-${theme} print-size-${size}`;
}

async function getPrintContext(req) {
  const settings = req.locals?.settings || (await getSettings());
  const { size, theme } = sanitizePrintOpts(req);
  return { size, theme, bodyClass: printBodyClass({ size, theme }), settings };
}

module.exports = { sanitizePrintOpts, printBodyClass, getPrintContext, ALLOWED_SIZES, ALLOWED_THEMES };
