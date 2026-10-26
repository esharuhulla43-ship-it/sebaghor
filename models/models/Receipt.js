const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiptNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerAddress: { type: String, default: '' },
  smsAccount: { type: String, default: '' },
  customerMobile: { type: String, default: '' },
  transactionId: { type: String, default: '' },
  billAmount: { type: Number, required: true },
  chargeAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  dateTime: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receipt', receiptSchema);