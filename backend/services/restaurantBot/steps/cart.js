const { sendBtn } = require("../utils/messenger");

const showCart = async (ctx) => {
  const { restaurant, customer } = ctx;

  const cart = customer.botSession.cart || [];
  if (cart.length === 0) {
    await sendBtn(ctx, `Your cart is empty 🛒\n\nBrowse our catalog to add items!`, [
      { id: "order_food", title: "📋 Browse Catalog" },
      { id: "help", title: "📞 Help" },
    ]);
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemList = cart
    .map((i) => `• *${i.name}* x${i.quantity} — ₹${i.price * i.quantity}`)
    .join("\n");

  customer.botSession.step = "main_menu";
  await customer.save();

  await sendBtn(
    ctx,
    `Here's your cart 🛒\n\n${itemList}\n\n─────────────────\n💰 *Total: ₹${total}*`,
    [
      { id: "order_food", title: "➕ Add More" },
      { id: "checkout_start", title: "💳 Checkout" },
      { id: "clear_cart", title: "❌ Clear Cart" },
    ],
  );
};

module.exports = { showCart };