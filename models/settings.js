const { pool } = require('../config/database');

async function getSettings() {
  const settings = require('../config/settings');
  return settings.getSettings ? settings.getSettings() : {};
}

async function updateSetting(key, valueObj) {
  const settings = require('../config/settings');
  return settings.updateSetting ? settings.updateSetting(key, valueObj) : {};
}

async function getFeatureFlags() {
  const settings = require('../config/settings');
  return settings.getFeatureFlags ? settings.getFeatureFlags() : {};
}

module.exports = {
  getSettings,
  updateSetting,
  getFeatureFlags
};
