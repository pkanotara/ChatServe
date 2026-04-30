const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const BusinessOwner = require('../models/RestaurantOwner');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const Order = require('../models/Order');
const { BroadcastLog, ActivityLog } = require('../models/Logs');
const { paginationMeta } = require('../utils/helpers');
const { sendFromMainBot } = require('../services/whatsappService');
const { sendPasswordResetEmail } = require('../services/emailService');

router.use(authenticate, requireAdmin);

// ─── Platform Stats ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [totalRestaurants, activeRestaurants, pendingRestaurants, totalOrders, owners] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ status: 'active' }),
      Restaurant.countDocuments({ status: 'pending_meta' }),
      Order.countDocuments(),
      BusinessOwner.countDocuments(),
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const startOfMonth = new Date(new Date().setDate(1));
    startOfMonth.setHours(0, 0, 0, 0);
    const ordersThisMonth = await Order.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.json({
      totalRestaurants, activeRestaurants, pendingRestaurants,
      totalOrders, ordersThisMonth,
      totalOwners: owners,
      totalRevenue: revenueAgg[0]?.total || 0,
    });
  } catch (err) { next(err); }
});

// ─── List All Restaurants ───────────────────────────────────────────────────
router.get('/restaurants', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await Restaurant.countDocuments(query);
    const restaurants = await Restaurant.find(query)
      .populate('owner', 'name email whatsappNumber')
      .populate('whatsappConfig', 'signupStatus botEnabled wabaId phoneNumberId targetBusinessNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: restaurants, meta: paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

// ─── Get Single Restaurant ──────────────────────────────────────────────────
router.get('/restaurants/:id', async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'name email whatsappNumber lastLogin')
      .populate('whatsappConfig');
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) { next(err); }
});

// ─── Activate / Deactivate Restaurant ──────────────────────────────────────
router.patch('/restaurants/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id, { status, isActive: status === 'active' }, { new: true }
    );
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    if (restaurant.whatsappConfig) {
      await WhatsAppConfig.findByIdAndUpdate(restaurant.whatsappConfig, {
        botEnabled: status === 'active',
      });
    }

    await ActivityLog.create({
      actor: req.user.id, actorRole: 'super_admin', actorName: 'Admin',
      restaurant: restaurant._id, action: `restaurant_status_changed_to_${status}`,
    });

    res.json(restaurant);
  } catch (err) { next(err); }
});

// ─── Delete Restaurant (Cascade) ────────────────────────────────────────────
// Permanently removes a restaurant AND all its related data:
//   Owner, Menu Items/Categories, Orders, Customers, WhatsApp Config,
//   Onboarding Sessions, Broadcast Logs, Activity Logs, Cloudinary images
router.delete('/restaurants/:id', async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const restaurantName = restaurant.name;

    // cascadeDeleteRestaurant handles all related collections + Cloudinary cleanup
    const { cascadeDeleteRestaurant } = require('../utils/cascadeDelete');
    const summary = await cascadeDeleteRestaurant(restaurant._id);

    // Delete the restaurant document itself using direct MongoDB driver
    // to avoid re-triggering the Mongoose cascade middleware
    const mongoose = require('mongoose');
    await mongoose.connection.collection('restaurants').deleteOne({ _id: restaurant._id });

    res.json({
      message: `Restaurant "${restaurantName}" and all related data permanently deleted`,
      deleted: summary,
    });
  } catch (err) { next(err); }
});

// ─── All Orders (Platform-Wide) ─────────────────────────────────────────────
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, restaurantId, status } = req.query;
    const query = {};
    if (restaurantId) query.restaurant = restaurantId;
    if (status) query.status = status;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: orders, meta: paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

// ─── Broadcast (Platform-Wide) ──────────────────────────────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { message, restaurantIds } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    let ownerQuery = {};
    // Support array of restaurant IDs or legacy single restaurantId
    if (Array.isArray(restaurantIds) && restaurantIds.length > 0) {
      ownerQuery.restaurant = { $in: restaurantIds };
    } else if (req.body.restaurantId) {
      ownerQuery.restaurant = req.body.restaurantId;
    }

    const owners = await BusinessOwner.find(ownerQuery).select('whatsappNumber name');
    if (owners.length === 0) return res.status(400).json({ error: 'No recipients found' });

    const broadcastLog = await BroadcastLog.create({
      sentBy: req.user.id, sentByRole: 'super_admin',
      message, recipients: owners.map(o => o.whatsappNumber),
      status: 'processing',
    });

    let sent = 0, failed = 0;
    for (const owner of owners) {
      try {
        await sendFromMainBot(owner.whatsappNumber, `📢 *ChatServe Update*\n\n${message}`);
        sent++;
      } catch { failed++; }
    }

    await BroadcastLog.findByIdAndUpdate(broadcastLog._id, {
      status: 'completed', totalSent: sent, completedAt: new Date(),
    });

    res.json({ sent, failed, total: owners.length });
  } catch (err) { next(err); }
});

