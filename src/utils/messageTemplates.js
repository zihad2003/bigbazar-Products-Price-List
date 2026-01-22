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
  // Using the specific format requested for better reliability
  return `https://www.messenger.com/t/${pageId}/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=1441792&recurring_notification=0`;
};

export const generateOrderMessage = (product) => {
  let message = `🛍️ *I want to order this product:*\n\n📌 *Name:* ${product.name}\n💰 *Price:* ${product.price} BDT\n🏷️ *Category:* ${product.category || 'General'}`;

  // Prioritize video link if available (requested by user)
  if (product.video_url) {
    message += `\n\n🎥 *Video Review:* ${product.video_url}`;
  }

  // Fallback to image if no video, or maybe just include both? 
  // User said "instade of supabase link", so if video exists, we might skip the image link which is usually the supabase one.
  // However, images are useful. I'll add the image only if no video is present, OR I'll add the image as a separate line if really needed.
  // For safety and "richness", providing the video link is key.
  // Let's stick to the user request: Video link IS the priority.

  const imageUrl = product.image_url || (product.images && product.images[0]) || product.image;
  if (!product.video_url && imageUrl) {
    message += `\n\n🖼️ *Image:* ${imageUrl}`;
  }

  message += `\n\n_Please confirm stock and delivery charge._`;
  return message;
};

export const generateShareMessage = (product) => {
  // Use the current window URL which should be the product permalink if opened via route, 
  // or construct it if we are on home. Reliability: window.location.href is safest if we ensure routing is consistent.
  // Given Home.jsx sets /product/:id, this is safe.
  const productLink = window.location.href;
  return `🔥 Check out this ${product.name} on BigBazar!\n\n“পণ্যের দাম জানতে আমাদের ওয়েবসাইট ভিজিট করুন”\n👉 Link: ${productLink}`;
};