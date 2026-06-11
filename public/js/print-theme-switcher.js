(function () {
  var THEME_KEY = 'erp_print_theme';
  var SIZE_KEY = 'erp_print_size';

  var THEME_ALIASES = {
    'default': 'classic', 'corporate': 'modern-blue', 'elegant': 'minimal',
    'compact': 'minimal', 'classic': 'classic', 'thermal': 'minimal',
    'modern': 'modern-blue', 'luxury': 'saffron', 'minimal': 'minimal',
    'tally': 'tally', 'billdesk': 'classic', 'emerald': 'saffron',
    'darkpro': 'modern-blue', 'stripe': 'minimal', 'crimson': 'saffron',
    'ocean': 'modern-blue', 'formal': 'classic', 'dark': 'classic',
    'vyapar': 'tally', 'quick': 'minimal', 'zoho': 'modern-blue',
    'navy': 'modern-blue', 'amber': 'saffron', 'maroon': 'saffron',
    'teal': 'modern-blue', 'ink': 'classic', 'gold': 'saffron',
    'saffron': 'saffron', 'grey': 'classic', 'marine': 'modern-blue',
    'plum': 'saffron', 'red': 'saffron', 'sahara': 'saffron'
  };

  var SUPPORTED_THEMES = {
    'tally': true, 'classic': true, 'modern-blue': true, 'minimal': true, 'saffron': true
  };

  function resolveTheme(t) {
    if (SUPPORTED_THEMES[t]) return t;
    if (t === 'mobile-shop') return 'classic';
    return THEME_ALIASES[t] || t || 'classic';
  }

  var PAGE_LAYOUTS = {
    'a4': { size: 'A4', margin: '0', padding: '10mm 12mm', width: '210mm', minHeight: '297mm' },
    'a5': { size: 'A5', margin: '0', padding: '6mm 8mm', width: '148mm', minHeight: '210mm' },
    'letter': { size: 'Letter', margin: '0', padding: '10mm 12mm', width: '216mm', minHeight: '279mm' },
    'legal': { size: 'Legal', margin: '0', padding: '10mm 12mm', width: '216mm', minHeight: '356mm' },
    'thermal-80mm': { size: '80mm auto', margin: '0', padding: '4mm 4mm', width: '80mm', minHeight: '120mm' },
    'thermal-58mm': { size: '58mm auto', margin: '0', padding: '3mm 2mm', width: '58mm', minHeight: '100mm' },
    'half-a4': { size: '105mm 297mm', margin: '0', padding: '6mm 6mm', width: '105mm', minHeight: '297mm' },
    'letterhead': { size: 'A4', margin: '0', padding: '25mm 15mm 15mm 15mm', width: '210mm', minHeight: '297mm' },
    'barcode-80x150': { size: '80mm 150mm', margin: '0', padding: '2mm 2mm', width: '80mm', minHeight: '150mm' }
  };

  function getDefaults() {
    try {
      var t = sessionStorage.getItem(THEME_KEY);
      if (!t) {
        var el = document.documentElement;
        t = el.getAttribute('data-print-theme');
      }
      t = resolveTheme(t);
      var s = sessionStorage.getItem(SIZE_KEY);
      if (!s) {
        var el2 = document.documentElement;
        s = el2.getAttribute('data-print-size');
        if (!s) s = 'a4';
      }
      return { theme: t, size: s };
    } catch (e) {
      return { theme: 'classic', size: 'a4' };
    }
  }

  function applyPageSize(size) {
    var styleEl = document.getElementById('print-theme-page-size');
    var layout = PAGE_LAYOUTS[size] || PAGE_LAYOUTS['a4'];
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'print-theme-page-size';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = 
      '@page { size: ' + layout.size + '; margin: ' + layout.margin + '; }\n' +
      '@media print {\n' +
      '  body { padding: ' + layout.padding + ' !important; }\n' +
      '  #print-area, .container { width: 100% !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }\n' +
      '}\n' +
      '@media screen {\n' +
      '  #print-area, .container {\n' +
      '    background: white;\n' +
      '    width: ' + layout.width + ' !important;\n' +
      '    min-height: ' + layout.minHeight + ' !important;\n' +
      '    padding: ' + layout.padding + ' !important;\n' +
      '    margin: 20px auto !important;\n' +
      '    box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;\n' +
      '    box-sizing: border-box !important;\n' +
      '  }\n' +
      '}';
  }

  function apply() {
    var ctx = getDefaults();
    var theme = ctx.theme;
    var size = ctx.size;

    // Remove existing theme classes to prevent clashing
    var classesToRemove = [];
    document.body.classList.forEach(function(c) {
      if (c.indexOf('print-theme-') === 0 || c.indexOf('theme-') === 0 || c.indexOf('print-size-') === 0) {
        classesToRemove.push(c);
      }
    });
    classesToRemove.forEach(function(c) {
      document.body.classList.remove(c);
    });

    document.documentElement.setAttribute('data-print-theme', theme);
    document.documentElement.setAttribute('data-print-size', size);
    document.body.classList.add('print-theme-' + theme);
    document.body.classList.add('theme-' + theme);
    document.body.classList.add('print-size-' + size);

    applyPageSize(size);
  }

  document.addEventListener('change', function (e) {
    if (e.target.name === 'theme') {
      try { sessionStorage.setItem(THEME_KEY, e.target.value); } catch (err) {}
      apply();
    }
    if (e.target.name === 'size') {
      try { sessionStorage.setItem(SIZE_KEY, e.target.value); } catch (err) {}
      apply();
    }
  });

  apply();
})();
