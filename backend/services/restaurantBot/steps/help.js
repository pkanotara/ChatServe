const { sendBtn } = require("../utils/messenger");

const showHelp = async (ctx) => {
  const { restaurant, customer } = ctx;

  customer.botSession.step = "main_menu";
  await customer.save();

  const ownerEmail = restaurant.email || "Not available";
  const ownerPhone = restaurant.phone || "Not available";
  const address = restaurant.address || "Not available";

  await sendBtn(
    ctx,
    `📞 *Need Help?*\n\n` +
      `Contact the business owner directly:\n\n` +
      `📧 *Email:* ${ownerEmail}\n` +
      `📱 *Phone:* ${ownerPhone}\n` +
      `📍 *Address:* ${address}\n\n` +
      `Feel free to reach out for any questions or issues with your order!`,
    [
      { id: "cancel_order", title: "❌ Cancel Order" },
      { id: "track_order", title: "📦 Track Order" },
      { id: "main_menu", title: "🏠 Main Menu" },
    ],
  );
};

module.exports = { showHelp };