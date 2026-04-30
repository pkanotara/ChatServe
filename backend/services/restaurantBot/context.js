const Customer = require("../../models/Customer");
const Business = require("../../models/Restaurant"); // model name kept for DB compat
const WhatsAppConfig = require("../../models/WhatsAppConfig");
const logger = require("../../utils/logger");

const buildContext = async ({
  phoneNumberId,
  senderNumber,
  messageText,
  messageType,
  interactiveReply,
  contacts = [],
}) => {
  const waConfig = await WhatsAppConfig.findOne({
    phoneNumberId,
    botEnabled: true,
    signupStatus: "configured",
  }).select("+accessToken");

  if (!waConfig) {
    logger.warn(`No active bot config for phoneNumberId: ${phoneNumberId}`);
    return null;
  }

  const business = await Business.findById(waConfig.restaurant);
  if (!business || business.status !== "active") return null;

  const token = waConfig.accessToken || process.env.MAIN_ACCESS_TOKEN;

  let customer = await Customer.findOne({
    restaurant: business._id,
    whatsappNumber: senderNumber,
  });

  if (!customer) {
    customer = await Customer.create({
      restaurant: business._id,
      whatsappNumber: senderNumber,
      botSession: { step: "idle", cart: [], lastActivity: new Date() },
    });
  }

  // ✅ WhatsApp profile name → default customer.name (only if missing)
  const waProfileName = contacts?.[0]?.profile?.name?.trim();
  if (waProfileName && !customer.name) {
    customer.name = waProfileName;
  }

  // Update last activity
  customer.botSession = customer.botSession || {};
  customer.botSession.lastActivity = new Date();
  await customer.save();

  const inputText =
    interactiveReply?.id || interactiveReply?.title || messageText || "";
  const lower = (inputText || "").toLowerCase().trim();

  return {
    phoneNumberId,
    senderNumber,
    messageText,
    messageType,
    interactiveReply,
    contacts,

    waConfig,
    restaurant: business,
    customer,
    token,

    inputText,
    lower,
    to: customer.whatsappNumber,
  };
};

module.exports = { buildContext };