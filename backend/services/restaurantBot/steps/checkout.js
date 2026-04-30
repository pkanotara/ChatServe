const Order = require("../../../models/Order");
const { MenuItem } = require("../../../models/Menu");
const logger = require("../../../utils/logger");
const { send, sendBtn } = require("../utils/messenger");

const startCheckout = async (ctx) => {
  const { customer } = ctx;
  const cart = customer.botSession.cart || [];

  if (cart.length === 0) {
    const cartStep = require("./cart");
    return cartStep.showCart(ctx);
  }

  customer.botSession.step = "checkout_address";
  await customer.save();

  await sendBtn(
    ctx,
    `Almost done 👍\n\n📍 *Step 1 of 3: Delivery Address*\n\nWhere should we deliver?`,
    [
      { id: "use_saved_address", title: "📍 Use Saved Address" },
      { id: "type_address", title: "✏️ Type Address" },
    ],
  );
};

const handleAddressInput = async (ctx) => {
  const { inputText, messageType, customer } = ctx;

  if (inputText === "use_saved_address" && customer.address) {
    customer.botSession.deliveryAddress = customer.address;
    await customer.save();
    return showConfirmDetails(ctx);
  }

  if (inputText === "type_address" || inputText === "use_saved_address") {
    await send(ctx, `📍 Please type your full delivery address:`);
    return;
  }

  if (messageType === "location") {
    customer.botSession.deliveryAddress = "Shared via location pin 📍";
    await customer.save();
    return showConfirmDetails(ctx);
  }

  if (inputText && inputText.length > 5) {
    customer.botSession.deliveryAddress = inputText;
    customer.address = inputText;
    await customer.save();
    return showConfirmDetails(ctx);
  }

  await send(ctx, `Please enter a valid delivery address 📍`);
};

const showConfirmDetails = async (ctx) => {
  const { customer } = ctx;
  const cart = customer.botSession.cart || [];
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  customer.botSession.step = "checkout_confirm";
  await customer.save();

  await sendBtn(
    ctx,
    `Let me confirm 📋\n\n` +
      `👤 *Name:* ${customer.name || "Not set"}\n` +
      `📍 *Address:* ${customer.botSession.deliveryAddress}\n` +
      `🛒 *Items:* ${cart.length}\n` +
      `💰 *Total:* ₹${total}`,
    [
      { id: "confirm_details", title: "✅ Confirm" },
      { id: "edit_address", title: "✏️ Edit Address" },
    ],
  );
};

const handleCheckoutConfirm = async (ctx) => {
  const { inputText, customer } = ctx;

  if (inputText === "edit_address") {
    customer.botSession.step = "checkout_address";
    await customer.save();
    await send(ctx, `📍 Please enter your new delivery address:`);
    return;
  }

  if (inputText === "confirm_details") {
    customer.botSession.step = "checkout_payment";
    await customer.save();

    const total = customer.botSession.cart.reduce((s, i) => s + i.price * i.quantity, 0);

    await sendBtn(
      ctx,
      `💰 *Step 3 of 3: Payment*\n\nTotal: ₹${total}\n\nPayment Method: *Cash on Delivery* 💵\n\nConfirm to place your order?`,
      [
        { id: "pay_cod", title: "✅ Confirm & Place Order" },
        { id: "cancel_order", title: "❌ Cancel" },
      ],
    );
    return;
  }

  return showConfirmDetails(ctx);
};

const handlePayment = async (ctx) => {
  const { inputText } = ctx;

  if (inputText === "pay_cod") {
    return placeOrder(ctx, "cash_on_delivery");
  }

  if (inputText === "cancel_order") {
    const { customer } = ctx;
    customer.botSession.step = "idle";
    await customer.save();
    await send(ctx, `❌ Order cancelled.\n\nType *hi* to start again!`);
    return;
  }

  // fallback
  return showConfirmDetails(ctx);
};

const placeOrder = async (ctx, paymentMethod) => {
  const { restaurant, customer } = ctx;

  try {
    const to = customer.whatsappNumber;

    const order = new Order({
      restaurant: restaurant._id,
      customer: customer._id,
      customerNumber: to,
      items: customer.botSession.cart.map((i) => ({
        menuItem: i.item,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      total: customer.botSession.cart.reduce((s, i) => s + i.price * i.quantity, 0),
      paymentMethod,
      paymentStatus: paymentMethod === "cash_on_delivery" ? "pending" : "paid",
      notes: `Delivery: ${customer.botSession.deliveryAddress || "Not specified"}`,
    });

    await order.save();

    // Update customer
    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.totalSpent = (customer.totalSpent || 0) + order.total;
    customer.lastOrderAt = new Date();
    customer.botSession.cart = [];
    customer.botSession.step = "idle";
    customer.botSession.lastOrderId = order._id.toString();
    customer.botSession.lastOrderNumber = order.orderNumber;
    await customer.save();

    // Update catalog item stats
    for (const item of order.items) {
      if (item.menuItem) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { totalOrdered: item.quantity },
        }).catch(() => {});
      }
    }

    await sendBtn(
      ctx,
      `Done 🎉 *Your order is placed!*\n\n📋 Order ID: *${order.orderNumber}*\n💰 Total: ₹${order.total}\n💳 Payment: Cash on Delivery\n\nWe'll notify you when your order is ready! 🚀`,
      [
        { id: "track_order", title: "📦 Track Order" },
        { id: "order_food", title: "🔁 Order Again" },
      ],
    );
  } catch (err) {
    logger.error("Order placement error:", err);
    await sendBtn(ctx, `❌ Something went wrong placing your order.\nPlease try again!`, [
      { id: "view_cart", title: "🛒 Try Again" },
      { id: "help", title: "📞 Help" },
    ]);
  }
};

module.exports = {
  startCheckout,
  handleAddressInput,
  showConfirmDetails,
  handleCheckoutConfirm,
  handlePayment,
  placeOrder,
};