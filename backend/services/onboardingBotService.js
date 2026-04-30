// require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
// const OnboardingSession = require("../models/OnboardingSession");
// const Restaurant = require("../models/Restaurant");
// const RestaurantOwner = require("../models/RestaurantOwner");
// const WhatsAppConfig = require("../models/WhatsAppConfig");
// const { MenuCategory, MenuItem } = require("../models/Menu");
// const { sendFromMainBot, sendButtonFromMainBot } = require("./whatsappService");
// const { normalizePhone, isValidPhone } = require("../utils/phoneUtils");
// const { generateTenantId, generateTempPassword } = require("../utils/helpers");
// const logger = require("../utils/logger");

// /**
//  * Main entry point for inbound messages on the platform's main bot number
//  */
// // const handleOnboardingMessage = async (
// //   senderNumber,
// //   messageText,
// //   messageType,
// //   mediaUrl,
// // ) => {

// const handleOnboardingMessage = async (
//   senderNumber,
//   messageText,
//   messageType,
//   mediaUrl,
//   contacts = []
// ) => {
//   try {
//     // Find active (in_progress) session for this sender
//     let session = await OnboardingSession.findOne({
//       senderNumber,
//       status: "in_progress",
//     });

//     // Handle RESTART command at any point
//     if (messageText?.toLowerCase() === "restart") {
//       if (session) {
//         session.status = "abandoned";
//         await session.save();
//       }
//       const newSession = new OnboardingSession({
//         senderNumber,
//         step: "owner_name",
//         status: "in_progress",
//         data: {},
//       });
//       await newSession.save();
//       await sendFromMainBot(
//         senderNumber,
//         `🔄 Starting fresh!\n\n*What is your full name?*`,
//       );
//       return;
//     }

//     // Active session exists — continue it
//     if (session) {
//       session.lastMessageAt = new Date();
//       await processStep(session, messageText, messageType, mediaUrl);
//       return;
//     }

//     // No active session — check completed ones
//     // No active session — check for completed ones
//     const completedSessions = await OnboardingSession.find({
//       senderNumber,
//       status: "completed",
//     }).populate("restaurant", "name status");

//     if (completedSessions.length > 0) {
//       // Handle button clicks FIRST before creating any session
//       if (messageText === "add_new_business") {
//         await OnboardingSession.create({
//           senderNumber,
//           step: "owner_name", // ← starts at owner_name directly
//           status: "in_progress",
//           data: {},
//         });
//         await sendFromMainBot(
//           senderNumber,
//           `🍽️ *Let's add a new restaurant!*\n\n*What is your full name?*`,
//         );
//         return; // ← returns before showing menu again
//       }

//       if (messageText === "go_to_dashboard") {
//         await sendDashboardLink(senderNumber);
//         return;
//       }

//       // Only show menu if no button was clicked
//       await showReturningUserMenu(senderNumber, completedSessions);
//       return;
//     }

//     // Brand new user
//     const newSession = new OnboardingSession({
//       senderNumber,
//       step: "owner_name",
//       status: "in_progress",
//       data: {},
//     });
//     await newSession.save();
//     await sendWelcome(senderNumber);
//   } catch (err) {
//     logger.error("handleOnboardingMessage error:", err.response?.data || err.message, err.stack);
//     await sendFromMainBot(
//       senderNumber,
//       `⚠️ Error: ${err.message}\n\nType *RESTART* to start over.`,
//     ).catch(() => {});
//   }
// };

// const showReturningUserMenu = async (senderNumber, completedSessions) => {
//   const bizList = completedSessions
//     .map(
//       (s, i) =>
//         `${i + 1}. *${s.restaurant?.name || "Restaurant"}* — ${(s.restaurant?.status || "pending").replace(/_/g, " ")}`,
//     )
//     .join("\n");
//   await sendButtonFromMainBot(
//     senderNumber,
//     `👋 *Welcome back!*\n\nYour registered restaurants:\n${bizList}\n\nWhat would you like to do?`,
//     [
//       { id: "add_new_business", title: "➕ Add Restaurant" },
//       { id: "go_to_dashboard", title: "📊 Go to Dashboard" },
//     ],
//   );
// };

// const sendDashboardLink = async (senderNumber) => {
//   const owner = await RestaurantOwner.findOne({ whatsappNumber: senderNumber });
//   if (owner) {
//     const maskedEmail = owner.email.replace(
//       /^(.{2})(.*)(@.*)$/,
//       (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c,
//     );
//     await sendFromMainBot(
//       senderNumber,
//       `🔐 *Your Dashboard:*\n\n🌐 URL: ${process.env.FRONTEND_URL}/login\n📧 Email: ${maskedEmail}\n\n_Forgot your password? Use "Forgot Password" on the login page._`,
//     );
//   } else {
//     await sendFromMainBot(
//       senderNumber,
//       `📊 *Dashboard:*\n\n🌐 ${process.env.FRONTEND_URL}/login`,
//     );
//   }
// };

