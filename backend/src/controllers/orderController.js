const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const { sendAlert } = require('../utils/notificationUtils');

const buildError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildOrderItemsFromRequest = async (requestedItems) => {
  const productIds = requestedItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const items = requestedItems.map((item) => {
    const product = productMap.get(String(item.product));
    const quantity = Number(item.quantity);

    if (!product) {
      throw buildError(400, `Invalid product id: ${item.product}`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw buildError(400, `Invalid quantity for product: ${item.product}`);
    }

    const unitPrice = Number(product.price || 0);

    return {
      product: product._id,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    items,
    totalAmount
  };
};

const requestOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const orderPayload = await buildOrderItemsFromRequest(items);

    const order = await Order.create({
      dealer: req.user.userId,
      status: 'Pending',
      items: orderPayload.items,
      totalAmount: orderPayload.totalAmount
    });

    return res.status(201).json({ message: 'Order request submitted successfully', order });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to submit order request' });
  }
};

const getDealerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid dealer id' });
    }

    if (req.user.role === 'Dealer' && String(req.user.userId) !== String(id)) {
      return res.status(403).json({ message: 'You can only access your own order history' });
    }

    const orders = await Order.find({ dealer: id })
      .populate('dealer', 'name email businessName')
      .populate('items.product', 'name type price')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

const addQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Quoted items are required' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending orders can be quoted' });
    }

    const quoteMap = new Map();

    for (const item of items) {
      const key = String(item.product);
      const unitPrice = Number(item.unitPrice);

      if (!mongoose.Types.ObjectId.isValid(key)) {
        return res.status(400).json({ message: `Invalid product id in quote: ${key}` });
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: `Invalid unitPrice for product: ${key}` });
      }

      quoteMap.set(key, unitPrice);
    }

    const recalculatedItems = order.items.map((orderItem) => {
      const productId = String(orderItem.product);

      if (!quoteMap.has(productId)) {
        throw buildError(400, `Quote missing unitPrice for product: ${productId}`);
      }

      const unitPrice = quoteMap.get(productId);
      const quantity = Number(orderItem.quantity);

      return {
        product: orderItem.product,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice
      };
    });

    const totalAmount = recalculatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    order.items = recalculatedItems;
    order.totalAmount = totalAmount;
    order.status = 'Quoted';

    await order.save();

    return res.status(200).json({ message: 'Quote attached successfully', order });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to attach quote' });
  }
};

const approveOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw buildError(400, 'Invalid order id');
    }

    session.startTransaction();

    const order = await Order.findById(id).session(session);

    if (!order) {
      throw buildError(404, 'Order not found');
    }

    if (String(order.dealer) !== String(req.user.userId)) {
      throw buildError(403, 'You can only approve your own order');
    }

    if (order.status !== 'Quoted') {
      throw buildError(400, 'Only Quoted orders can be approved');
    }

    const lowStockProducts = [];

    for (const item of order.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          currentStock: { $gte: item.quantity }
        },
        {
          $inc: { currentStock: -item.quantity }
        },
        {
          new: true,
          session
        }
      );

      if (!updatedProduct) {
        throw buildError(400, `Insufficient stock for product ${item.product}`);
      }

      if (updatedProduct.currentStock < updatedProduct.minThreshold) {
        lowStockProducts.push({
          productId: updatedProduct._id,
          productName: updatedProduct.name,
          currentStock: updatedProduct.currentStock,
          minThreshold: updatedProduct.minThreshold
        });
      }
    }

    order.status = 'Approved';
    await order.save({ session });

    const [invoice] = await Invoice.create(
      [
        {
          order: order._id,
          billingDate: new Date(),
          paymentStatus: 'Pending'
        }
      ],
      { session }
    );

    await session.commitTransaction();

    for (const product of lowStockProducts) {
      await sendAlert(product);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('dealer', 'name email businessName')
      .populate('items.product', 'name type price');

    return res.status(200).json({
      message: 'Order approved successfully and invoice generated',
      order: populatedOrder,
      invoice
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(error.status || 500).json({ message: error.message || 'Failed to approve order' });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  requestOrder,
  getDealerOrders,
  addQuote,
  approveOrder
};
