const express = require('express');
const {
  getInventory,
  addProduct,
  updateStock
} = require('../controllers/inventoryController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['Admin', 'Dealer', 'Supplier']), getInventory);
router.post('/', requireRole(['Admin']), addProduct);
router.put('/:id/stock', requireRole(['Admin']), updateStock);

module.exports = router;
