const express = require('express');
const router = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const RestaurantOwner = require('../models/RestaurantOwner');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { logoUpload } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

router.use(authenticate, requireOwner);

// ─── Helper: get restaurant and verify ownership ────────────────────────────
const getOwnedRestaurant = async (ownerId) => {
  const owner = await RestaurantOwner.findById(ownerId);
  if (!owner?.restaurant) return null;
  return Restaurant.findById(owner.restaurant);
};

// ─── Get Profile ────────────────────────────────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const populated = await restaurant.populate([
      { path: 'whatsappConfig', select: 'signupStatus botEnabled wabaId phoneNumberId targetBusinessNumber configuredAt' },
    ]);
    res.json(populated);
  } catch (err) { next(err); }
});

// ─── Update Profile ─────────────────────────────────────────────────────────
router.patch('/profile', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const allowed = ['name', 'description', 'address', 'workingHours', 'categories', 'email', 'phone', 'businessType'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    });
    await restaurant.save();
    res.json(restaurant);
  } catch (err) { next(err); }
});

// ─── Upload Logo ─────────────────────────────────────────────────────────────
router.post('/logo', logoUpload, async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (restaurant.logoPublicId) {
      await cloudinary.uploader.destroy(restaurant.logoPublicId).catch(() => {});
    }

    restaurant.logoUrl = req.file.path;
    restaurant.logoPublicId = req.file.filename;
    await restaurant.save();

    res.json({ logoUrl: restaurant.logoUrl });
  } catch (err) { next(err); }
});

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const restaurantId = restaurant._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalOrders, todayOrders, pendingOrders, totalCustomers, monthRevenue, allTimeRevenue, topItems] = await Promise.all([
      Order.countDocuments({ restaurant: restaurantId }),
      Order.countDocuments({ restaurant: restaurantId, createdAt: { $gte: today } }),
      Order.countDocuments({ restaurant: restaurantId, status: 'pending' }),
      Customer.countDocuments({ restaurant: restaurantId }),
      Order.aggregate([
        { $match: { restaurant: restaurantId, createdAt: { $gte: thisMonth }, $or: [{ paymentStatus: 'paid' }, { status: 'delivered' }] } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { restaurant: restaurantId, $or: [{ paymentStatus: 'paid' }, { status: 'delivered' }] } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { restaurant: restaurantId } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      totalOrders, todayOrders, pendingOrders, totalCustomers,
      monthRevenue: monthRevenue[0]?.total || 0,
      totalRevenue: allTimeRevenue[0]?.total || 0,
      topItems: topItems.map(i => ({ name: i._id, count: i.count })),
    });
  } catch (err) { next(err); }
});

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const { page = 1, limit = 20, status } = req.query;
    const query = { restaurant: restaurant._id };
    if (status) query.status = status;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: orders, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// ─── Update Order Status ──────────────────────────────────────────────────────
router.patch('/orders/:orderId/status', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    const { status } = req.body;
    const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await Order.findOne({ _id: req.params.orderId, restaurant: restaurant._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    order.statusHistory.push({ status, changedBy: req.user.email });
    await order.save();

    const { sendOrderUpdateToCustomer } = require('../services/notificationService');
    const waConfig = await WhatsAppConfig.findOne({ restaurant: restaurant._id }).select('+accessToken');
    if (waConfig?.phoneNumberId) {
      await sendOrderUpdateToCustomer(
        waConfig.phoneNumberId, waConfig.accessToken, order.customerNumber, order, restaurant.name
      ).catch(() => {});
    }

    res.json(order);
  } catch (err) { next(err); }
});

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    const customers = await Customer.find({ restaurant: restaurant._id })
      .sort({ totalOrders: -1 })
      .select('-botSession')
      .lean();

    // Aggregate real order stats per customer phone number for this restaurant
    const orderStats = await Order.aggregate([
      { $match: { restaurant: restaurant._id } },
      {
        $group: {
          _id: '$customerNumber',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]);
    const statsMap = {};
    orderStats.forEach(s => { statsMap[s._id] = s; });

    // Merge real stats into customer records
    const enriched = customers.map(c => {
      const s = statsMap[c.whatsappNumber];
      if (s) {
        c.totalOrders = s.totalOrders;
        c.totalSpent = s.totalSpent;
        c.lastOrderAt = s.lastOrderAt;
      }
      return c;
    });

    // Re-sort by real totalOrders descending
    enriched.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));

    res.json(enriched);
  } catch (err) { next(err); }
});

