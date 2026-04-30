const { sendBtn, sendList } = require("../utils/messenger");


const showMainMenu = async (ctx) => {
  const { customer, restaurant } = ctx;

  customer.botSession.step = "main_menu";
  await customer.save();

  const name = customer.name ? `, ${customer.name}` : "";
  const cartCount = customer.botSession?.cart?.length || 0;
  const cartLabel = cartCount > 0 ? `🛒 Cart (${cartCount})` : "🛒 View Cart";

  await sendList(
    ctx,
    restaurant.name,
    `👋 Welcome${name}!\n\nWhat would you like to do today? 😊\nTap the button below to see options 👇`,
    "Powered by ChatServe",
    "Menu Options",
    [
      {
        title: "Choose an option",
        rows: [
          { id: "order_food", title: "📋 Browse Catalog", description: "View our products & services" },
          { id: "view_cart", title: cartLabel, description: "Review items in your cart" },
          { id: "track_order", title: "📦 Track My Order", description: "Check your order status" },
          { id: "help", title: "📞 Help & Contact", description: "Get support from the business" },
        ],
      },
    ],
  );
};

const handleMainMenuReply = async (ctx) => {
  const { inputText } = ctx;

  if (inputText === "order_food") {
    const menuBrowse = require("./menuBrowse");
    return menuBrowse.showCategories(ctx);
  }

  if (inputText === "view_cart") {
    const cart = require("./cart");
    return cart.showCart(ctx);
  }

  if (inputText === "track_order") {
    const orders = require("./orders");
    return orders.showTrackOrder(ctx);
  }

  if (inputText === "help") {
    const help = require("./help");
    return help.showHelp(ctx);
  }

  return showMainMenu(ctx);
};

module.exports = { showMainMenu, handleMainMenuReply };