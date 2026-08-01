/**
 * Converts text to Title Case format safely.
 * Capitalizes English words while leaving Bengali characters untouched.
 * 
 * @param {string} str 
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str || '';
  return str.replace(/[a-zA-Z]+/g, (match) => 
    match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
  );
}