// const sendWelcome = async (to) => {
//   await sendFromMainBot(
//     to,
//     `🍽️ *Welcome to ChatServe!*\n\nI'll help you set up your restaurant on our WhatsApp ordering platform.\n\nThis will take about 5-10 minutes.\n\n*What is your full name?*\n\n_(Type RESTART anytime to start over)_`,
//   );
// };

// const processStep = async (session, text, messageType, mediaUrl) => {
//   const { step, senderNumber } = session;

//   try {
//     switch (step) {
//       case "start":
//       case "owner_name": {
//         if (!text || text.trim().length < 2) {
//           await sendFromMainBot(
//             senderNumber,
//             `Please enter your full name (at least 2 characters).`,
//           );
//           return;
//         }
//         session.data.ownerName = text.trim();
//         session.step = "restaurant_name";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `Nice to meet you, *${session.data.ownerName}*! 👋\n\n*What is your restaurant's name?*`,
//         );
//         break;
//       }

//       case "restaurant_name": {
//         if (!text || text.trim().length < 2) {
//           await sendFromMainBot(
//             senderNumber,
//             `Please enter a valid restaurant name.`,
//           );
//           return;
//         }
//         session.data.restaurantName = text.trim();
//         session.step = "restaurant_whatsapp_number";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `Great! *${session.data.restaurantName}* 🍴\n\n📱 *Which phone number do you want to use as your restaurant's WhatsApp Business number?*\n\nInclude country code (e.g. +91 98765 43210)\n\n⚠️ This is where customers will message to order.`,
//         );
//         break;
//       }

//       case "restaurant_whatsapp_number": {
//         const raw = (text || "").trim();
//         if (!isValidPhone(raw)) {
//           await sendFromMainBot(
//             senderNumber,
//             `❌ Invalid phone number.\n\nPlease include country code:\n+91 98765 43210\n+1 555 123 4567`,
//           );
//           return;
//         }
//         const normalized = normalizePhone(raw);

//         // Check if already registered under a DIFFERENT restaurant
//         const existing = await WhatsAppConfig.findOne({
//           normalizedNumber: normalized,
//         });
//         if (existing) {
//           const existingRestaurant = await Restaurant.findById(
//             existing.restaurant,
//           );
//           if (existingRestaurant) {
//             await sendFromMainBot(
//               senderNumber,
//               `❌ *${raw}* is already registered as *${existingRestaurant.name}*.\n\nPlease use a different number, or type *RESTART* to start over.`,
//             );
//             return;
//           }
//         }

//         session.data.targetBusinessNumber = raw;
//         session.data.normalizedNumber = normalized;
//         session.step = "email";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `✅ Got it! We'll configure *${raw}* as your restaurant's WhatsApp Business number.\n\n📧 *What is your email address?*\n\n(Used to log into your dashboard)`,
//         );
//         break;
//       }

//       case "email": {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test((text || "").trim())) {
//           await sendFromMainBot(
//             senderNumber,
//             `❌ Please enter a valid email address.`,
//           );
//           return;
//         }
//         session.data.email = text.trim().toLowerCase();
//         session.step = "address";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `📍 *What is your restaurant's address?*`,
//         );
//         break;
//       }

//       case "address": {
//         session.data.address = text.trim();
//         session.step = "description";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `📝 *Give a short description of your restaurant*\n\n(e.g., "Family-friendly Indian restaurant specializing in Mughlai cuisine")`,
//         );
//         break;
//       }

//       case "description": {
//         session.data.description = text.trim();
//         session.step = "working_hours";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `🕐 *What are your working hours?*\n\nExample:\nMon-Fri: 11am - 10pm\nSat-Sun: 10am - 11pm\n\nOr type "Always Open" if 24/7`,
//         );
//         break;
//       }

//       case "working_hours": {
//         session.data.workingHours = text.trim();
//         session.step = "food_categories";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `🏷️ *What food categories does your restaurant offer?*\n\nSeparate with commas:\nNorth Indian, Chinese, Desserts, Beverages`,
//         );
//         break;
//       }

//       case "food_categories": {
//         const cats = (text || "")
//           .split(",")
//           .map((c) => c.trim())
//           .filter(Boolean);
//         if (cats.length === 0) {
//           await sendFromMainBot(
//             senderNumber,
//             `Please enter at least one food category.`,
//           );
//           return;
//         }
//         session.data.foodCategories = cats;
//         session.step = "menu_intro";
//         await session.save();
//         await sendButtonFromMainBot(
//           senderNumber,
//           `🍽️ Now let's add your menu items.\n\nYou can add multiple items. Ready?`,
//           [
//             { id: "add_menu_yes", title: "✅ Add Menu Items" },
//             { id: "add_menu_skip", title: "⏭️ Skip for Now" },
//           ],
//         );
//         break;
//       }

//       case "menu_intro": {
//         if (text === "add_menu_skip" || text?.toLowerCase().includes("skip")) {
//           session.step = "logo";
//           await session.save();
//           await askForLogo(senderNumber);
//         } else {
//           session.step = "menu_item_name";
//           session.currentMenuItem = {};
//           await session.save();
//           await sendFromMainBot(
//             senderNumber,
//             `📌 *Item Name?*\n(e.g., Butter Chicken)`,
//           );
//         }
//         break;
//       }

