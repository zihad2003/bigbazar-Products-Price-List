import allProductsData from '../../all_products.json';

export function getFallbackProduct(productId) {
  if (!allProductsData) return null;
  return allProductsData.find(p => p.id === productId) || null;
}

export function getFallbackProducts(selectedCategory, debouncedSearchQuery, page, pageSize) {
  if (!allProductsData) return { data: [], count: 0 };

  let localData = allProductsData.filter(p => p.status === 'published');

  if (selectedCategory && selectedCategory !== 'All') {
    const categoryMaps = {
      'Men': ['Men', 'ছেলেদের'],
      'Women': ['Women', 'মেয়েদের'],
      'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
      'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
    };
    const values = categoryMaps[selectedCategory] || [selectedCategory];
    localData = localData.filter(p => {
      if (!p.category) return false;
      return values.includes(p.category) || values.includes(p.category.trim());
    });
  }

  if (debouncedSearchQuery) {
    const qs = debouncedSearchQuery.toLowerCase();
    localData = localData.filter(p => 
      (p.name && p.name.toLowerCase().includes(qs)) || 
      (p.description && p.description.toLowerCase().includes(qs))
    );
  }

  // Ensure sorting by newest first
  localData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const count = localData.length;
  const from = page * pageSize;
  const to = from + pageSize;
  const pagedData = localData.slice(from, to);

  return { data: pagedData, count };
}