// ─── WhatsApp Config / Bot Status ─────────────────────────────────────────────
router.get('/whatsapp', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    const waConfig = await WhatsAppConfig.findOne({ restaurant: restaurant._id });
    res.json(waConfig || { signupStatus: 'pending', botEnabled: false });
  } catch (err) { next(err); }
});

router.patch('/whatsapp/bot', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    const { botEnabled } = req.body;
    if (typeof botEnabled !== 'boolean') return res.status(400).json({ error: 'botEnabled must be a boolean' });

    const waConfig = await WhatsAppConfig.findOneAndUpdate(
      { restaurant: restaurant._id, signupStatus: 'configured' },
      { botEnabled },
      { new: true }
    );
    if (!waConfig) return res.status(400).json({ error: 'WhatsApp not configured yet' });
    res.json({ botEnabled: waConfig.botEnabled });
  } catch (err) { next(err); }
});

// ─── Sync WhatsApp Business Profile ──────────────────────────────────────────
// Updates business name, description, address, email, logo, hours in WhatsApp app
router.post('/sync-whatsapp-profile', async (req, res, next) => {
  try {
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const waConfig = await WhatsAppConfig.findOne({ restaurant: restaurant._id }).select('+accessToken');

    if (!waConfig || !waConfig.phoneNumberId || waConfig.phoneNumberId === 'PENDING' || waConfig.phoneNumberId === 'NOT_FOUND') {
      return res.status(400).json({ error: 'WhatsApp not configured yet. Complete the Meta setup first.' });
    }

    if (waConfig.signupStatus !== 'configured') {
      return res.status(400).json({ error: 'WhatsApp setup is not complete' });
    }

    const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;
    const { setupFullBusinessProfile } = require('../services/whatsappProfileService');
    const results = await setupFullBusinessProfile(restaurant, waConfig.phoneNumberId, token);

    res.json({
      message: 'WhatsApp Business profile synced successfully!',
      updated: {
        name: restaurant.name,
        description: restaurant.description ? 'updated' : 'skipped',
        address: restaurant.address ? 'updated' : 'skipped',
        email: restaurant.email ? 'updated' : 'skipped',
        photo: restaurant.logoUrl ? (results.photo || 'attempted') : 'no logo set',
        category: restaurant.businessType?.toUpperCase() || 'OTHER',
      },
      errors: results.errors || [],
    });
  } catch (err) { next(err); }
});

// ─── Owner Broadcast ────────────────────────────────────────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { customerIds, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one customer' });
    }

    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const waConfig = await WhatsAppConfig.findOne({ restaurant: restaurant._id }).select('+accessToken');
    if (!waConfig?.phoneNumberId || waConfig.phoneNumberId === 'PENDING') {
      return res.status(400).json({ error: 'WhatsApp not configured. Complete setup first.' });
    }

    const customers = await Customer.find({
      _id: { $in: customerIds },
      restaurant: restaurant._id,
    }).select('whatsappNumber');

    const { sendTextMessage } = require('../services/whatsappService');
    const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;
    const broadcastMsg = `📢 *${restaurant.name}*\n\n${message.trim()}`;

    let sent = 0, failed = 0;
    for (const customer of customers) {
      try {
        await sendTextMessage(waConfig.phoneNumberId, token, customer.whatsappNumber, broadcastMsg);
        sent++;
      } catch { failed++; }
    }

    res.json({ sent, failed, total: customers.length });
  } catch (err) { next(err); }
});

// ─── Manual WhatsApp Activation (Owner) ─────────────────────────────────────
router.post('/whatsapp/manual-activate', async (req, res, next) => {
  try {
    const { wabaId, phoneNumberId, accessToken } = req.body;
    if (!wabaId || !phoneNumberId) {
      return res.status(400).json({ error: 'wabaId and phoneNumberId are required' });
    }
    const restaurant = await getOwnedRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const { manualActivation } = require('../services/embeddedSignupService');
    const waConfig = await manualActivation(restaurant._id.toString(), {
      wabaId,
      phoneNumberId,
      accessToken: accessToken || process.env.MAIN_ACCESS_TOKEN,
      signupMode: 'cloud_api',
    });

    res.json({
      message: 'WhatsApp activated successfully!',
      wabaId: waConfig.wabaId,
      phoneNumberId: waConfig.phoneNumberId,
      botEnabled: waConfig.botEnabled,
    });
  } catch (err) { next(err); }
});

module.exports = router;