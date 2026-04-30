const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: Number,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerNumber: { type: String, required: true },
  customerName: String,
  orderNumber: { type: String, unique: true },
  // Order classification: purchase (products) or booking (services)
  orderType: { type: String, enum: ['purchase', 'booking'], default: 'purchase' },
  fulfillmentType: { type: String, enum: ['delivery', 'pickup', 'on_site', 'remote'], default: 'pickup' },
  deliveryAddress: String,
  notes: String,
  items: [orderItemSchema],
  subtotal: Number,
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'upi', 'stripe', 'pending'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  stripePaymentIntentId: String,
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: String,
  }],
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments({ restaurant: this.restaurant });
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
  // Calculate subtotal per item
  this.items = this.items.map(item => ({
    ...item,
    subtotal: item.price * item.quantity,
  }));
  this.subtotal = this.items.reduce((sum, i) => sum + i.subtotal, 0);
  this.total = this.subtotal + (this.tax || 0);
  next();
});

orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ customerNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
