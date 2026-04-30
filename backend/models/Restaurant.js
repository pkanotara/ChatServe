const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  day: { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
  open: String,   // "09:00"
  close: String,  // "22:00"
  isOpen: { type: Boolean, default: true },
}, { _id: false });

const businessSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOwner', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  address: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  logoUrl: String,
  logoPublicId: String,
  workingHours: [workingHoursSchema],
  categories: [String],
  businessType: {
    type: String,
    enum: ['retail', 'service', 'food', 'freelance', 'other'],
    default: 'other',
  },
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

businessSchema.index({ owner: 1 });
businessSchema.index({ status: 1 });

// ─── Cascade Delete Middleware ──────────────────────────────────────────────
// Triggers when Restaurant is deleted via findOneAndDelete, findByIdAndDelete,
// or deleteOne. Removes all related data (owner, menu, orders, customers, etc.)
businessSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter()).select('_id');
  if (doc) {
    this._cascadeId = doc._id;
  }
});

businessSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const { cascadeDeleteRestaurant } = require('../utils/cascadeDelete');
    await cascadeDeleteRestaurant(doc._id);
  }
});

// Also handle document-level deleteOne()
businessSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const { cascadeDeleteRestaurant } = require('../utils/cascadeDelete');
  await cascadeDeleteRestaurant(this._id);
});

module.exports = mongoose.model('Restaurant', businessSchema);
