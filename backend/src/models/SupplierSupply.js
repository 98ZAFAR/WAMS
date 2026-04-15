const mongoose = require('mongoose');

const supplierSupplySchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    expectedDeliveryDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Received', 'Rejected'],
      default: 'Pending'
    }
  },
  {
    timestamps: true
  }
);

supplierSupplySchema.pre('validate', function () {
  if (typeof this.quantity === 'number' && typeof this.unitCost === 'number') {
    this.totalCost = this.quantity * this.unitCost;
  }
});

module.exports = mongoose.model('SupplierSupply', supplierSupplySchema);
