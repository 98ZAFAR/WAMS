const express = require('express');
const {
  getSupplierProfile,
  updateSupplierProfile,
  createSupplyRequest,
  getSupplies,
  updateSupplyStatus,
  getSupplierDashboard
} = require('../controllers/supplierController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(verifyToken);

router.get('/dashboard', requireRole(['Supplier']), getSupplierDashboard);
router.get('/profile', requireRole(['Supplier']), getSupplierProfile);
router.put('/profile', requireRole(['Supplier']), updateSupplierProfile);
router.post('/supplies', requireRole(['Supplier']), createSupplyRequest);
router.get('/supplies', requireRole(['Supplier', 'Admin']), getSupplies);
router.put('/supplies/:id/status', requireRole(['Admin']), updateSupplyStatus);

module.exports = router;