// ─── Activity Logs ───────────────────────────────────────────────────────────
router.get('/activity-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await ActivityLog.countDocuments();
    const logs = await ActivityLog.find()
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ data: logs, meta: paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

// ─── WhatsApp Configs ────────────────────────────────────────────────────────
router.get('/whatsapp-configs', async (req, res, next) => {
  try {
    const configs = await WhatsAppConfig.find()
      .populate('restaurant', 'name status');
    res.json(configs);
  } catch (err) { next(err); }
});

// ─── Manual WhatsApp Activation ──────────────────────────────────────────────
// Activates a restaurant's WhatsApp AND auto-configures their business profile
router.post('/restaurants/:id/activate-whatsapp', async (req, res, next) => {
  try {
    const { wabaId, phoneNumberId, accessToken } = req.body;
    if (!wabaId || !phoneNumberId) {
      return res.status(400).json({ error: 'wabaId and phoneNumberId are required' });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const { manualActivation } = require('../services/embeddedSignupService');
    const waConfig = await manualActivation(req.params.id, { wabaId, phoneNumberId, accessToken });

    res.json({
      message: `${restaurant.name} — WhatsApp activated and business profile configured!`,
      wabaId: waConfig.wabaId,
      phoneNumberId: waConfig.phoneNumberId,
      botEnabled: waConfig.botEnabled,
      status: waConfig.signupStatus,
    });
  } catch (err) { next(err); }
});

// ─── Refresh WhatsApp Business Profile ───────────────────────────────────────
// Re-syncs restaurant details (name, description, address, logo, hours) to WhatsApp
router.post('/restaurants/:id/refresh-profile', async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const waConfig = await WhatsAppConfig.findOne({ restaurant: req.params.id }).select('+accessToken');
    if (!waConfig || !waConfig.phoneNumberId || waConfig.phoneNumberId === 'PENDING') {
      return res.status(400).json({ error: 'WhatsApp not configured for this restaurant' });
    }

    const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;
    const { setupFullBusinessProfile } = require('../services/whatsappProfileService');
    const results = await setupFullBusinessProfile(restaurant, waConfig.phoneNumberId, token);

    await ActivityLog.create({
      actor: req.user.id, actorRole: 'super_admin', actorName: 'Admin',
      restaurant: req.params.id, action: 'whatsapp_profile_refreshed',
    }).catch(() => {});

    res.json({
      message: `WhatsApp Business profile refreshed for ${restaurant.name}`,
      results,
    });
  } catch (err) { next(err); }
});

// ─── Get WhatsApp Business Profile from Meta ──────────────────────────────────
// Fetches the live profile data directly from Meta API
router.get('/restaurants/:id/whatsapp-profile', async (req, res, next) => {
  try {
    const waConfig = await WhatsAppConfig.findOne({ restaurant: req.params.id }).select('+accessToken');
    if (!waConfig?.phoneNumberId || waConfig.phoneNumberId === 'PENDING') {
      return res.status(400).json({ error: 'WhatsApp not configured for this restaurant' });
    }

    const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;
    const { getWhatsAppBusinessProfile } = require('../services/whatsappProfileService');
    const profile = await getWhatsAppBusinessProfile(waConfig.phoneNumberId, token);

    res.json(profile);
  } catch (err) { next(err); }
});

// ─── Test Send Message from Restaurant's Number ───────────────────────────────
router.post('/restaurants/:id/test-send', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });

    const waConfig = await WhatsAppConfig.findOne({ restaurant: req.params.id }).select('+accessToken');
    if (!waConfig?.phoneNumberId || waConfig.phoneNumberId === 'PENDING') {
      return res.status(400).json({ error: 'WhatsApp not configured for this restaurant' });
    }

    const { sendTextMessage } = require('../services/whatsappService');
    const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;
    await sendTextMessage(waConfig.phoneNumberId, token, to, message);

    res.json({ message: `Test message sent to ${to} from restaurant's WhatsApp number` });
  } catch (err) { next(err); }
});

// ─── Reset Restaurant Owner Password ────────────────────────────────────────
router.post('/restaurants/:ownerId/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const owner = await BusinessOwner.findById(req.params.ownerId).populate('restaurant', 'name');
    if (!owner) return res.status(404).json({ error: 'Restaurant owner not found' });

    // Invalidate existing sessions by clearing the refresh token
    owner.password = newPassword;
    owner.refreshToken = null;
    await owner.save();

    const restaurantName = owner.restaurant?.name || 'Unknown Restaurant';

    await ActivityLog.create({
      actor: req.user.id,
      actorRole: 'super_admin',
      actorName: req.user.email || 'Admin',
      action: 'restaurant_owner_password_reset',
      restaurant: owner.restaurant?._id || null,
      ipAddress: req.ip,
    });

    // Send email notification (non-fatal if SMTP not configured)
    await sendPasswordResetEmail({
      ownerName: owner.name,
      ownerEmail: owner.email,
      restaurantName,
      newPassword,
      adminName: req.user.email || 'Super Admin',
    });

    res.json({ message: `Password reset successfully for ${owner.name}` });
  } catch (err) { next(err); }
});

module.exports = router;