//       case "menu_item_name": {
//         session.currentMenuItem = { name: text.trim() };
//         session.step = "menu_item_description";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `📋 *Short description for "${text.trim()}"?*`,
//         );
//         break;
//       }

//       case "menu_item_description": {
//         session.currentMenuItem.description = text.trim();
//         session.step = "menu_item_price";
//         await session.save();
//         await sendFromMainBot(
//           senderNumber,
//           `💰 *Price for "${session.currentMenuItem.name}"?*\n(Numbers only, e.g., 320)`,
//         );
//         break;
//       }

//       case "menu_item_price": {
//         const price = parseFloat(text);
//         if (isNaN(price) || price <= 0) {
//           await sendFromMainBot(
//             senderNumber,
//             `❌ Please enter a valid price (e.g., 320).`,
//           );
//           return;
//         }
//         session.currentMenuItem.price = price;
//         session.step = "menu_item_category";
//         await session.save();
//         const catList = (session.data.foodCategories || []).join(", ");
//         await sendFromMainBot(
//           senderNumber,
//           `📂 *Category for "${session.currentMenuItem.name}"?*\n\nYour categories: ${catList}`,
//         );
//         break;
//       }

//       case "menu_item_category": {
//         session.currentMenuItem.category = text.trim();
//         session.step = "menu_item_image";
//         await session.save();
//         await sendButtonFromMainBot(
//           senderNumber,
//           `🖼️ *Add an image for "${session.currentMenuItem.name}"?*`,
//           [{ id: "img_skip", title: "⏭️ Skip Image" }],
//         );
//         break;
//       }

//       case "menu_item_image": {
//         if (messageType === "image" && mediaUrl) {
//           session.currentMenuItem.imageUrl = mediaUrl;
//         }
//         if (!session.data.menuItems) session.data.menuItems = [];
//         session.data.menuItems.push({ ...session.currentMenuItem });
//         session.currentMenuItem = {};
//         session.step = "menu_item_more";
//         await session.save();
//         await sendButtonFromMainBot(
//           senderNumber,
//           `✅ *"${session.data.menuItems[session.data.menuItems.length - 1].name}" added!*\n\n${session.data.menuItems.length} item(s) so far.\n\nAdd another?`,
//           [
//             { id: "more_items", title: "➕ Add Another" },
//             { id: "done_items", title: "✅ Done" },
//           ],
//         );
//         break;
//       }

//       case "menu_item_more": {
//         if (text === "more_items" || text?.toLowerCase().includes("add")) {
//           session.step = "menu_item_name";
//           session.currentMenuItem = {};
//           await session.save();
//           await sendFromMainBot(senderNumber, `📌 *Next item name?*`);
//         } else {
//           session.step = "logo";
//           await session.save();
//           await askForLogo(senderNumber);
//         }
//         break;
//       }

//       case "logo": {
//         if (messageType === "image" && mediaUrl) {
//           // mediaUrl is actually a Media ID — download and upload to Cloudinary
//           try {
//             const { downloadAndUploadMedia } = require("./whatsappService");
//             const cloudinaryUrl = await downloadAndUploadMedia(
//               mediaUrl,
//               process.env.MAIN_ACCESS_TOKEN,
//             );
//             session.data.logoUrl = cloudinaryUrl;
//             await sendFromMainBot(
//               senderNumber,
//               `✅ Logo uploaded successfully!`,
//             );
//           } catch (err) {
//             logger.warn("Logo upload failed:", err.message);
//             // Continue without logo
//           }
//         }
//         await finalizeOnboarding(session);
//         break;
//       }

//       default:
//         await sendFromMainBot(
//           senderNumber,
//           `Please continue with the onboarding questions, or type *RESTART* to start over.`,
//         );
//     }
//   } catch (err) {
//     logger.error("finalizeOnboarding error:", err.message, err.stack);
//     await sendFromMainBot(
//       senderNumber,
//       `⚠️ Error: ${err.message}\n\nType *RESTART* to try again.`,
//     ).catch(() => {});
//   }
// };

// const askForLogo = async (to) => {
//   await sendButtonFromMainBot(
//     to,
//     `🖼️ *Would you like to upload your restaurant logo?*\n\nSend an image or skip.`,
//     [{ id: "logo_skip", title: "⏭️ Skip Logo" }],
//   );
// };

// const finalizeOnboarding = async (session) => {
//   const { senderNumber, data } = session;

//   try {
//     await sendFromMainBot(
//       senderNumber,
//       `⏳ Setting up your restaurant... please wait a moment!`,
//     );

//     // 1. Find existing owner by email OR create new
//     let owner = await RestaurantOwner.findOne({ email: data.email });
//     const tempPassword = generateTempPassword();
//     let isNewOwner = false;

//     if (!owner) {
//       isNewOwner = true;
//       owner = new RestaurantOwner({
//         name: data.ownerName,
//         email: data.email,
//         whatsappNumber: senderNumber,
//         password: tempPassword,
//       });
//       await owner.save();
//     }

