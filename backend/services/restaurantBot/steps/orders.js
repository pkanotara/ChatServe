const Order = require("../../../models/Order");
const { send, sendBtn } = require("../utils/messenger");

const showTrackOrder = async (ctx) => {
  const { customer } = ctx;

  // Set step so the next message is treated as an Order ID input
  customer.botSession.step = "track_order_input";
  await customer.save();

  // Show the last order number as a hint if available
  const lastOrderNum = customer.botSession.lastOrderNumber;
  const hint = lastOrderNum
    ? `\n\n💡 Your last order was: *${lastOrderNum}*`
    : "";

  await send(
    ctx,
    `📦 *Track Your Order*\n\nPlease type your Order ID to check the status.\n(e.g. ORD-1745...)${hint}`,
  );
};

const handleTrackOrderInput = async (ctx) => {
  const { inputText, restaurant, customer } = ctx;

  if (!inputText || inputText.trim().length < 3) {
    await send(ctx, `Please enter a valid Order ID (e.g. ORD-1745...)`);
    return;
  }

  const orderId = inputText.trim();

  // Look up order by orderNumber for this restaurant + customer
  const order = await Order.findOne({
    restaurant: restaurant._id,
    customerNumber: customer.whatsappNumber,
    orderNumber: orderId,
  });

  if (!order) {
    await sendBtn(
      ctx,
      `❌ No order found with ID *${orderId}*.\n\nPlease check the Order ID and try again.`,
      [
        { id: "track_order", title: "🔁 Try Again" },
        { id: "main_menu", title: "🏠 Main Menu" },
      ],
    );
    return;
  }

  const statusMap = {
    pending: "⏳ Order received",
    confirmed: "✅ Order confirmed",
    preparing: "👨‍🍳 Being prepared",
    ready: "📦 Ready for pickup/delivery",
    delivered: "🎉 Delivered!",
    cancelled: "❌ Cancelled",
  };

  const itemsList = order.items
    .map((i) => `  • ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`)
    .join("\n");

  customer.botSession.step = "main_menu";
  await customer.save();

  await sendBtn(
    ctx,
    `📦 *Order Status*\n\n` +
      `🆔 Order: *${order.orderNumber}*\n` +
      `📊 Status: *${statusMap[order.status] || order.status}*\n` +
      `💰 Total: ₹${order.total}\n` +
      `💳 Payment: ${order.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : order.paymentMethod}\n\n` +
      `🛒 *Items:*\n${itemsList}\n\n` +
      `📅 Placed: ${new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    [
      { id: "track_order", title: "📦 Track Another" },
      { id: "main_menu", title: "🏠 Main Menu" },
    ],
  );
};

const handleCancelOrder = async (ctx) => {
  const { restaurant, customer } = ctx;
  const to = customer.whatsappNumber;

  const lastOrder = await Order.findOne({
    restaurant: restaurant._id,
    customerNumber: to,
    status: { $in: ["pending", "confirmed"] },
  }).sort({ createdAt: -1 });

  if (!lastOrder) {
    await sendBtn(ctx, `No active orders to cancel.`, [
      { id: "order_food", title: "📋 Browse Catalog" },
      { id: "main_menu", title: "🏠 Main Menu" },
    ]);
    return;
  }

  lastOrder.status = "cancelled";
  // If your Order schema does not have statusHistory, remove the next line
  if (Array.isArray(lastOrder.statusHistory)) {
    lastOrder.statusHistory.push({ status: "cancelled", changedBy: "customer" });
  }
  await lastOrder.save();

  customer.botSession.step = "idle";
  await customer.save();

  await sendBtn(
    ctx,
    `❌ Order *${lastOrder.orderNumber}* has been cancelled.\n\nWe hope to see you again soon!`,
    [
      { id: "order_food", title: "📋 Order Again" },
      { id: "main_menu", title: "🏠 Main Menu" },
    ],
  );
};

module.exports = { showTrackOrder, handleTrackOrderInput, handleCancelOrder };