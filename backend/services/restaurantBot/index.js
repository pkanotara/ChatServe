const { buildContext } = require("./context");
const { runGlobalCommands } = require("./commands");

const greeting = require("./steps/greeting");
const mainMenu = require("./steps/mainMenu");
const menuBrowse = require("./steps/menuBrowse");
const cart = require("./steps/cart");
const checkout = require("./steps/checkout");
const orders = require("./steps/orders");
const help = require("./steps/help");

const handleRestaurantBotMessage = async (
  phoneNumberId,
  senderNumber,
  messageText,
  messageType,
  interactiveReply,
  contacts = [],
) => {
  const ctx = await buildContext({
    phoneNumberId,
    senderNumber,
    messageText,
    messageType,
    interactiveReply,
    contacts,
  });

  if (!ctx) return;

  // Global commands first
  const handled = await runGlobalCommands(ctx, {
    startGreeting: greeting.startGreeting,
    showMainMenu: mainMenu.showMainMenu,
    showCart: cart.showCart,
    showHelp: help.showHelp,
    handleCancelOrder: orders.handleCancelOrder,
    showTrackOrder: orders.showTrackOrder,
  });
  if (handled) return;

  // Step routing
  const step = ctx.customer?.botSession?.step || "idle";

  switch (step) {
    case "idle":
    case "greeting":
      return greeting.handleGreetingReply(ctx);

    case "name_change":
      return greeting.handleNameChange(ctx);

    case "main_menu":
      return mainMenu.handleMainMenuReply(ctx);

    case "browsing_categories":
      return menuBrowse.handleCategorySelect(ctx);

    case "browsing_items":
      return menuBrowse.handleItemBrowse(ctx);

    case "checkout_address":
      return checkout.handleAddressInput(ctx);

    case "checkout_confirm":
      return checkout.handleCheckoutConfirm(ctx);

    case "checkout_payment":
      return checkout.handlePayment(ctx);

    case "track_order":
    case "track_order_input":
      return orders.handleTrackOrderInput(ctx);

    default:
      return greeting.startGreeting(ctx);
  }
};

module.exports = { handleRestaurantBotMessage };