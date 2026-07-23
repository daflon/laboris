const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');

// Rotas públicas
const authRoutes = require('./auth.routes');

// Rotas protegidas (super admin)
const masterRoutes = require('./master.routes');

// Rotas protegidas (tenant)
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

// === ROTAS PÚBLICAS ===
router.use('/auth', authRoutes);

// === ROTAS SUPER ADMIN ===
router.use('/master', masterRoutes);

// === ROTAS PROTEGIDAS (requerem login + tenant) ===
router.use('/clients', authenticate, clientsRoutes);
router.use('/technicians', authenticate, techniciansRoutes);
router.use('/equipment', authenticate, equipmentRoutes);
router.use('/service-orders', authenticate, serviceOrdersRoutes);
router.use('/company', authenticate, companySettingsRoutes);
router.use('/dashboard', authenticate, dashboardRoutes);
router.use('/pdf', authenticate, pdfRoutes);
router.use('/admin', authenticate, adminRoutes);
router.use('/search', authenticate, searchRoutes);

// Rotas aninhadas
router.get('/clients/:id/equipment', authenticate, equipmentController.findByClientId);
router.get('/equipment/:id/history', authenticate, serviceOrdersController.findByEquipmentId);

module.exports = router;
