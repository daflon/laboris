const { Router } = require('express');
const clientsController = require('../controllers/clients.controller');
const validateRequest = require('../middlewares/validateRequest');
const { createClientSchema, updateClientSchema } = require('../validators/clients.validator');

const router = Router();

router.post('/', validateRequest(createClientSchema), clientsController.create);
router.get('/', clientsController.findAll);
router.get('/:id', clientsController.findById);
router.put('/:id', validateRequest(updateClientSchema), clientsController.update);
router.delete('/:id', clientsController.delete);

module.exports = router;
