require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const RestaurantOwner = require('../models/RestaurantOwner');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const { MenuCategory, MenuItem } = require('../models/Menu');
const { generateTenantId } = require('./helpers');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
};

const seed = async () => {
  await connectDB();

  // ─── Super Admin ───────────────────────────────────────────────────────────
  const existingAdmin = await Admin.findOne({ email: process.env.SEED_ADMIN_EMAIL });
  if (!existingAdmin) {
    await Admin.create({
      name: process.env.SEED_ADMIN_NAME || 'Platform Admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@ChatServe.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234!',
      role: 'super_admin',
    });
    console.log(`✅ Super admin created: ${process.env.SEED_ADMIN_EMAIL}`);
  } else {
    console.log('ℹ️  Super admin already exists');
  }

  // ─── Demo Restaurant ───────────────────────────────────────────────────────
  const existingOwner = await RestaurantOwner.findOne({ email: 'demo@spicegarden.com' });
  if (!existingOwner) {
    const owner = await RestaurantOwner.create({
      name: 'Raj Patel',
      email: 'demo@spicegarden.com',
      password: 'Demo@1234!',
      whatsappNumber: '919876543210',
    });

    const restaurant = await Restaurant.create({
      owner: owner._id,
      name: 'Spice Garden',
      description: 'Authentic Indian cuisine with a modern twist. Family restaurant since 1995.',
      address: 'Shop 12, SG Mall, Ahmedabad, Gujarat 380015',
      email: 'demo@spicegarden.com',
      phone: '+91 98765 43210',
      categories: ['North Indian', 'South Indian', 'Chinese', 'Beverages', 'Desserts'],
      businessType: 'food',
      status: 'active',
      tenantId: generateTenantId('Spice Garden'),
      workingHours: [
        { day: 'monday', open: '11:00', close: '22:00', isOpen: true },
        { day: 'tuesday', open: '11:00', close: '22:00', isOpen: true },
        { day: 'wednesday', open: '11:00', close: '22:00', isOpen: true },
        { day: 'thursday', open: '11:00', close: '22:00', isOpen: true },
        { day: 'friday', open: '11:00', close: '23:00', isOpen: true },
        { day: 'saturday', open: '10:00', close: '23:00', isOpen: true },
        { day: 'sunday', open: '10:00', close: '22:00', isOpen: true },
      ],
    });

    owner.restaurant = restaurant._id;
    await owner.save();

    const waConfig = await WhatsAppConfig.create({
      restaurant: restaurant._id,
      targetBusinessNumber: '+91 98765 43210',
      normalizedNumber: '919876543210',
      signupStatus: 'configured',
      botEnabled: true,
      wabaId: 'DEMO_WABA_ID',
      phoneNumberId: 'DEMO_PHONE_NUMBER_ID',
      configuredAt: new Date(),
      botInitializedAt: new Date(),
    });

    restaurant.whatsappConfig = waConfig._id;
    await restaurant.save();

    // ─── Menu ──────────────────────────────────────────────────────────────
    const northIndian = await MenuCategory.create({ restaurant: restaurant._id, name: 'North Indian', sortOrder: 1 });
    const chinese = await MenuCategory.create({ restaurant: restaurant._id, name: 'Chinese', sortOrder: 2 });
    const beverages = await MenuCategory.create({ restaurant: restaurant._id, name: 'Beverages', sortOrder: 3 });
    const desserts = await MenuCategory.create({ restaurant: restaurant._id, name: 'Desserts', sortOrder: 4 });

    await MenuItem.insertMany([
      { restaurant: restaurant._id, category: northIndian._id, name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', price: 320, isVeg: false, sortOrder: 1 },
      { restaurant: restaurant._id, category: northIndian._id, name: 'Paneer Butter Masala', description: 'Rich paneer in buttery tomato gravy', price: 280, isVeg: true, sortOrder: 2 },
      { restaurant: restaurant._id, category: northIndian._id, name: 'Dal Makhani', description: 'Slow-cooked black lentils', price: 220, isVeg: true, sortOrder: 3 },
      { restaurant: restaurant._id, category: northIndian._id, name: 'Garlic Naan', description: 'Soft bread with garlic and butter', price: 60, isVeg: true, sortOrder: 4 },
      { restaurant: restaurant._id, category: northIndian._id, name: 'Biryani - Chicken', description: 'Fragrant basmati rice with spiced chicken', price: 380, isVeg: false, sortOrder: 5 },
      { restaurant: restaurant._id, category: chinese._id, name: 'Veg Manchurian', description: 'Crispy veggie balls in manchurian sauce', price: 200, isVeg: true, sortOrder: 1 },
      { restaurant: restaurant._id, category: chinese._id, name: 'Chilli Paneer', description: 'Spicy paneer Indo-Chinese style', price: 260, isVeg: true, sortOrder: 2 },
      { restaurant: restaurant._id, category: chinese._id, name: 'Hakka Noodles', description: 'Stir-fried noodles with veggies', price: 180, isVeg: true, sortOrder: 3 },
      { restaurant: restaurant._id, category: beverages._id, name: 'Mango Lassi', description: 'Sweet yogurt-based mango drink', price: 80, isVeg: true, sortOrder: 1 },
      { restaurant: restaurant._id, category: beverages._id, name: 'Masala Chai', description: 'Spiced Indian tea', price: 40, isVeg: true, sortOrder: 2 },
      { restaurant: restaurant._id, category: beverages._id, name: 'Fresh Lime Soda', description: 'Refreshing lime with soda', price: 60, isVeg: true, sortOrder: 3 },
      { restaurant: restaurant._id, category: desserts._id, name: 'Gulab Jamun', description: 'Soft milk-solid balls in sugar syrup', price: 80, isVeg: true, sortOrder: 1 },
      { restaurant: restaurant._id, category: desserts._id, name: 'Kulfi', description: 'Traditional Indian ice cream', price: 100, isVeg: true, sortOrder: 2 },
    ]);

    console.log('✅ Demo restaurant "Spice Garden" created');
    console.log('   Owner email: demo@spicegarden.com');
    console.log('   Owner password: Demo@1234!');
  } else {
    console.log('ℹ️  Demo restaurant already exists');
  }

  console.log('\n🚀 Seed complete!');
  console.log(`\nAdmin login: ${process.env.SEED_ADMIN_EMAIL} / ${process.env.SEED_ADMIN_PASSWORD}`);
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
