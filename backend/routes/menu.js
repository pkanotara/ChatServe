const express = require('express');
const router = express.Router();
const { authenticate, requireOwner, requireAdmin } = require('../middleware/auth');
const { MenuCategory, MenuItem } = require('../models/Menu');
const BusinessOwner = require('../models/RestaurantOwner');
const { menuItemUpload } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// ─── Helper ─────────────────────────────────────────────────────────────────
const getRestaurantId = async (req) => {
  if (req.user.role === 'super_admin') return req.params.restaurantId || req.query.restaurantId;
  const owner = await BusinessOwner.findById(req.user.id);
  return owner?.restaurant?.toString();
};

// ─── Public: Get Menu (for chatbot/public display) ──────────────────────────
router.get('/public/:restaurantId', async (req, res, next) => {
  try {
    const categories = await MenuCategory.find({ restaurant: req.params.restaurantId, isActive: true }).sort('sortOrder');
    const items = await MenuItem.find({ restaurant: req.params.restaurantId, isAvailable: true }).sort('sortOrder');

    const menu = categories.map(cat => ({
      ...cat.toObject(),
      items: items.filter(i => i.category.toString() === cat._id.toString()),
    }));
    res.json(menu);
  } catch (err) { next(err); }
});

router.use(authenticate);

// ─── Categories ─────────────────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const categories = await MenuCategory.find({ restaurant: restaurantId }).sort('sortOrder');
    res.json(categories);
  } catch (err) { next(err); }
});

router.post('/categories', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    const category = await MenuCategory.create({ restaurant: restaurantId, name, description });
    res.status(201).json(category);
  } catch (err) { next(err); }
});

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const category = await MenuCategory.findOneAndUpdate(
      { _id: req.params.id, restaurant: restaurantId },
      req.body, { new: true }
    );
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    await MenuCategory.findOneAndDelete({ _id: req.params.id, restaurant: restaurantId });
    await MenuItem.deleteMany({ category: req.params.id, restaurant: restaurantId });
    res.json({ message: 'Category and its items deleted' });
  } catch (err) { next(err); }
});

// ─── Items ───────────────────────────────────────────────────────────────────
router.get('/items', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const { categoryId } = req.query;
    const query = { restaurant: restaurantId };
    if (categoryId) query.category = categoryId;
    const items = await MenuItem.find(query).populate('category', 'name').sort('sortOrder');
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/items', menuItemUpload, async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const { name, description, price, category, isVeg, type, duration, unit } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: 'name, price, and category required' });

    const itemData = {
      restaurant: restaurantId,
      category,
      name,
      description,
      price: parseFloat(price),
      imageUrl: req.file?.path,
      imagePublicId: req.file?.filename,
    };
    if (type) itemData.type = type;
    if (duration) itemData.duration = parseInt(duration);
    if (unit) itemData.unit = unit;
    if (isVeg !== undefined) itemData.isVeg = isVeg === 'true';

    const item = await MenuItem.create(itemData);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.patch('/items/:id', menuItemUpload, async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const item = await MenuItem.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const { name, description, price, category, isAvailable, isVeg, sortOrder, type, duration, unit } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = parseFloat(price);
    if (category !== undefined) item.category = category;
    if (isAvailable !== undefined) item.isAvailable = isAvailable === 'true' || isAvailable === true;
    if (isVeg !== undefined) item.isVeg = isVeg === 'true';
    if (sortOrder !== undefined) item.sortOrder = parseInt(sortOrder);
    if (type !== undefined) item.type = type;
    if (duration !== undefined) item.duration = duration ? parseInt(duration) : null;
    if (unit !== undefined) item.unit = unit || null;

    if (req.file) {
      if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId).catch(() => {});
      item.imageUrl = req.file.path;
      item.imagePublicId = req.file.filename;
    }

    await item.save();
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    const restaurantId = await getRestaurantId(req);
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurant: restaurantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId).catch(() => {});
    res.json({ message: 'Item deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
