/**
 * Security & Input Sanitization Utilities
 */

/**
 * Sanitizes user search string input to prevent XSS or query injection vulnerabilities.
 * @param {string} input - User raw input text
 * @returns {string} Cleaned sanitized text
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .replace(/[<>'"]/g, '')      // Remove special char injections
    .trim();
};

/**
 * Validates whether an image or video URL uses safe protocols (https / data / blob).
 * @param {string} url 
 * @returns {boolean}
 */
export const isValidMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  );
};
