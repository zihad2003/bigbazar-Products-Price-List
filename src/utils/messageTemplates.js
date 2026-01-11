export const generateWhatsAppLink = (product, phone) => {
  if (!phone) {
    console.warn("Phone number missing for WhatsApp link");
    return "#";
  }
  const message = generateOrderMessage(product);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const generateMessengerLink = (pageId) => {
  if (!pageId) {
    console.warn("Page ID missing for Messenger link");
    return "#";
  }
  return `https://m.me/${pageId}`;
};

export const generateOrderMessage = (product) => {
  let message = `🛍️ *I want to order this product:*\n\n📌 *Name:* ${product.name}\n💰 *Price:* ${product.price} BDT\n🏷️ *Category:* ${product.category || 'General'}`;

  // Prefer image_url, then first of images array
  const imageUrl = product.image_url || (product.images && product.images[0]) || product.image;
  if (imageUrl) {
    message += `\n\n🖼️ *Image:* ${imageUrl}`;
  }

  message += `\n\n_Please confirm stock and delivery charge._`;
  return message;
};