//     // 2. Create restaurant
//     const tenantId = generateTenantId(data.restaurantName);
//     const restaurant = new Restaurant({
//       owner: owner._id,
//       name: data.restaurantName,
//       description: data.description,
//       address: data.address,
//       email: data.email,
//       phone: data.targetBusinessNumber,
//       logoUrl: data.logoUrl,
//       foodCategories: data.foodCategories || [],
//       status: "pending_meta",
//       tenantId,
//       workingHours: parseWorkingHours(data.workingHours),
//     });
//     await restaurant.save();

//     // 3. Link restaurant to owner
//     if (!owner.restaurant) {
//       owner.restaurant = restaurant._id;
//       await RestaurantOwner.updateOne(
//         { _id: owner._id },
//         { restaurant: restaurant._id },
//       );
//     }

//     // 4. Create WhatsApp config
//     const waConfig = new WhatsAppConfig({
//       restaurant: restaurant._id,
//       targetBusinessNumber: data.targetBusinessNumber,
//       normalizedNumber:
//         data.normalizedNumber || normalizePhone(data.targetBusinessNumber),
//       signupStatus: "pending",
//     });
//     await waConfig.save();

//     restaurant.whatsappConfig = waConfig._id;
//     await restaurant.save();

//     // 5. Create menu categories and items
//     if (data.menuItems && data.menuItems.length > 0) {
//       const categoryMap = {};
//       for (const item of data.menuItems) {
//         if (!categoryMap[item.category]) {
//           const cat = await MenuCategory.create({
//             restaurant: restaurant._id,
//             name: item.category,
//           });
//           categoryMap[item.category] = cat._id;
//         }
//         await MenuItem.create({
//           restaurant: restaurant._id,
//           category: categoryMap[item.category],
//           name: item.name,
//           description: item.description,
//           price: item.price,
//           imageUrl: item.imageUrl,
//         });
//       }
//     }

//     // 6. Generate onboarding link
//     const onboardingLink = `${process.env.FRONTEND_URL}/onboard/${restaurant._id}?token=${Buffer.from(restaurant._id.toString()).toString("base64")}`;

//     // 7. Mark session as completed
//     session.restaurant = restaurant._id;
//     session.owner = owner._id;
//     session.status = "completed";
//     session.completedAt = new Date();
//     session.onboardingLink = onboardingLink;
//     session.onboardingLinkSentAt = new Date();
//     await session.save();

//     // 8. Send success message
//     await sendFromMainBot(
//       senderNumber,
//       `🎉 *${data.restaurantName} is almost live!*\n\n` +
//         `📱 *Final Step — Connect WhatsApp Business:*\n\n` +
//         `Click below and complete Meta verification (2 minutes):\n\n` +
//         `${onboardingLink}\n\n` +
//         `You'll need to:\n✅ Log into Facebook\n✅ Select your Business Account\n✅ Verify: ${data.targetBusinessNumber}\n\n` +
//         `After that, your bot goes live automatically! 🚀`,
//     );

//     // 9. Send credentials (only for new owners)
//     if (isNewOwner) {
//       await sendFromMainBot(
//         senderNumber,
//         `🔐 *Dashboard Login:*\n\nURL: ${process.env.FRONTEND_URL}/login\nEmail: ${data.email}\nPassword: ${tempPassword}\n\n⚠️ Change your password after first login!`,
//       );
//     } else {
//       await sendFromMainBot(
//         senderNumber,
//         `✅ New restaurant added to your existing account!\n\nLog in at: ${process.env.FRONTEND_URL}/login\nEmail: ${data.email}`,
//       );
//     }
//   } catch (err) {
//     logger.error(
//       "finalizeOnboarding error:",
//       err.response?.data || err.message,
//       err.stack,
//     );
//     await sendFromMainBot(
//       senderNumber,
//       `⚠️ Error during setup. Our team has been notified.\n\nType *RESTART* to try again.`,
//     );
//   }
// };

// const parseWorkingHours = (hoursText) => {
//   const days = [
//     "monday",
//     "tuesday",
//     "wednesday",
//     "thursday",
//     "friday",
//     "saturday",
//     "sunday",
//   ];
//   return days.map((day) => ({
//     day,
//     open: "09:00",
//     close: "22:00",
//     isOpen: true,
//   }));
// };

// module.exports = { handleOnboardingMessage };




require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const OnboardingSession = require("../models/OnboardingSession");
const Restaurant = require("../models/Restaurant");
const RestaurantOwner = require("../models/RestaurantOwner");
const WhatsAppConfig = require("../models/WhatsAppConfig");
const { MenuCategory, MenuItem } = require("../models/Menu");
const { sendFromMainBot, sendButtonFromMainBot } = require("./whatsappService");
const { normalizePhone, isValidPhone } = require("../utils/phoneUtils");
const { generateTenantId, generateTempPassword } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * Helpers for WhatsApp profile name
 */
const getWaProfileName = (contacts) => contacts?.[0]?.profile?.name?.trim() || null;

