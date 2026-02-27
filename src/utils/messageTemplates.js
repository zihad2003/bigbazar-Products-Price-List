export const generateWhatsAppLink = (product, phone, checkoutData = null) => {
  if (!phone) {
    console.warn("Phone number missing for WhatsApp link");
    return "#";
  }
  const message = generateOrderMessage(product, checkoutData);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const generateMessengerLink = (pageId) => {
  if (!pageId) {
    console.warn("Page ID missing for Messenger link");
    return "#";
  }
  // Using the specific format requested for better reliability
  return `https://www.messenger.com/t/${pageId}/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=1441792&recurring_notification=0`;
};

export const generateOrderMessage = (product, checkoutData = null) => {
  let message = `🛍️ *NEW ORDER REQUEST*\n\n`;
  message += `📌 *Product:* ${product.name}\n`;
  message += `💰 *Price:* ${product.price} BDT\n`;

  if (checkoutData) {
    const deliveryCharge = checkoutData.deliveryArea === 'mirsarai' ? 0 : (checkoutData.deliveryArea === 'chattogram' ? 100 : 150);
    message += `🚚 *Delivery Charge:* ${deliveryCharge} BDT\n`;
    message += `💵 *Total Amount:* ${Number(product.price) + deliveryCharge} BDT\n\n`;
    message += `👤 *CUSTOMER DETAILS*\n`;
    message += `📝 *Name:* ${checkoutData.name}\n`;
    message += `📞 *Phone:* ${checkoutData.phone}\n`;
    message += `📍 *Address:* ${checkoutData.address}\n`;
    message += `🗺️ *Area:* ${checkoutData.deliveryArea === 'mirsarai' ? 'মীরসরাই (Free)' : (checkoutData.deliveryArea === 'chattogram' ? 'চট্টগ্রাম (100৳)' : 'অন্যান্য (150৳+)')}\n`;
  } else {
    message += `🏷️ *Category:* ${product.category || 'General'}\n`;
  }

  if (product.video_url) {
    message += `\n🎥 *Video Review:* ${product.video_url}`;
  }

  const imageUrl = product.image_url || (product.images && product.images[0]) || product.image;
  if (!product.video_url && imageUrl) {
    message += `\n🖼️ *Image:* ${imageUrl}`;
  }

  message += `\n\n_Sent via BigBazar Online Store_`;
  return message;
};

export const generateShareMessage = (product) => {
  // Use the current window URL which should be the product permalink if opened via route, 
  // or construct it if we are on home. Reliability: window.location.href is safest if we ensure routing is consistent.
  // Given Home.jsx sets /product/:id, this is safe.
  const productLink = window.location.href;
  return `🔥 Check out this ${product.name} on BigBazar!\n\n“পণ্যের দাম জানতে আমাদের ওয়েবসাইট ভিজিট করুন”\n👉 Link: ${productLink}`;
};