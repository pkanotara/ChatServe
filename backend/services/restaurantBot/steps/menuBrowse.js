const { MenuCategory, MenuItem } = require("../../../models/Menu");
const logger = require("../../../utils/logger");
const {
  send,
  sendBtn,
  sendList,
  sendImageByLink,
} = require("../utils/messenger");

// --- config ---
const CARDS_PER_BATCH = 3; // set 999 to send "all" (not recommended)

const safe = (v, max) => String(v || "").substring(0, max);

// ── Category list ────────────────────────────────────────────────────────────
const showCategories = async (ctx) => {
  const { restaurant, customer } = ctx;

  const categories = await MenuCategory.find({
    restaurant: restaurant._id,
    isActive: true,
  }).sort("sortOrder");

  if (categories.length === 0) {
    await send(
      ctx,
      `😔 Our catalog is being updated. Please check back soon!\n\nSend *menu* to go back.`,
    );
    return;
  }

  customer.botSession.step = "browsing_categories";
  await customer.save();

  const sections = [
    {
      title: `${restaurant.name} Menu`,
      rows: categories.map((cat) => ({
        id: `cat_${cat._id}`,
        title: safe(cat.name, 24),
        description: safe(cat.description, 72),
      })),
    },
  ];

  await sendList(
    ctx,
    `📋 Our Catalog`,
    `Great 😄 Here's what we offer!\n\nSelect a category to browse:`,
    `Send *cart* anytime to view your cart`,
    "Browse Catalog",
    sections,
  );
};

// ── Send 1 item as “card”: image(with caption) + short buttons ──────────────
const sendItemCard = async (ctx, item, { showMoreButton = false } = {}) => {
  const typeLine = item.type === "service"
    ? `🛠️ Service${item.duration ? ` · ${item.duration} min` : ""}`
    : "📦 Product";

  const caption =
    `*${safe(item.name, 60)}*\n` +
    `₹${item.price}\n\n` +
    `${typeLine}\n` +
    `${safe(item.description, 700)}`;

  // 1) Image message (with caption)
  if (item.imageUrl) {
    try {
      await sendImageByLink(ctx, item.imageUrl, caption);
    } catch (err) {
      logger.warn("Image send failed:", err.message);
      // fallback to text if image fails
      await send(ctx, caption);
    }
  } else {
    // no image, fallback to text
    await send(ctx, caption);
  }

  // 2) Short buttons message (keeps UI clean)
  const buttons = [];

  if (showMoreButton) {
    buttons.push({ id: "more_items", title: "➡️ More" });
  }

  buttons.push(
    { id: `add_${item._id}`, title: "➕ Add" },
    { id: "view_cart", title: "🛒 Cart" },
  );

  await sendBtn(ctx, "Choose 👇", buttons);
};

// ── Send a batch of item cards ───────────────────────────────────────────────
const sendItemCardsBatch = async (ctx, items, startIndex, limit) => {
  const { customer } = ctx;
  const total = items.length;

  const slice = items.slice(startIndex, startIndex + limit);

  for (let i = 0; i < slice.length; i++) {
    const isLastInBatch = i === slice.length - 1;
    const nextIndex = startIndex + limit;
    const hasMore = nextIndex < total;

    // show "More" only on the last card of the batch (if there are more)
    await sendItemCard(ctx, slice[i], {
      showMoreButton: isLastInBatch && hasMore,
    });
  }

  // update pointer
  customer.botSession.currentItemIndex = Math.min(
    startIndex + slice.length,
    total,
  );
  await customer.save();

  // if done, show end message
  if (customer.botSession.currentItemIndex >= total) {
    await sendBtn(ctx, `That's all in this category 😊`, [
      { id: "order_food", title: "📋 Browse More" },
      { id: "view_cart", title: "🛒 View Cart" },
    ]);
  }
};

// ── Category selected → send cards ───────────────────────────────────────────
const handleCategorySelect = async (ctx) => {
  const { inputText, restaurant, customer } = ctx;

  if (!inputText.startsWith("cat_")) return showCategories(ctx);

  const categoryId = inputText.replace("cat_", "");
  const category = await MenuCategory.findById(categoryId);

  const items = await MenuItem.find({
    restaurant: restaurant._id,
    category: categoryId,
    isAvailable: true,
  }).sort("sortOrder");

  if (!items.length) {
    await sendBtn(
      ctx,
      `😔 No items available in *${category?.name}* right now.`,
      [
        { id: "order_food", title: "📋 Browse Catalog" },
        { id: "view_cart", title: "🛒 View Cart" },
      ],
    );
    return;
  }

  customer.botSession.step = "browsing_items";
  customer.botSession.currentCategoryId = categoryId;
  customer.botSession.currentCategoryName = category?.name || "Items";
  customer.botSession.itemsList = items.map((i) => i._id.toString());
  customer.botSession.currentItemIndex = 0;
  await customer.save();

  await send(ctx, `Great choice 😄\nShowing *${category?.name || "items"}* 👇`);

  // Send first batch
  await sendItemCardsBatch(ctx, items, 0, CARDS_PER_BATCH);
};

// ── Handle actions while browsing ────────────────────────────────────────────
const handleItemBrowse = async (ctx) => {
  const { inputText, customer } = ctx;

  // Load more cards
  if (inputText === "more_items") {
    const ids = customer.botSession.itemsList || [];
    const startIndex = customer.botSession.currentItemIndex || 0;

    const items = await MenuItem.find({ _id: { $in: ids } });

    // keep original order
    const byId = new Map(items.map((i) => [i._id.toString(), i]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return sendItemCardsBatch(ctx, ordered, startIndex, CARDS_PER_BATCH);
  }

  // Add to cart
  if (inputText.startsWith("add_")) {
    const itemId = inputText.replace("add_", "");
    const item = await MenuItem.findById(itemId);

    if (!item) {
      await send(ctx, `Item not found. Send *menu* to browse.`);
      return;
    }

    const cart = customer.botSession.cart || [];
    const existing = cart.find((c) => c.item?.toString() === itemId);

    if (existing) existing.quantity += 1;
    else {
      cart.push({
        item: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
      });
    }

    customer.botSession.cart = cart;
    await customer.save();

    await sendBtn(
      ctx,
      `Added: *${item.name}* 😋\n\n🛒 Cart items: ${cart.length}`,
      [
        { id: "more_items", title: "➕ Add More" },
        { id: "view_cart", title: "🛒 View Cart" },
        { id: "checkout_start", title: "💳 Checkout" },
      ],
    );
    return;
  }

  // Cart
  if (inputText === "view_cart") {
    const cartStep = require("./cart");
    return cartStep.showCart(ctx);
  }

  // Checkout
  if (inputText === "checkout_start") {
    const checkout = require("./checkout");
    return checkout.startCheckout(ctx);
  }

  return showCategories(ctx);
};

module.exports = {
  showCategories,
  handleCategorySelect,
  handleItemBrowse,
};
