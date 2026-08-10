/**
 * Subcategory Backfill Script for BigBazar Inventory.
 * Maps existing products based on title/description keywords to allowed subcategories.
 */

import { getDb } from '../functions/api/db.js';

const KEYWORD_RULES = [
  // Women
  { category: 'Women', subcategory: 'Sari', keywords: ['sari', 'saree', 'শাড়ি', 'শাড়ি', 'jamdani', 'কাটান', 'কাতান'] },
  { category: 'Women', subcategory: 'Three-piece', keywords: ['3 piece', '3-piece', 'three piece', 'three-piece', 'থ্রি পিস', 'থ্রি-পিস', 'salwar kameez', 'সালোয়ার'] },
  { category: 'Women', subcategory: 'Two-piece', keywords: ['2 piece', '2-piece', 'two piece', 'two-piece', 'টু পিস', 'টু-পিস'] },
  { category: 'Women', subcategory: 'Borka/Abaya/Hijab', keywords: ['borka', 'abaya', 'hijab', 'বোরকা', 'আবায়া', 'হিজাব', 'খিমার', 'khimar'] },
  { category: 'Women', subcategory: 'Western', keywords: ['western', 'top', 'tunic', 'ওয়েস্টার্ন', 'জিন্স'] },
  { category: 'Women', subcategory: 'Unstitched Fabric', keywords: ['unstitched', 'fabric', 'গজ কাপড়', 'ফেব্রিক'] },

  // Men
  { category: 'Men', subcategory: 'Panjabi', keywords: ['panjabi', 'punjabi', 'পাঞ্জাবি', 'পাঞ্জাবী', 'kabli', 'কাবলি'] },
  { category: 'Men', subcategory: 'Formal Wear', keywords: ['formal', 'suit', 'blazer', 'shirt', 'ফরমাল', 'শার্ট'] },
  { category: 'Men', subcategory: 'Casual Wear', keywords: ['polo', 't-shirt', 'tshirt', 'casual', 'টি-শার্ট', 'পোলো'] },
  { category: 'Men', subcategory: 'Jeans/Trousers', keywords: ['jeans', 'pant', 'trouser', 'জিন্স', 'প্যান্ট'] },

  // Kids (Boys)
  { category: 'Kids (Boys)', subcategory: 'Panjabi/Pajama', keywords: ['panjabi', 'punjabi', 'পাঞ্জাবি', 'pajama'] },
  { category: 'Kids (Boys)', subcategory: 'Polo/T-Shirt', keywords: ['polo', 't-shirt', 'tshirt', 'টি-শার্ট'] },
  { category: 'Kids (Boys)', subcategory: 'Shirt/Trouser', keywords: ['shirt', 'pant', 'trouser', 'শার্ট'] },

  // Kids (Girls)
  { category: 'Kids (Girls)', subcategory: 'Frock/Dress', keywords: ['frock', 'dress', 'ফ্রক', 'ড্রেস'] },
  { category: 'Kids (Girls)', subcategory: 'Lehenga/Gown', keywords: ['lehenga', 'gown', 'লেহেঙ্গা', 'গাউন'] },
  { category: 'Kids (Girls)', subcategory: 'Three-piece/Salwar', keywords: ['3 piece', 'three-piece', 'থ্রি-পিস', 'সালওয়ার'] }
];

export function classifyProduct(product) {
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (product.category && product.category !== rule.category) continue;
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return rule.subcategory;
      }
    }
  }
  return null;
}

export async function runBackfill() {
  const conn = getDb();
  console.log('Fetching all products for subcategory backfill...');
  const products = await conn.execute('SELECT id, name, description, category, subcategory FROM products');
  
  let updatedCount = 0;
  for (const prod of products) {
    if (prod.subcategory) continue; // Skip if already categorized
    const matchedSubcategory = classifyProduct(prod);
    if (matchedSubcategory) {
      await conn.execute('UPDATE products SET subcategory = ? WHERE id = ?', [matchedSubcategory, prod.id]);
      updatedCount++;
      console.log(`Updated product [${prod.name}] -> ${matchedSubcategory}`);
    }
  }
  console.log(`Subcategory backfill finished! Updated ${updatedCount} products.`);
}

if (process.argv[1]?.endsWith('backfill-subcategories.js')) {
  runBackfill().catch(console.error);
}
