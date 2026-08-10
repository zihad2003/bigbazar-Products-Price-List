/**
 * BigBazar Category & Subcategory Taxonomy Configuration.
 * 
 * This file provides:
 * 1. SEED_SUBCATEGORIES — Default subcategory definitions used as fallback
 *    when admin hasn't configured subcategories yet.
 * 2. mergeWithDynamic() — Merges admin-managed subcategories (from site_settings)
 *    with seed data, preferring admin data when available.
 * 3. Helper functions for lookups.
 */

// Top-level categories (fixed, not admin-editable)
export const TOP_CATEGORIES = [
  { id: 'Men', en: 'Men', bn: 'ছেলেদের' },
  { id: 'Women', en: 'Women', bn: 'মেয়েদের' },
  { id: 'Kids (Boys)', en: 'Kids (Boys)', bn: 'বাচ্চাদের (ছেলে)' },
  { id: 'Kids (Girls)', en: 'Kids (Girls)', bn: 'বাচ্চাদের (মেয়ে)' },
];

// Seed subcategory data — used as defaults until admin overrides via dashboard.
// The `id` field is what gets stored in products.subcategory and must remain stable.
export const SEED_SUBCATEGORIES = {
  'Women': [
    { id: 'Sari', name_en: 'Sari', name_bn: 'শাড়ি', image_url: '', sort_order: 0 },
    { id: 'Three-piece', name_en: 'Three-piece', name_bn: 'থ্রি-পিস', image_url: '', sort_order: 1 },
    { id: 'Borka/Abaya/Hijab', name_en: 'Borka & Abaya', name_bn: 'বোরকা', image_url: '', sort_order: 2 },
    { id: 'Western', name_en: 'Western', name_bn: 'ওয়েস্টার্ন', image_url: '', sort_order: 3 },
    { id: 'Frock/Dress', name_en: 'Frock Dress', name_bn: 'ফ্রক ড্রেস', image_url: '', sort_order: 4 },
  ],
  'Men': [
    { id: 'Panjabi', name_en: 'Panjabi', name_bn: 'পাঞ্জাবি', image_url: '', sort_order: 0 },
    { id: 'Three-piece', name_en: 'Three-piece', name_bn: 'থ্রি-পিস', image_url: '', sort_order: 1 },
  ],
  'Kids (Boys)': [
    { id: 'Panjabi/Pajama', name_en: 'Panjabi & Pajama', name_bn: 'পাঞ্জাবি ও পায়জামা', image_url: '', sort_order: 0 },
    { id: 'Polo/T-Shirt', name_en: 'Polo & T-Shirt', name_bn: 'পোলো ও টি-শার্ট', image_url: '', sort_order: 1 },
    { id: 'Shirt/Trouser', name_en: 'Shirt & Trouser', name_bn: 'শার্ট ও ট্রাউজার', image_url: '', sort_order: 2 },
    { id: 'Festive Wear', name_en: 'Festive Wear', name_bn: 'উৎসবের পোশাক', image_url: '', sort_order: 3 },
  ],
  'Kids (Girls)': [
    { id: 'Frock/Dress', name_en: 'Frock & Dress', name_bn: 'ফ্রক ও ড্রেস', image_url: '', sort_order: 0 },
    { id: 'Lehenga/Gown', name_en: 'Lehenga & Gown', name_bn: 'লেহেঙ্গা ও গাউন', image_url: '', sort_order: 1 },
    { id: 'Three-piece/Salwar', name_en: 'Three-piece & Salwar', name_bn: 'থ্রি-পিস ও সালওয়ার', image_url: '', sort_order: 2 },
    { id: 'Top/Pants', name_en: 'Top & Pants', name_bn: 'টপ ও প্যান্ট', image_url: '', sort_order: 3 },
  ],
};

/**
 * Merge admin-managed subcategories with seed defaults.
 * Admin data takes precedence when it exists for a category.
 * @param {object|null} dynamicData — from site_settings key "subcategories"
 * @returns {object} — merged subcategory map keyed by category
 */
export function mergeWithDynamic(dynamicData) {
  if (!dynamicData || typeof dynamicData !== 'object') return { ...SEED_SUBCATEGORIES };
  const result = { ...SEED_SUBCATEGORIES };
  for (const cat of Object.keys(result)) {
    if (Array.isArray(dynamicData[cat]) && dynamicData[cat].length > 0) {
      result[cat] = [...dynamicData[cat]].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
  }
  // Also include any categories in dynamic data that aren't in seed
  for (const cat of Object.keys(dynamicData)) {
    if (!result[cat] && Array.isArray(dynamicData[cat])) {
      result[cat] = [...dynamicData[cat]].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
  }
  return result;
}

/**
 * Get subcategories for a specific category from the merged data.
 * @param {string} categoryKey — e.g. "Women", "Men"
 * @param {object|null} dynamicData — from site_settings
 * @returns {Array} — array of subcategory objects
 */
export function getSubcategoriesForCategory(categoryKey, dynamicData) {
  const merged = mergeWithDynamic(dynamicData);
  if (!categoryKey || !merged[categoryKey]) return [];
  return merged[categoryKey];
}

/**
 * Get a flat list of all subcategories across all categories (for "All" view).
 * Deduplicates by id, takes first N.
 * @param {object|null} dynamicData — from site_settings
 * @param {number} maxItems — max items to return
 * @returns {Array} — array of { ...subcategory, _category }
 */
export function getAllSubcategories(dynamicData, maxItems = 8) {
  const merged = mergeWithDynamic(dynamicData);
  const seen = new Set();
  const result = [];
  for (const cat of Object.keys(merged)) {
    for (const sub of merged[cat]) {
      if (!seen.has(sub.id)) {
        seen.add(sub.id);
        result.push({ ...sub, _category: cat });
      }
      if (result.length >= maxItems) return result;
    }
  }
  return result;
}

/**
 * Check if a subcategory ID is valid for a given category.
 */
export function isValidSubcategory(categoryKey, subcategoryId, dynamicData) {
  const subs = getSubcategoriesForCategory(categoryKey, dynamicData);
  return subs.some(s => s.id === subcategoryId);
}

// Legacy compatibility — old TAXONOMY export shape
export const TAXONOMY = (() => {
  const t = {};
  for (const cat of TOP_CATEGORIES) {
    t[cat.id] = {
      id: cat.id,
      en: cat.en,
      bn: cat.bn,
      subcategories: (SEED_SUBCATEGORIES[cat.id] || []).map(s => ({
        id: s.id,
        en: s.name_en,
        bn: s.name_bn,
      })),
    };
  }
  return t;
})();

export const CATEGORIES_LIST = Object.values(TAXONOMY);
