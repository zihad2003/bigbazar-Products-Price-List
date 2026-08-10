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

// Seed subcategory data — empty by default so only admin-created subcategories are used.
export const SEED_SUBCATEGORIES = {
  'Women': [],
  'Men': [],
  'Kids (Boys)': [],
  'Kids (Girls)': [],
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
