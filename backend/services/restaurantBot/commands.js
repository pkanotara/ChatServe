const runGlobalCommands = async (ctx, handlers) => {
  const { inputText } = ctx;
  const lower = (ctx.lower || "").trim();

  // greetings / start
  if (["hi", "hello", "hey", "hii", "start", "menu"].includes(lower)) {
    await handlers.startGreeting(ctx);
    return true;
  }

  // main menu
  if (inputText === "main_menu" || lower === "back") {
    await handlers.showMainMenu(ctx);
    return true;
  }

  // order food (fixes "order_food treated as name")
  if (inputText === "order_food" || lower === "order food") {
    const menuBrowse = require("./steps/menuBrowse");
    await menuBrowse.showCategories(ctx);
    return true;
  }

  // view cart
  if (inputText === "view_cart" || lower === "cart") {
    await handlers.showCart(ctx);
    return true;
  }

  // checkout
  if (inputText === "checkout_start" || lower === "checkout") {
    const checkout = require("./steps/checkout");
    await checkout.startCheckout(ctx);
    return true;
  }

  // track
  if (inputText === "track_order") {
    await handlers.showTrackOrder(ctx);
    return true;
  }

  // help
  if (inputText === "help" || lower === "help") {
    await handlers.showHelp(ctx);
    return true;
  }

  if (inputText === "clear_cart") {
    // clear cart + reset flow
    const { customer } = ctx;
    customer.botSession.cart = [];
    customer.botSession.currentItemIndex = 0;
    customer.botSession.itemsList = [];
    customer.botSession.step = "main_menu";
    await customer.save();

    const mainMenu = require("./steps/mainMenu");
    await mainMenu.showMainMenu(ctx);
    return true;
  }

  return false;
};

module.exports = { runGlobalCommands };