const sendNameConfirm = async (to, waName) => {
  await sendButtonFromMainBot(
    to,
    `Hey 👋 Welcome to ChatServe!\n\nCan I use this as your full name?\n\n*${waName}*`,
    [
      { id: "owner_name_yes", title: "✅ Yes" },
      { id: "owner_name_change", title: "✏️ Change" },
    ]
  );
};

/**
 * Main entry point for inbound messages on the platform's main bot number
 */
const handleOnboardingMessage = async (
  senderNumber,
  messageText,
  messageType,
  mediaUrl,
  contacts = []
) => {
  try {
    // Find active (in_progress) session for this sender
    let session = await OnboardingSession.findOne({
      senderNumber,
      status: "in_progress",
    });

    // Handle RESTART command at any point
    if (messageText?.toLowerCase() === "restart") {
      if (session) {
        session.status = "abandoned";
        await session.save();
      }

      const waName = getWaProfileName(contacts);

      const newSession = new OnboardingSession({
        senderNumber,
        step: waName ? "owner_name_confirm" : "owner_name",
        status: "in_progress",
        data: { waProfileName: waName },
      });

      await newSession.save();

      if (waName) {
        await sendNameConfirm(senderNumber, waName);
      } else {
        await sendFromMainBot(
          senderNumber,
          `🔄 Starting fresh!\n\n*What is your full name?*`,
        );
      }
      return;
    }

    // Active session exists — continue it
    if (session) {
      session.lastMessageAt = new Date();
      await processStep(session, messageText, messageType, mediaUrl);
      return;
    }

    // No active session — check completed ones
    const completedSessions = await OnboardingSession.find({
      senderNumber,
      status: "completed",
    }).populate("restaurant", "name status");

    if (completedSessions.length > 0) {
      // Handle button clicks FIRST before creating any session
      if (messageText === "add_new_business") {
        const waName = getWaProfileName(contacts);

        await OnboardingSession.create({
          senderNumber,
          step: waName ? "owner_name_confirm" : "owner_name",
          status: "in_progress",
          data: { waProfileName: waName },
        });

        if (waName) {
          await sendNameConfirm(senderNumber, waName);
        } else {
          await sendFromMainBot(
            senderNumber,
            `📋 *Let's add a new business!*\n\n*What is your full name?*`,
          );
        }
        return;
      }

      if (messageText === "go_to_dashboard") {
        await sendDashboardLink(senderNumber);
        return;
      }

      // Only show menu if no button was clicked
      await showReturningUserMenu(senderNumber, completedSessions);
      return;
    }

    // Brand new user
    const waName = getWaProfileName(contacts);

    const newSession = new OnboardingSession({
      senderNumber,
      step: waName ? "owner_name_confirm" : "owner_name",
      status: "in_progress",
      data: { waProfileName: waName },
    });

    await newSession.save();

    if (waName) {
      await sendNameConfirm(senderNumber, waName);
    } else {
      await sendWelcome(senderNumber);
    }
  } catch (err) {
    logger.error("handleOnboardingMessage error:", err.response?.data || err.message, err.stack);
    await sendFromMainBot(
      senderNumber,
      `⚠️ Error: ${err.message}\n\nType *RESTART* to start over.`,
    ).catch(() => {});
  }
};

const showReturningUserMenu = async (senderNumber, completedSessions) => {
  const bizList = completedSessions
    .map(
      (s, i) =>
        `${i + 1}. *${s.restaurant?.name || "Business"}* — ${(s.restaurant?.status || "pending").replace(/_/g, " ")}`,
    )
    .join("\n");
  await sendButtonFromMainBot(
    senderNumber,
    `👋 *Welcome back!*\n\nYour registered businesses:\n${bizList}\n\nWhat would you like to do?`,
    [
      { id: "add_new_business", title: "➕ Add Business" },
      { id: "go_to_dashboard", title: "📊 Go to Dashboard" },
    ],
  );
};

const sendDashboardLink = async (senderNumber) => {
  const owner = await RestaurantOwner.findOne({ whatsappNumber: senderNumber });
  if (owner) {
    const maskedEmail = owner.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c,
    );
    await sendFromMainBot(
      senderNumber,
      `🔐 *Your Dashboard:*\n\n🌐 URL: ${process.env.FRONTEND_URL}/login\n📧 Email: ${maskedEmail}\n\n_Forgot your password? Use "Forgot Password" on the login page._`,
    );
  } else {
    await sendFromMainBot(
      senderNumber,
      `📊 *Dashboard:*\n\n🌐 ${process.env.FRONTEND_URL}/login`,
    );
  }
};

const sendWelcome = async (to) => {
  await sendFromMainBot(
    to,
    `👋 *Welcome to ChatServe!*\n\nI'll help you set up your business on our WhatsApp automation platform.\n\nThis will take about 5-10 minutes.\n\n*What is your full name?*\n\n_(Type RESTART anytime to start over)_`,
  );
};

