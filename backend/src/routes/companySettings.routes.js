const { Router } = require('express');
const companySettingsController = require('../controllers/companySettings.controller');

const router = Router();

router.get('/', companySettingsController.get);
router.put('/', companySettingsController.upsert);

module.exports = router;
