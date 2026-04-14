const express = require('express');
const { getSalesReport, getForecastReport } = require('../controllers/reportController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(verifyToken);

router.get('/sales', requireRole(['Admin']), getSalesReport);
router.get('/forecast', requireRole(['Admin']), getForecastReport);

module.exports = router;
