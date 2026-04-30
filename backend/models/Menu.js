const mongoose = require('mongoose');

// ─── Catalog Category ──────────────────────────────────────────────────────
const catalogCategorySchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true, trim: true },
  description: String,
  imageUrl: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

catalogCategorySchema.index({ restaurant: 1 });

// ─── Catalog Item (Product or Service) ──────────────────────────────────────
const catalogItemSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  name: { type: String, required: true, trim: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  // Product/Service classification
  type: { type: String, enum: ['product', 'service'], default: 'product' },
  // Service-specific fields
  duration: { type: Number, default: null },   // duration in minutes (for services)
  unit: { type: String, default: null },        // e.g. 'per hour', 'per session', 'per kg'
  imageUrl: String,
  imagePublicId: String,
  isAvailable: { type: Boolean, default: true },
  isVeg: { type: Boolean, default: false },
  allergens: [String],
  sortOrder: { type: Number, default: 0 },
  // Stats
  totalOrdered: { type: Number, default: 0 },
}, { timestamps: true });

catalogItemSchema.index({ restaurant: 1, category: 1 });
catalogItemSchema.index({ restaurant: 1, isAvailable: 1 });

module.exports = {
  MenuCategory: mongoose.model('MenuCategory', catalogCategorySchema),
  MenuItem: mongoose.model('MenuItem', catalogItemSchema),
};
