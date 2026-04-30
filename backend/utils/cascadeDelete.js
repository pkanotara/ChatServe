const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Cascade-delete ALL data related to a restaurant.
 *
 * Collections cleaned:
 *   - RestaurantOwner  (owner doc linked to this restaurant)
 *   - MenuCategory     (catalog categories)
 *   - MenuItem         (catalog items + their Cloudinary images)
 *   - Order            (all orders)
 *   - Customer         (all customer / bot-session records)
 *   - WhatsAppConfig   (WA Business config)
 *   - OnboardingSession(onboarding session that created this restaurant)
 *   - BroadcastLog     (broadcast logs scoped to restaurant)
 *   - ActivityLog      (activity logs scoped to restaurant)
 *
 * @param {mongoose.Types.ObjectId|string} restaurantId
 * @returns {Object} summary of deleted counts per collection
 */
async function cascadeDeleteRestaurant(restaurantId) {
  // Lazy-require models to avoid circular-dependency issues at startup
  const RestaurantOwner = require('../models/RestaurantOwner');
  const { MenuCategory, MenuItem } = require('../models/Menu');
  const Order = require('../models/Order');
  const Customer = require('../models/Customer');
  const WhatsAppConfig = require('../models/WhatsAppConfig');
  const OnboardingSession = require('../models/OnboardingSession');
  const { BroadcastLog, ActivityLog } = require('../models/Logs');

  const id = mongoose.Types.ObjectId.isValid(restaurantId)
    ? restaurantId
    : null;

  if (!id) {
    logger.warn(`cascadeDeleteRestaurant: invalid id "${restaurantId}"`);
    return null;
  }

  logger.info(`🗑️  Cascade-deleting all data for restaurant ${id} …`);

  // Optionally clean up Cloudinary images for menu items
  let cloudinaryCleanup = 0;
  try {
    const cloudinary = require('../config/cloudinary');
    const itemsWithImages = await MenuItem.find({
      restaurant: id,
      imagePublicId: { $exists: true, $ne: null },
    }).select('imagePublicId');

    for (const item of itemsWithImages) {
      try {
        await cloudinary.uploader.destroy(item.imagePublicId);
        cloudinaryCleanup++;
      } catch (e) {
        logger.warn(`Failed to delete Cloudinary image ${item.imagePublicId}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn('Cloudinary cleanup skipped:', e.message);
  }

  // Also clean up restaurant logo from Cloudinary
  try {
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(id).select('logoPublicId');
    if (restaurant?.logoPublicId) {
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(restaurant.logoPublicId).catch(() => {});
    }
  } catch (e) {
    logger.warn('Restaurant logo cleanup skipped:', e.message);
  }

  // Run all deletions in parallel for speed
  const [
    owners,
    categories,
    items,
    orders,
    customers,
    waConfigs,
    sessions,
    broadcasts,
    activities,
  ] = await Promise.all([
    RestaurantOwner.deleteMany({ restaurant: id }),
    MenuCategory.deleteMany({ restaurant: id }),
    MenuItem.deleteMany({ restaurant: id }),
    Order.deleteMany({ restaurant: id }),
    Customer.deleteMany({ restaurant: id }),
    WhatsAppConfig.deleteMany({ restaurant: id }),
    OnboardingSession.deleteMany({ restaurant: id }),
    BroadcastLog.deleteMany({ restaurant: id }),
    ActivityLog.deleteMany({ restaurant: id }),
  ]);

  const summary = {
    restaurantId: id.toString(),
    owners: owners.deletedCount,
    menuCategories: categories.deletedCount,
    menuItems: items.deletedCount,
    orders: orders.deletedCount,
    customers: customers.deletedCount,
    whatsappConfigs: waConfigs.deletedCount,
    onboardingSessions: sessions.deletedCount,
    broadcastLogs: broadcasts.deletedCount,
    activityLogs: activities.deletedCount,
    cloudinaryImages: cloudinaryCleanup,
  };

  logger.info('✅ Cascade delete complete:', JSON.stringify(summary));
  return summary;
}

module.exports = { cascadeDeleteRestaurant };
