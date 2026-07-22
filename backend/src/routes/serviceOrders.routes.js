const { Router } = require('express');
const serviceOrdersController = require('../controllers/serviceOrders.controller');
const validateRequest = require('../middlewares/validateRequest');
const {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  updateStatusSchema,
} = require('../validators/serviceOrders.validator');

const router = Router();

router.post('/', validateRequest(createServiceOrderSchema), serviceOrdersController.create);
router.get('/', serviceOrdersController.findAll);
router.get('/:id', serviceOrdersController.findById);
router.post('/:id/duplicate', serviceOrdersController.duplicate);
router.put('/:id', validateRequest(updateServiceOrderSchema), serviceOrdersController.update);
router.patch('/:id/status', validateRequest(updateStatusSchema), serviceOrdersController.updateStatus);
router.delete('/:id', serviceOrdersController.delete);

module.exports = router;
