/**
 * Calculate the effective price and discount status of a product
 * considering both individual product discounts and global flash sales.
 * 
 * @param {Object} product - The product object
 * @param {Object} flashSale - The flash sale settings { active: boolean, percentage: number, end_time: string }
 * @returns {Object} { price, original_price, discount_percent, has_discount, is_flash_sale }
 */
export const calculatePrice = (product, flashSale) => {
    // defaults
    let price = parseFloat(product.price || 0);
    let originalPrice = parseFloat(product.original_price || 0);
    let discountPercent = 0;
    let hasDiscount = false;
    let isFlashSale = false;

    // Check if flash sale is active and valid
    const isFlashSaleActive = flashSale
        && flashSale.active
        && flashSale.percentage > 0
        && (!flashSale.end_time || new Date(flashSale.end_time) > new Date());

    if (isFlashSaleActive) {
        // Flash Sale Logic:
        // The current database 'price' becomes the 'original_price'
        // The new selling price is calculated

        // If product ALREADY had an original_price (individual discount), 
        // usually flash sales apply to the CURRENT selling price.

        originalPrice = price; // The selling price before flash sale
        const discountFactor = 1 - (flashSale.percentage / 100);
        price = Math.round(originalPrice * discountFactor);

        discountPercent = flashSale.percentage;
        hasDiscount = true;
        isFlashSale = true;
    } else {
        // Standard Individual Discount Logic
        if (originalPrice > price) {
            hasDiscount = true;
            discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
    }

    return {
        price,
        originalPrice: hasDiscount ? originalPrice : null,
        discountPercent,
        hasDiscount,
        isFlashSale
    };
};
