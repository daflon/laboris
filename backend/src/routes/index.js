const { Router } = require('express');
const clientsRoutes = require('./clients.routes');
const techniciansRoutes = require('./technicians.routes');
const equipmentRoutes = require('./equipment.routes');
const serviceOrdersRoutes = require('./serviceOrders.routes');
const companySettingsRoutes = require('./companySettings.routes');
const dashboardRoutes = require('./dashboard.routes');
const pdfRoutes = require('./pdf.routes');
const adminRoutes = require('./admin.routes');
const searchRoutes = require('./search.routes');
const equipmentController = require('../controllers/equipment.controller');
const serviceOrdersController = require('../controllers/serviceOrders.controller');

const router = Router();

router.use('/clients', clientsRoutes);
router.use('/technicians', techniciansRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/service-orders', serviceOrdersRoutes);
router.use('/company', companySettingsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pdf', pdfRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);

// Rotas aninhadas
router.get('/clients/:id/equipment', equipmentController.findByClientId);
router.get('/equipment/:id/history', serviceOrdersController.findByEquipmentId);

module.exports = router;
