const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  day: { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
  open: String,   // "09:00"
  close: String,  // "22:00"
  isOpen: { type: Boolean, default: true },
}, { _id: false });

const restaurantSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOwner', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  address: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  logoUrl: String,
  logoPublicId: String,
  workingHours: [workingHoursSchema],
  foodCategories: [String],
  status: {
    type: String,
    enum: ['onboarding', 'pending_meta', 'active', 'inactive', 'suspended'],
    default: 'onboarding',
  },
  // WhatsApp Business config - populated after Embedded Signup
  whatsappConfig: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppConfig' },
  // Tenant isolation key
  tenantId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  // Analytics helpers
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
}, { timestamps: true });

restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ status: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
