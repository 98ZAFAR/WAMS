const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['RawMaterial', 'FinishedGood'],
      required: true
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0
    },
    minThreshold: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
