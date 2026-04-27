const { sendFromMainBot } = require('./whatsappService');
const logger = require('../utils/logger');

const sendDashboardCredentials = async (whatsappNumber, email, tempPassword, dashboardUrl) => {
  try {
    await sendFromMainBot(whatsappNumber,
      `🔐 *Your ChatServe Dashboard*\n\nURL: ${dashboardUrl}/login\nEmail: ${email}\nPassword: ${tempPassword}\n\n⚠️ Please change your password after first login!`
    );
  } catch (err) {
    logger.error('Failed to send dashboard credentials via WhatsApp:', err.message);
  }
};

const sendOrderUpdateToCustomer = async (phoneNumberId, accessToken, customerNumber, order, restaurantName) => {
  const headers = {
    confirmed: `✅ *Order Confirmed!*`,
    preparing: `👨‍🍳 *Your Order is Being Prepared!*`,
    ready:     `📦 *Your Order is Ready!*`,
    delivered: `🎉 *Order Delivered!*`,
    cancelled: `❌ *Order Cancelled*`,
  };

  const footers = {
    confirmed: `We'll notify you as it progresses.`,
    preparing: `Hang tight, it won't be long!`,
    ready:     order.deliveryType === 'pickup' ? `Please come to collect your order.` : `Out for delivery soon!`,
    delivered: `Thank you for ordering from *${restaurantName}*! 🙏`,
    cancelled: `Sorry for the inconvenience. Please contact the restaurant for more info.`,
  };

  const header = headers[order.status];
  if (!header) return;

  const itemsList = order.items
    .map(i => `  • ${i.name} x${i.quantity} — ₹${i.subtotal ?? i.price * i.quantity}`)
    .join('\n');

  const deliveryLine = order.deliveryType === 'delivery'
    ? `📍 *Delivery to:* ${order.deliveryAddress || 'Address on file'}`
    : `🏪 *Pickup order*`;

  const paymentLine = `💳 *Payment:* ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online'} — ${order.paymentStatus === 'paid' ? 'Paid ✅' : 'Pending'}`;

  const lines = [
    header,
    ``,
    `🧾 *Order #${order.orderNumber}* | *${restaurantName}*`,
    ``,
    `*Items Ordered:*`,
    itemsList,
    ``,
    `💰 *Total: ₹${order.total}*`,
    paymentLine,
    deliveryLine,
    order.notes ? `📝 *Notes:* ${order.notes}` : null,
    ``,
    footers[order.status],
  ].filter(Boolean).join('\n');

  const { sendTextMessage } = require('./whatsappService');
  await sendTextMessage(phoneNumberId, accessToken, customerNumber, lines).catch(err =>
    logger.warn(`Order update notification failed: ${err.message}`)
  );
};

module.exports = { sendDashboardCredentials, sendOrderUpdateToCustomer };
