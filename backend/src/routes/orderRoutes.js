const express = require('express');
const {
  requestOrder,
  getDealerOrders,
  addQuote,
  approveOrder
} = require('../controllers/orderController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(verifyToken);

router.post('/request', requireRole(['Dealer']), requestOrder);
router.get('/dealer/:id', requireRole(['Dealer', 'Admin']), getDealerOrders);
router.put('/:id/quote', requireRole(['Admin']), addQuote);
router.put('/:id/approve', requireRole(['Dealer']), approveOrder);

module.exports = router;
