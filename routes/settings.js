const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const pool = require('../config/database').pool;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'logo');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'company-logo-' + uniqueSuffix + ext);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedTypes.test(ext) && mime.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files (jpeg, jpg, png, gif, svg) allowed'));
  }
});

const { getSettings, updateSetting } = require('../config/settings');

module.exports = function(app) {
  app.get('/settings', requireAuth, authorize('admin'), async (req, res) => {
    try {
      const settings = await getSettings();
      res.render('settings/index', { settings, user: req.session.user || null });
    } catch (err) {
      console.error('Settings page error:', err);
      res.status(500).render('errors/500', { message: 'Failed to load settings.', user: req.session.user || null });
    }
  });

  app.post('/settings/update', requireAuth, authorize('admin'), [
    body('section').trim().notEmpty().withMessage('Section parameter is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { section, ...updates } = req.body;
      const currentSettings = await getSettings();
      const currentSection = currentSettings[section] || {};
      const mergedSection = { ...currentSection };
      for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
          let value = updates[key];
          if (key === 'gst_rates' && typeof value === 'string') {
            value = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          } else if (typeof value === 'string') {
            try {
              if (value.trim().startsWith('{') || value.trim().startsWith('[')) value = JSON.parse(value);
              else { const num = parseFloat(value); value = isNaN(num) ? value : num; }
            } catch (e) { }
          }
          mergedSection[key] = value;
        }
      }
      await updateSetting(section, mergedSection);
      res.json({ success: true, message: `${section} settings saved successfully` });
    } catch (err) {
      console.error('Settings update error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to save settings' });
    }
  });

  app.post('/settings/upload-logo', requireAuth, authorize('admin'), logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      const currentSettings = await getSettings();
      const company = currentSettings.company || {};
      if (company.logo_path) {
        const oldPath = path.join(__dirname, '..', company.logo_path);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (err) { console.warn('Could not delete old logo:', err.message); }
        }
      }
      const logoUrl = `/uploads/logo/${req.file.filename}`;
      company.logo_path = logoUrl;
      await updateSetting('company', company);
      res.json({ success: true, logo_url: logoUrl, message: 'Logo uploaded successfully' });
    } catch (err) {
      console.error('Logo upload error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to upload logo' });
    }
  });
};
