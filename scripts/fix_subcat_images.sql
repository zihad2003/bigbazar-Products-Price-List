-- Instant subcategory image fix for Hostinger phpMyAdmin (no redeploy needed).
-- Points Women subcategories at static files already live at /img/subcats/*.jpg

UPDATE site_settings
SET value = JSON_SET(
  value,
  '$."Women"[0].image_url', '/img/subcats/STITCHED-COTTON-THREE-PIECE.jpg',
  '$."Women"[1].image_url', '/img/subcats/PARSHI.jpg',
  '$."Women"[2].image_url', '/img/subcats/SAREE.jpg',
  '$."Women"[3].image_url', '/img/subcats/WESTERN-2-PIECE.jpg'
)
WHERE `key` = 'subcategories';
