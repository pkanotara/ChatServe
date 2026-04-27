const { sendBtn } = require("../utils/messenger");


const showMainMenu = async (ctx) => {
  const { customer, restaurant } = ctx;

  customer.botSession.step = "main_menu";
  await customer.save();

  const name = customer.name ? `, ${customer.name}` : "";
  const cartCount = customer.botSession?.cart?.length || 0;
  const cartLabel = cartCount > 0 ? `🛒 Cart (${cartCount})` : "🛒 View Cart";

  await sendBtn(
    ctx,
    `🍽️ Welcome to *${restaurant.name}*${name}! 👋

What are you craving today? 😋  
We’ve got something delicious waiting for you...

Tap an option below to continue 👇`,
    [
      { id: "order_food", title: "🍕 Browse Menu" },
      { id: "view_cart", title: cartLabel },
      { id: "track_order", title: "📦 Track My Order" },
    ]
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