const processStep = async (session, text, messageType, mediaUrl) => {
  const { step, senderNumber } = session;

  try {
    switch (step) {
      case "owner_name_confirm": {
        const waName = session.data?.waProfileName;

        if (!waName) {
          session.step = "owner_name";
          await session.save();
          await sendFromMainBot(senderNumber, `🔄 Okay!\n\n*What is your full name?*`);
          return;
        }

        if (text === "owner_name_yes") {
          session.data.ownerName = waName;
          session.step = "restaurant_name";
          await session.save();
          await sendFromMainBot(
            senderNumber,
            `Nice to meet you, *${session.data.ownerName}*! 👋\n\n*What is your business name?*`,
          );
          return;
        }

        if (text === "owner_name_change") {
          session.step = "owner_name";
          await session.save();
          await sendFromMainBot(senderNumber, `No problem 😊\n\n*What is your full name?*`);
          return;
        }

        // If user typed something instead of tapping button, treat it as their name
        if (text && text.trim().length >= 2) {
          session.data.ownerName = text.trim();
          session.step = "restaurant_name";
          await session.save();
          await sendFromMainBot(
            senderNumber,
            `Nice to meet you, *${session.data.ownerName}*! 👋\n\n*What is your business name?*`,
          );
          return;
        }

        await sendNameConfirm(senderNumber, waName);
        return;
      }

      case "start":
      case "owner_name": {
        // Prevent "hi/hello" being saved as name
        const t = (text || "").trim();
        const lower = t.toLowerCase();
        const bad = ["hi", "hello", "hey", "hii", "start", "menu"];
        if (!t || t.length < 2 || bad.includes(lower)) {
          await sendFromMainBot(
            senderNumber,
            `Please enter your full name (example: Pravin Kanotara).`,
          );
          return;
        }

        session.data.ownerName = t;
        session.step = "restaurant_name";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `Nice to meet you, *${session.data.ownerName}*! 👋\n\n*What is your business name?*`,
        );
        break;
      }

      case "restaurant_name": {
        if (!text || text.trim().length < 2) {
          await sendFromMainBot(
            senderNumber,
            `Please enter a valid business name.`,
          );
          return;
        }
        session.data.restaurantName = text.trim();
        session.step = "restaurant_whatsapp_number";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `Great! *${session.data.restaurantName}* 🏢\n\n📱 *Which phone number do you want to use as your WhatsApp Business number?*\n\nInclude country code (e.g. +91 98765 43210)\n\n⚠️ This is where customers will message you.`,
        );
        break;
      }

      case "restaurant_whatsapp_number": {
        const raw = (text || "").trim();
        if (!isValidPhone(raw)) {
          await sendFromMainBot(
            senderNumber,
            `❌ Invalid phone number.\n\nPlease include country code:\n+91 98765 43210\n+1 555 123 4567`,
          );
          return;
        }
        const normalized = normalizePhone(raw);

        // Check if already registered under a DIFFERENT restaurant
        const existing = await WhatsAppConfig.findOne({
          normalizedNumber: normalized,
        });
        if (existing) {
          const existingRestaurant = await Restaurant.findById(
            existing.restaurant,
          );
          if (existingRestaurant) {
            await sendFromMainBot(
              senderNumber,
              `❌ *${raw}* is already registered as *${existingRestaurant.name}*.\n\nPlease use a different number, or type *RESTART* to start over.`,
            );
            return;
          }
        }

        session.data.targetBusinessNumber = raw;
        session.data.normalizedNumber = normalized;
        session.step = "email";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `✅ Got it! We'll configure *${raw}* as your WhatsApp Business number.\n\n📧 *What is your email address?*\n\n(Used to log into your dashboard)`,
        );
        break;
      }

      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test((text || "").trim())) {
          await sendFromMainBot(
            senderNumber,
            `❌ Please enter a valid email address.`,
          );
          return;
        }
        session.data.email = text.trim().toLowerCase();
        session.step = "address";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `📍 *What is your business address?*`,
        );
        break;
      }

      case "address": {
        session.data.address = text.trim();
        session.step = "description";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `📝 *Give a short description of your business*\n\n(e.g., "Home salon specializing in bridal makeup" or "Local bakery with fresh pastries")`,
        );
        break;
      }

      case "description": {
        session.data.description = text.trim();
        session.step = "working_hours";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `🕐 *What are your working hours?*\n\nExample:\nMon-Fri: 11am - 10pm\nSat-Sun: 10am - 11pm\n\nOr type "Always Open" if 24/7`,
        );
        break;
      }

      case "working_hours": {
        session.data.workingHours = text.trim();
        session.step = "food_categories";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `🏷️ *What categories does your business offer?*\n\nSeparate with commas:\ne.g. Haircuts, Coloring, Skincare`,
        );
        break;
      }

      case "food_categories": {
        const cats = (text || "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        if (cats.length === 0) {
          await sendFromMainBot(
            senderNumber,
            `Please enter at least one category.`,
          );
          return;
        }
        session.data.foodCategories = cats;
        session.step = "menu_intro";
        await session.save();
        await sendButtonFromMainBot(
          senderNumber,
          `📋 Now let's add your catalog items.\n\nYou can add multiple items. Ready?`,
          [
            { id: "add_menu_yes", title: "✅ Add Items" },
            { id: "add_menu_skip", title: "⏭️ Skip for Now" },
          ],
        );
        break;
      }

      case "menu_intro": {
        if (text === "add_menu_skip" || text?.toLowerCase().includes("skip")) {
          session.step = "logo";
          await session.save();
          await askForLogo(senderNumber);
        } else {
          session.step = "menu_item_name";
          session.currentMenuItem = {};
          await session.save();
          await sendFromMainBot(
            senderNumber,
            `📌 *Item Name?*\n(e.g., Haircut, Laptop Stand)`,
          );
        }
        break;
      }

      case "menu_item_name": {
        session.currentMenuItem = { name: text.trim() };
        session.step = "menu_item_description";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `📋 *Short description for "${text.trim()}"?*`,
        );
        break;
      }

      case "menu_item_description": {
        session.currentMenuItem.description = text.trim();
        session.step = "menu_item_price";
        await session.save();
        await sendFromMainBot(
          senderNumber,
          `💰 *Price for "${session.currentMenuItem.name}"?*\n(Numbers only, e.g., 320)`,
        );
        break;
      }

      case "menu_item_price": {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await sendFromMainBot(
            senderNumber,
            `❌ Please enter a valid price (e.g., 320).`,
          );
          return;
        }
        session.currentMenuItem.price = price;
        session.step = "menu_item_category";
        await session.save();
        const catList = (session.data.categories || session.data.foodCategories || []).join(", ");
        await sendFromMainBot(
          senderNumber,
          `📂 *Category for "${session.currentMenuItem.name}"?*\n\nYour categories: ${catList}`,
        );
        break;
      }

      case "menu_item_category": {
        session.currentMenuItem.category = text.trim();
        session.step = "menu_item_image";
        await session.save();
        await sendButtonFromMainBot(
          senderNumber,
          `🖼️ *Add an image for "${session.currentMenuItem.name}"?*`,
          [{ id: "img_skip", title: "⏭️ Skip Image" }],
        );
        break;
      }

      case "menu_item_image": {
        if (messageType === "image" && mediaUrl) {
          try {
            const { downloadAndUploadMedia } = require("./whatsappService");
            const cloudinaryUrl = await downloadAndUploadMedia(
              mediaUrl,
              process.env.MAIN_ACCESS_TOKEN,
              'ChatServe/catalog',
            );
            session.currentMenuItem.imageUrl = cloudinaryUrl;
          } catch (err) {
            logger.warn("Catalog item image upload failed:", err.message);
            // Continue without image
          }
        }
        if (!session.data.menuItems) session.data.menuItems = [];
        session.data.menuItems.push({ ...session.currentMenuItem });
        session.currentMenuItem = {};
        session.step = "menu_item_more";
        await session.save();
        await sendButtonFromMainBot(
          senderNumber,
          `✅ *"${session.data.menuItems[session.data.menuItems.length - 1].name}" added!*\n\n${session.data.menuItems.length} item(s) so far.\n\nAdd another?`,
          [
            { id: "more_items", title: "➕ Add Another" },
            { id: "done_items", title: "✅ Done" },
          ],
        );
        break;
      }

      case "menu_item_more": {
        if (text === "more_items" || text?.toLowerCase().includes("add")) {
          session.step = "menu_item_name";
          session.currentMenuItem = {};
          await session.save();
          await sendFromMainBot(senderNumber, `📌 *Next item name?*`);
        } else {
          session.step = "logo";
          await session.save();
          await askForLogo(senderNumber);
        }
        break;
      }

      case "logo": {
        if (messageType === "image" && mediaUrl) {
          try {
            const { downloadAndUploadMedia } = require("./whatsappService");
            const cloudinaryUrl = await downloadAndUploadMedia(
              mediaUrl,
              process.env.MAIN_ACCESS_TOKEN,
            );
            session.data.logoUrl = cloudinaryUrl;
            await sendFromMainBot(
              senderNumber,
              `✅ Logo uploaded successfully!`,
            );
          } catch (err) {
            logger.warn("Logo upload failed:", err.message);
          }
        }
        await finalizeOnboarding(session);
        break;
      }

      default:
        await sendFromMainBot(
          senderNumber,
          `Please continue with the onboarding questions, or type *RESTART* to start over.`,
        );
    }
  } catch (err) {
    logger.error("finalizeOnboarding error:", err.message, err.stack);
    await sendFromMainBot(
      senderNumber,
      `⚠️ Error: ${err.message}\n\nType *RESTART* to try again.`,
    ).catch(() => {});
  }
};

