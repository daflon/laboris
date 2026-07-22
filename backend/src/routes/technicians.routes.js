const { Router } = require('express');
const techniciansController = require('../controllers/technicians.controller');
const validateRequest = require('../middlewares/validateRequest');
const { createTechnicianSchema, updateTechnicianSchema } = require('../validators/technicians.validator');

const router = Router();

router.post('/', validateRequest(createTechnicianSchema), techniciansController.create);
router.get('/', techniciansController.findAll);
router.get('/:id', techniciansController.findById);
router.put('/:id', validateRequest(updateTechnicianSchema), techniciansController.update);
router.patch('/:id/toggle-status', techniciansController.toggleStatus);
router.delete('/:id', techniciansController.delete);

module.exports = router;
