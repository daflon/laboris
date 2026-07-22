const { Router } = require('express');
const equipmentController = require('../controllers/equipment.controller');
const validateRequest = require('../middlewares/validateRequest');
const { createEquipmentSchema, updateEquipmentSchema } = require('../validators/equipment.validator');

const router = Router();

router.post('/', validateRequest(createEquipmentSchema), equipmentController.create);
router.get('/', equipmentController.findAll);
router.get('/:id', equipmentController.findById);
router.put('/:id', validateRequest(updateEquipmentSchema), equipmentController.update);
router.delete('/:id', equipmentController.delete);

module.exports = router;
