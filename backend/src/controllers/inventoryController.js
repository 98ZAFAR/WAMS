const Product = require('../models/Product');
const { sendAlert } = require('../utils/notificationUtils');

const getInventory = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch inventory' });
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, type, price = 0, currentStock = 0, minThreshold } = req.body;

    if (!name || !type || minThreshold === undefined) {
      return res.status(400).json({ message: 'name, type and minThreshold are required' });
    }

    const product = await Product.create({
      name,
      type,
      price,
      currentStock,
      minThreshold
    });

    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body;

    if (typeof quantityChange !== 'number' || Number.isNaN(quantityChange)) {
      return res.status(400).json({ message: 'quantityChange must be a valid number' });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { currentStock: quantityChange } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.currentStock < product.minThreshold) {
      await sendAlert({
        productId: product._id,
        productName: product.name,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold
      });
    }

    return res.status(200).json({ message: 'Stock updated successfully', product });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update stock' });
  }
};

module.exports = {
  getInventory,
  addProduct,
  updateStock
};