const askForLogo = async (to) => {
  await sendButtonFromMainBot(
    to,
    `🖼️ *Would you like to upload your business logo?*\n\nSend an image or skip.`,
    [{ id: "logo_skip", title: "⏭️ Skip Logo" }],
  );
};

// keep your existing finalizeOnboarding / parseWorkingHours as-is
// (not repeated here to avoid accidental logic changes)

const finalizeOnboarding = async (session) => {
  const { senderNumber, data } = session;

  try {
    await sendFromMainBot(
      senderNumber,
      `⏳ Setting up your business... please wait a moment!`,
    );

    // 1. Find existing owner by email OR create new
    let owner = await RestaurantOwner.findOne({ email: data.email });
    const tempPassword = generateTempPassword();
    let isNewOwner = false;

    if (!owner) {
      isNewOwner = true;
      owner = new RestaurantOwner({
        name: data.ownerName,
        email: data.email,
        whatsappNumber: senderNumber,
        password: tempPassword,
      });
      await owner.save();
    }

    // 2. Create restaurant (retry on duplicate tenantId)
    let restaurant;
    let retries = 3;
    while (retries > 0) {
      try {
        const tenantId = generateTenantId(data.restaurantName);
        restaurant = new Restaurant({
          owner: owner._id,
          name: data.restaurantName,
          description: data.description,
          address: data.address,
          email: data.email,
          phone: data.targetBusinessNumber,
          logoUrl: data.logoUrl,
          categories: data.categories || data.foodCategories || [],
          status: "pending_meta",
          tenantId,
          workingHours: parseWorkingHours(data.workingHours),
        });
        await restaurant.save();
        break; // success
      } catch (saveErr) {
        if (saveErr.code === 11000 && saveErr.keyPattern?.tenantId && retries > 1) {
          retries--;
          logger.warn(`Duplicate tenantId, retrying... (${retries} attempts left)`);
          continue;
        }
        throw saveErr;
      }
    }

    // 3. Link restaurant to owner
    if (!owner.restaurant) {
      owner.restaurant = restaurant._id;
      await RestaurantOwner.updateOne(
        { _id: owner._id },
        { restaurant: restaurant._id },
      );
    }

    // 4. Clean up any orphaned WhatsApp config for this number (e.g. from a
    //    previous restaurant that was deleted via Compass without cascade)
    const normalizedNum = data.normalizedNumber || normalizePhone(data.targetBusinessNumber);
    await WhatsAppConfig.deleteMany({
      normalizedNumber: normalizedNum,
      restaurant: { $ne: restaurant._id },
    });

    // 4b. Create WhatsApp config
    const waConfig = new WhatsAppConfig({
      restaurant: restaurant._id,
      targetBusinessNumber: data.targetBusinessNumber,
      normalizedNumber: normalizedNum,
      signupStatus: "pending",
    });
    await waConfig.save();

    restaurant.whatsappConfig = waConfig._id;
    await restaurant.save();

    // 5. Create catalog categories and items
    if (data.menuItems && data.menuItems.length > 0) {
      const categoryMap = {};
      for (const item of data.menuItems) {
        if (!categoryMap[item.category]) {
          const cat = await MenuCategory.create({
            restaurant: restaurant._id,
            name: item.category,
          });
          categoryMap[item.category] = cat._id;
        }
        await MenuItem.create({
          restaurant: restaurant._id,
          category: categoryMap[item.category],
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
        });
      }
    }

    // 6. Generate onboarding link
    const onboardingLink = `${process.env.FRONTEND_URL}/onboard/${restaurant._id}?token=${Buffer.from(restaurant._id.toString()).toString("base64")}`;

    // 7. Mark session as completed
    session.restaurant = restaurant._id;
    session.owner = owner._id;
    session.status = "completed";
    session.completedAt = new Date();
    session.onboardingLink = onboardingLink;
    session.onboardingLinkSentAt = new Date();
    await session.save();

    // 8. Send success message
    await sendFromMainBot(
      senderNumber,
      `🎉 *${data.restaurantName} is almost live!*\n\n` +
        `📱 *Final Step — Connect WhatsApp Business:*\n\n` +
        `Click below and complete Meta verification (2 minutes):\n\n` +
        `${onboardingLink}\n\n` +
        `You'll need to:\n✅ Log into Facebook\n✅ Select your Business Account\n✅ Verify: ${data.targetBusinessNumber}\n\n` +
        `After that, your bot goes live automatically! 🚀`,
    );

    // 9. Send credentials (only for new owners)
    if (isNewOwner) {
      await sendFromMainBot(
        senderNumber,
        `🔐 *Dashboard Login:*\n\nURL: ${process.env.FRONTEND_URL}/login\nEmail: ${data.email}\nPassword: ${tempPassword}\n\n⚠️ Change your password after first login!`,
      );
    } else {
      await sendFromMainBot(
        senderNumber,
        `✅ New business added to your existing account!\n\nLog in at: ${process.env.FRONTEND_URL}/login\nEmail: ${data.email}`,
      );
    }
  } catch (err) {
    // Enhanced error logging for debugging
    logger.error(
      "finalizeOnboarding error:",
      JSON.stringify({
        message: err.message,
        code: err.code,
        keyPattern: err.keyPattern,
        keyValue: err.keyValue,
        stack: err.stack,
      }),
    );
    await sendFromMainBot(
      senderNumber,
      `⚠️ Error during setup. Our team has been notified.\n\nType *RESTART* to try again.`,
    );
  }
};

const parseWorkingHours = (hoursText) => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return days.map((day) => ({
    day,
    open: "09:00",
    close: "22:00",
    isOpen: true,
  }));
};

module.exports = { handleOnboardingMessage };