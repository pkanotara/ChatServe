const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Change Stream watcher for the Restaurant collection.
 *
 * When a restaurant is deleted directly from MongoDB Compass (or any other
 * external tool), this watcher detects the 'delete' event and triggers a
 * cascade cleanup of all related data (owner, menu items, orders, customers,
 * WhatsApp config, onboarding sessions, logs).
 *
 * ⚠️ Requires a MongoDB Replica Set or Atlas cluster (Change Streams are not
 *   available on standalone MongoDB instances).
 */
function startRestaurantWatcher() {
  const db = mongoose.connection;

  // Wait for the connection to be ready
  if (db.readyState !== 1) {
    db.once('open', () => _initWatcher(db));
  } else {
    _initWatcher(db);
  }
}

function _initWatcher(db) {
  try {
    const collection = db.collection('restaurants');

    // Watch only for delete operations
    const changeStream = collection.watch(
      [{ $match: { operationType: 'delete' } }],
      { fullDocument: 'updateLookup' }
    );

    changeStream.on('change', async (change) => {
      const deletedId = change.documentKey._id;
      logger.info(`🔄 Change Stream: Restaurant ${deletedId} was deleted externally. Cleaning up related data…`);

      try {
        const { cascadeDeleteRestaurant } = require('../utils/cascadeDelete');
        await cascadeDeleteRestaurant(deletedId);
        logger.info(`✅ Change Stream: Cascade cleanup complete for restaurant ${deletedId}`);
      } catch (err) {
        logger.error(`❌ Change Stream: Cascade cleanup failed for restaurant ${deletedId}:`, err.message);
      }
    });

    changeStream.on('error', (err) => {
      // Change Streams require a replica set / Atlas.
      // On standalone instances this will fail gracefully.
      if (err.code === 40573 || err.codeName === 'InvalidOptions' || err.message?.includes('replica set')) {
        logger.warn(
          '⚠️  Change Streams not available (standalone MongoDB). ' +
          'Cascade delete on Compass removal will NOT work automatically. ' +
          'Use the Admin API DELETE /api/admin/restaurants/:id endpoint instead.'
        );
      } else {
        logger.error('Change Stream error:', err.message);
      }
    });

    logger.info('👀 Restaurant Change Stream watcher started — external deletions will cascade automatically');
  } catch (err) {
    logger.warn('Could not start Change Stream watcher:', err.message);
  }
}

module.exports = { startRestaurantWatcher };
