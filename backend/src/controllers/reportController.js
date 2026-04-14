const Order = require('../models/Order');
const Product = require('../models/Product');

const getSalesReport = async (req, res) => {
  try {
    const sales = await Order.aggregate([
      {
        $match: {
          status: 'Approved'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          productType: '$product.type',
          totalQuantitySold: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: {
          totalRevenue: -1
        }
      }
    ]);

    return res.status(200).json(sales);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to generate sales report' });
  }
};

const getForecastReport = async (req, res) => {
  try {
    const lookbackDays = Number(req.query.lookbackDays || 30);
    const coverageDays = Number(req.query.coverageDays || 14);
    const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const soldByProduct = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Approved', 'Dispatched'] },
          updatedAt: { $gte: fromDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          quantitySold: { $sum: '$items.quantity' }
        }
      }
    ]);

    const soldMap = new Map(soldByProduct.map((item) => [String(item._id), item.quantitySold]));
    const products = await Product.find().sort({ name: 1 });

    const forecast = products.map((product) => {
      const quantitySold = soldMap.get(String(product._id)) || 0;
      const avgDailyConsumption = quantitySold / lookbackDays;
      const targetStock = product.minThreshold + Math.ceil(avgDailyConsumption * coverageDays);
      const recommendedRestock = Math.max(targetStock - product.currentStock, 0);

      return {
        productId: product._id,
        productName: product.name,
        productType: product.type,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold,
        avgDailyConsumption: Number(avgDailyConsumption.toFixed(2)),
        recommendedRestock,
        risk: product.currentStock < product.minThreshold ? 'High' : 'Normal'
      };
    });

    return res.status(200).json({
      lookbackDays,
      coverageDays,
      forecast
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to generate forecast report' });
  }
};

module.exports = {
  getSalesReport,
  getForecastReport
};
