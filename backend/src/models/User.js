const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['Admin', 'Dealer', 'Supplier'],
      default: 'Dealer',
      required: true
    },
    businessName: {
      type: String,
      trim: true
    },
    contactInfo: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.path('businessName').validate(function (value) {
  if (this.role === 'Dealer' || this.role === 'Supplier') {
    return Boolean(value && value.trim());
  }

  return true;
}, 'businessName is required for Dealer and Supplier');

module.exports = mongoose.model('User', userSchema);
