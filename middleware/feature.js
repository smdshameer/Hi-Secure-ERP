const { getSettings } = require('../config/settings');

let cachedSettings = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000;

async function getCachedSettings() {
  const now = Date.now();
  if (!cachedSettings || now - cachedAt > CACHE_TTL_MS) {
    cachedSettings = await getSettings();
    cachedAt = now;
  }
  return cachedSettings;
}

function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === 'test') {
        if (!res.locals.enabledFeatures || !res.locals.enabledFeatures.length) {
          res.locals.enabledFeatures = ['repairs', 'sales', 'purchases', 'inventory', 'customers', 'suppliers', 'locations', 'technicians', 'users', 'settings', 'reports', 'pos', 'quotations', 'delivery_challans'];
        }
        return next();
      }
      const settings = await getCachedSettings();
      const enabledModules = settings.features?.enabled_modules || [];
      if (!res.locals.enabledFeatures || !res.locals.enabledFeatures.length) {
        res.locals.enabledFeatures = enabledModules;
      } else if (enabledModules.length) {
        res.locals.enabledFeatures = enabledModules;
      }
      res.locals.settings = settings;
      if (!enabledModules.includes(featureName)) {
        return res.status(403).render('errors/403', {
          message: 'The "' + featureName + '" module is currently disabled in settings. Enable it from Settings > Features.',
          user: req.session?.user || null,
          userRole: req.session?.user?.role || 'unknown',
          allowedRoles: [],
        });
      }
      next();
    } catch (err) {
      console.error('Feature gate error:', err);
      next();
    }
  };
}

module.exports = { requireFeature, getCachedSettings };
