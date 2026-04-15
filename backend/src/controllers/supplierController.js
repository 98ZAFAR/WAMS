const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const SupplierSupply = require('../models/SupplierSupply');

const isTransactionNotSupportedError = (error) => {
  const message = String(error?.message || '');
  return message.includes('Transaction numbers are only allowed on a replica set member or mongos');
};

const getSupplierProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch supplier profile' });
  }
};

const updateSupplierProfile = async (req, res) => {
  try {
    const { name, businessName, contactInfo } = req.body;

    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (businessName !== undefined) {
      updates.businessName = businessName;
    }

    if (contactInfo !== undefined) {
      updates.contactInfo = contactInfo;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.status(200).json({ message: 'Supplier profile updated successfully', profile: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update supplier profile' });
  }
};

const createSupplyRequest = async (req, res) => {
  try {
    const { product, quantity, unitCost, expectedDeliveryDate } = req.body;

    if (!product || quantity === undefined || unitCost === undefined) {
      return res.status(400).json({ message: 'product, quantity and unitCost are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const numericQuantity = Number(quantity);
    const numericUnitCost = Number(unitCost);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({ message: 'quantity must be greater than 0' });
    }

    if (!Number.isFinite(numericUnitCost) || numericUnitCost < 0) {
      return res.status(400).json({ message: 'unitCost must be a valid positive number' });
    }

    const existingProduct = await Product.findById(product);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (existingProduct.type !== 'RawMaterial') {
      return res.status(400).json({ message: 'Supplier supplies are limited to RawMaterial products' });
    }

    const supply = await SupplierSupply.create({
      supplier: req.user.userId,
      product,
      quantity: numericQuantity,
      unitCost: numericUnitCost,
      totalCost: numericQuantity * numericUnitCost,
      expectedDeliveryDate,
      status: 'Pending'
    });

    return res.status(201).json({ message: 'Supply request submitted successfully', supply });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create supply request' });
  }
};

const getSupplies = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'Supplier') {
      filter.supplier = req.user.userId;
    }

    if (req.user.role === 'Admin' && req.query.supplierId && mongoose.Types.ObjectId.isValid(req.query.supplierId)) {
      filter.supplier = req.query.supplierId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const supplies = await SupplierSupply.find(filter)
      .populate('supplier', 'name email businessName')
      .populate('product', 'name type')
      .sort({ createdAt: -1 });

    return res.status(200).json(supplies);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch supplier supplies' });
  }
};

const updateSupplyStatusWithoutTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supply request id' });
    }

    if (!['Approved', 'Received', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be one of Approved, Received, Rejected' });
    }

    const supply = await SupplierSupply.findById(id);

    if (!supply) {
      return res.status(404).json({ message: 'Supply request not found' });
    }

    if (status === 'Approved' && supply.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending requests can be approved' });
    }

    if (status === 'Rejected' && supply.status === 'Received') {
      return res.status(400).json({ message: 'Received requests cannot be rejected' });
    }

    if (status === 'Received') {
      if (supply.status !== 'Approved') {
        return res.status(400).json({ message: 'Only Approved requests can be marked as Received' });
      }

      await Product.findByIdAndUpdate(
        supply.product,
        {
          $inc: { currentStock: supply.quantity }
        },
        {
          new: true,
          runValidators: true
        }
      );
    }

    supply.status = status;
    await supply.save();

    const updatedSupply = await SupplierSupply.findById(supply._id)
      .populate('supplier', 'name email businessName')
      .populate('product', 'name type currentStock minThreshold');

    return res.status(200).json({ message: 'Supply status updated successfully', supply: updatedSupply });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update supply status' });
  }
};

const updateSupplyStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supply request id' });
    }

    if (!['Approved', 'Received', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be one of Approved, Received, Rejected' });
    }

    session.startTransaction();

    const supply = await SupplierSupply.findById(id).session(session);

    if (!supply) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Supply request not found' });
    }

    if (status === 'Approved' && supply.status !== 'Pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Only Pending requests can be approved' });
    }

    if (status === 'Rejected' && supply.status === 'Received') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Received requests cannot be rejected' });
    }

    if (status === 'Received') {
      if (supply.status !== 'Approved') {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Only Approved requests can be marked as Received' });
      }

      await Product.findByIdAndUpdate(
        supply.product,
        {
          $inc: { currentStock: supply.quantity }
        },
        {
          new: true,
          session,
          runValidators: true
        }
      );
    }

    supply.status = status;
    await supply.save({ session });

    await session.commitTransaction();

    const updatedSupply = await SupplierSupply.findById(supply._id)
      .populate('supplier', 'name email businessName')
      .populate('product', 'name type currentStock minThreshold');

    return res.status(200).json({ message: 'Supply status updated successfully', supply: updatedSupply });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (isTransactionNotSupportedError(error)) {
      return updateSupplyStatusWithoutTransaction(req, res);
    }

    return res.status(500).json({ message: error.message || 'Failed to update supply status' });
  } finally {
    await session.endSession();
  }
};

const getSupplierDashboard = async (req, res) => {
  try {
    const supplierObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const summary = await SupplierSupply.aggregate([
      {
        $match: {
          supplier: supplierObjectId
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    const latestSupplies = await SupplierSupply.find({ supplier: req.user.userId })
      .populate('product', 'name type')
      .sort({ createdAt: -1 })
      .limit(5);

    const lowStockRawMaterials = await Product.find({
      type: 'RawMaterial',
      $expr: {
        $lt: ['$currentStock', '$minThreshold']
      }
    })
      .select('name currentStock minThreshold')
      .sort({ currentStock: 1 })
      .limit(5);

    const statusCounts = {
      Pending: 0,
      Approved: 0,
      Received: 0,
      Rejected: 0
    };

    for (const item of summary) {
      statusCounts[item._id] = item.count;
    }

    return res.status(200).json({
      supplierId: req.user.userId,
      totalRequests: summary.reduce((acc, item) => acc + item.count, 0),
      statusCounts,
      latestSupplies,
      lowStockRawMaterials
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load supplier dashboard' });
  }
};

module.exports = {
  getSupplierProfile,
  updateSupplierProfile,
  createSupplyRequest,
  getSupplies,
  updateSupplyStatus,
  getSupplierDashboard
};
