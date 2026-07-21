/**
 * Color name lookup utility — maps hex values to Bangla + English names.
 * Uses nearest-color matching via Euclidean distance in RGB space.
 */

export const COLOR_MAP = [
    // Whites & Off-whites
    { hex: '#FFFFFF', bn: 'সাদা', en: 'White' },
    { hex: '#FFFDD0', bn: 'ক্রিম', en: 'Cream' },
    { hex: '#FAF0E6', bn: 'লিনেন', en: 'Linen' },
    { hex: '#FAEBD7', bn: 'অ্যান্টিক সাদা', en: 'Antique White' },
    { hex: '#FFF8DC', bn: 'কর্নসিল্ক', en: 'Cornsilk' },
    { hex: '#FFFFF0', bn: 'আইভরি', en: 'Ivory' },
    { hex: '#F5F5DC', bn: 'বেইজ', en: 'Beige' },
    { hex: '#F0EAD6', bn: 'অফ হোয়াইট', en: 'Off White' },

    // Greys
    { hex: '#808080', bn: 'গ্রে', en: 'Grey' },
    { hex: '#C0C0C0', bn: 'সিলভার গ্রে', en: 'Silver Grey' },
    { hex: '#A9A9A9', bn: 'ডার্ক গ্রে', en: 'Dark Grey' },
    { hex: '#D3D3D3', bn: 'হালকা ছাই রঙ', en: 'Light Grey' },
    { hex: '#696969', bn: 'ডিম গ্রে', en: 'Dim Grey' },
    { hex: '#B0B0B0', bn: 'ছাই রঙ', en: 'Ash Grey' },
    { hex: '#778899', bn: 'স্লেট গ্রে', en: 'Slate Grey' },
    { hex: '#708090', bn: 'নীলচে ছাই', en: 'Blue Grey' },

    // Blacks
    { hex: '#000000', bn: 'কালো', en: 'Black' },
    { hex: '#1C1C1C', bn: 'জেট ব্ল্যাক', en: 'Jet Black' },
    { hex: '#36454F', bn: 'চারকোল', en: 'Charcoal' },

    // Reds
    { hex: '#FF0000', bn: 'লাল', en: 'Red' },
    { hex: '#DC143C', bn: 'ক্রিমসন', en: 'Crimson' },
    { hex: '#B22222', bn: 'ইটের লাল', en: 'Brick Red' },
    { hex: '#8B0000', bn: 'গাঢ় লাল', en: 'Dark Red' },
    { hex: '#CD5C5C', bn: 'ইন্ডিয়ান রেড', en: 'Indian Red' },
    { hex: '#E25822', bn: 'ফ্লেম রেড', en: 'Flame Red' },
    { hex: '#FF6347', bn: 'টমেটো লাল', en: 'Tomato Red' },
    { hex: '#FF4500', bn: 'কমলা-লাল', en: 'Orange Red' },
    { hex: '#CC0033', bn: 'চেরি লাল', en: 'Cherry Red' },

    // Pinks
    { hex: '#FFC0CB', bn: 'গোলাপি', en: 'Pink' },
    { hex: '#FF69B4', bn: 'হট পিঙ্ক', en: 'Hot Pink' },
    { hex: '#FF1493', bn: 'ডিপ পিঙ্ক', en: 'Deep Pink' },
    { hex: '#FFB6C1', bn: 'হালকা গোলাপি', en: 'Light Pink' },
    { hex: '#DB7093', bn: 'পেল ভায়োলেট রেড', en: 'Pale Violet Red' },
    { hex: '#E8ADAA', bn: 'ডাস্টি রোজ', en: 'Dusty Rose' },
    { hex: '#F4C2C2', bn: 'বেবি পিঙ্ক', en: 'Baby Pink' },
    { hex: '#C8A2C8', bn: 'লিলাক', en: 'Lilac' },
    { hex: '#E0B0FF', bn: 'মভ', en: 'Mauve' },
    { hex: '#DE5D83', bn: 'রোজ পিঙ্ক', en: 'Rose Pink' },
    { hex: '#BE5F6E', bn: 'অ্যান্টিক রোজ', en: 'Antique Rose' },

    // Oranges
    { hex: '#FFA500', bn: 'কমলা', en: 'Orange' },
    { hex: '#FF8C00', bn: 'গাঢ় কমলা', en: 'Dark Orange' },
    { hex: '#FFD700', bn: 'সোনালি', en: 'Gold' },
    { hex: '#E2725B', bn: 'টেরাকোটা', en: 'Terracotta' },
    { hex: '#CC7722', bn: 'ওচার', en: 'Ochre' },
    { hex: '#FF7F50', bn: 'কোরাল', en: 'Coral' },
    { hex: '#FA8072', bn: 'স্যামন', en: 'Salmon' },
    { hex: '#FFBF00', bn: 'অ্যাম্বার', en: 'Amber' },
    { hex: '#E5AA70', bn: 'ফন', en: 'Fawn' },
    { hex: '#D2691E', bn: 'চকোলেট অরেঞ্জ', en: 'Chocolate Orange' },
    { hex: '#FF6600', bn: 'বার্ন্ট অরেঞ্জ', en: 'Burnt Orange' },
    { hex: '#F28500', bn: 'ট্যাঞ্জারিন', en: 'Tangerine' },

    // Yellows
    { hex: '#FFFF00', bn: 'হলুদ', en: 'Yellow' },
    { hex: '#FFFFE0', bn: 'হালকা হলুদ', en: 'Light Yellow' },
    { hex: '#F0E68C', bn: 'খাকি হলুদ', en: 'Khaki Yellow' },
    { hex: '#BDB76B', bn: 'গাঢ় খাকি', en: 'Dark Khaki' },
    { hex: '#DAA520', bn: 'গোল্ডেনরড', en: 'Goldenrod' },
    { hex: '#FADA5E', bn: 'রয়্যাল গোল্ড', en: 'Royal Gold' },
    { hex: '#FCE883', bn: 'লেমন হলুদ', en: 'Lemon Yellow' },
    { hex: '#FFFACD', bn: 'লেমন শিফন', en: 'Lemon Chiffon' },
    { hex: '#FFF44F', bn: 'উজ্জ্বল হলুদ', en: 'Bright Yellow' },
    { hex: '#E4D00A', bn: 'সিট্রিন', en: 'Citrine' },
    { hex: '#FFD300', bn: 'সাইবার ইয়েলো', en: 'Bright Gold' },

    // Browns
    { hex: '#964B00', bn: 'বাদামি', en: 'Brown' },
    { hex: '#8B4513', bn: 'স্যাডল ব্রাউন', en: 'Saddle Brown' },
    { hex: '#A0522D', bn: 'সিয়েনা', en: 'Sienna' },
    { hex: '#D2B48C', bn: 'ট্যান', en: 'Tan' },
    { hex: '#DEB887', bn: 'বার্লি উড', en: 'Burlywood' },
    { hex: '#F5DEB3', bn: 'গমের রঙ', en: 'Wheat' },
    { hex: '#C19A6B', bn: 'ক্যামেল', en: 'Camel' },
    { hex: '#7B3F00', bn: 'চকোলেট', en: 'Chocolate' },
    { hex: '#6F4E37', bn: 'কফি', en: 'Coffee' },
    { hex: '#703642', bn: 'ক্যাটাওবা', en: 'Catawba' },
    { hex: '#4E3629', bn: 'ডার্ক ব্রাউন', en: 'Dark Brown' },
    { hex: '#C4A484', bn: 'ফন ব্রাউন', en: 'Fawn Brown' },
    { hex: '#483C32', bn: 'টুপি', en: 'Taupe' },
    { hex: '#E1C16E', bn: 'ব্রাস', en: 'Brass' },
    { hex: '#80461B', bn: 'রাসেট', en: 'Russet' },
    { hex: '#CC5500', bn: 'বার্ন্ট অরেঞ্জ', en: 'Burnt Orange' },

    // Greens
    { hex: '#008000', bn: 'সবুজ', en: 'Green' },
    { hex: '#006400', bn: 'গাঢ় সবুজ', en: 'Dark Green' },
    { hex: '#228B22', bn: 'ফরেস্ট গ্রিন', en: 'Forest Green' },
    { hex: '#90EE90', bn: 'হালকা সবুজ', en: 'Light Green' },
    { hex: '#2E8B57', bn: 'সী গ্রিন', en: 'Sea Green' },
    { hex: '#3CB371', bn: 'মিডিয়াম সী গ্রিন', en: 'Medium Sea Green' },
    { hex: '#6B8E23', bn: 'অলিভ ড্র্যাব', en: 'Olive Drab' },
    { hex: '#808000', bn: 'অলিভ', en: 'Olive' },
    { hex: '#556B2F', bn: 'ডার্ক অলিভ গ্রিন', en: 'Dark Olive Green' },
    { hex: '#00FF7F', bn: 'স্প্রিং গ্রিন', en: 'Spring Green' },
    { hex: '#32CD32', bn: 'লাইম গ্রিন', en: 'Lime Green' },
    { hex: '#98FB98', bn: 'পেল গ্রিন', en: 'Pale Green' },
    { hex: '#00FA9A', bn: 'মিডিয়াম স্প্রিং গ্রিন', en: 'Medium Spring Green' },
    { hex: '#50C878', bn: 'এমারেল্ড', en: 'Emerald' },
    { hex: '#4F7942', bn: 'ফার্ন গ্রিন', en: 'Fern Green' },
    { hex: '#ACE1AF', bn: 'সেলাডন', en: 'Celadon' },
    { hex: '#8FBC8F', bn: 'ডার্ক সী গ্রিন', en: 'Dark Sea Green' },
    { hex: '#355E3B', bn: 'হান্টার গ্রিন', en: 'Hunter Green' },
    { hex: '#01796F', bn: 'পাইন গ্রিন', en: 'Pine Green' },
    { hex: '#4CBB17', bn: 'কেলি গ্রিন', en: 'Kelly Green' },
    { hex: '#BFFF00', bn: 'লাইম', en: 'Lime' },
    { hex: '#7CFC00', bn: 'লন গ্রিন', en: 'Lawn Green' },
    { hex: '#AAF0D1', bn: 'মিন্ট গ্রিন', en: 'Mint Green' },

    // Blues
    { hex: '#0000FF', bn: 'নীল', en: 'Blue' },
    { hex: '#00008B', bn: 'গাঢ় নীল', en: 'Dark Blue' },
    { hex: '#000080', bn: 'নেভি', en: 'Navy' },
    { hex: '#4169E1', bn: 'রয়্যাল ব্লু', en: 'Royal Blue' },
    { hex: '#ADD8E6', bn: 'হালকা নীল', en: 'Light Blue' },
    { hex: '#87CEEB', bn: 'আকাশি নীল', en: 'Sky Blue' },
    { hex: '#87CEFA', bn: 'হালকা আকাশি নীল', en: 'Light Sky Blue' },
    { hex: '#00CED1', bn: 'ডার্ক টার্কোয়েজ', en: 'Dark Turquoise' },
    { hex: '#40E0D0', bn: 'টার্কোয়েজ', en: 'Turquoise' },
    { hex: '#008B8B', bn: 'গাঢ় সায়ান', en: 'Dark Cyan' },
    { hex: '#00FFFF', bn: 'সায়ান', en: 'Cyan' },
    { hex: '#008080', bn: 'টিল', en: 'Teal' },
    { hex: '#5F9EA0', bn: 'ক্যাডেট ব্লু', en: 'Cadet Blue' },
    { hex: '#4682B4', bn: 'স্টিল ব্লু', en: 'Steel Blue' },
    { hex: '#6495ED', bn: 'কর্নফ্লাওয়ার ব্লু', en: 'Cornflower Blue' },
    { hex: '#B0C4DE', bn: 'লাইট স্টিল ব্লু', en: 'Light Steel Blue' },
    { hex: '#6082B6', bn: 'গ্লাউকাস', en: 'Glaucous' },
    { hex: '#191970', bn: 'মিডনাইট ব্লু', en: 'Midnight Blue' },
    { hex: '#1E90FF', bn: 'ডজার ব্লু', en: 'Dodger Blue' },
    { hex: '#003153', bn: 'প্রুশিয়ান ব্লু', en: 'Prussian Blue' },
    { hex: '#89CFF0', bn: 'বেবি ব্লু', en: 'Baby Blue' },
    { hex: '#B0E0E6', bn: 'পাউডার ব্লু', en: 'Powder Blue' },
    { hex: '#E0FFFF', bn: 'লাইট সায়ান', en: 'Light Cyan' },
    { hex: '#0077B6', bn: 'সার্ফ ব্লু', en: 'Ocean Blue' },
    { hex: '#73C2FB', bn: 'মায়া ব্লু', en: 'Maya Blue' },
    { hex: '#002244', bn: 'অক্সফোর্ড ব্লু', en: 'Oxford Blue' },

    // Purples / Violets
    { hex: '#800080', bn: 'বেগুনি', en: 'Purple' },
    { hex: '#4B0082', bn: 'ইনডিগো', en: 'Indigo' },
    { hex: '#8B008B', bn: 'গাঢ় ম্যাজেন্টা', en: 'Dark Magenta' },
    { hex: '#9400D3', bn: 'গাঢ় ভায়োলেট', en: 'Dark Violet' },
    { hex: '#EE82EE', bn: 'ভায়োলেট', en: 'Violet' },
    { hex: '#DA70D6', bn: 'অর্কিড', en: 'Orchid' },
    { hex: '#DDA0DD', bn: 'প্লাম', en: 'Plum' },
    { hex: '#D8BFD8', bn: 'থিসল', en: 'Thistle' },
    { hex: '#E6E6FA', bn: 'ল্যাভেন্ডার', en: 'Lavender' },
    { hex: '#9966CC', bn: 'অ্যামেথিস্ট', en: 'Amethyst' },
    { hex: '#6A0DAD', bn: 'রয়্যাল পার্পল', en: 'Royal Purple' },
    { hex: '#702963', bn: 'বাইজেন্টাইন', en: 'Byzantine' },
    { hex: '#FF00FF', bn: 'ম্যাজেন্টা', en: 'Magenta' },
    { hex: '#FF00FF', bn: 'ফুচিয়া', en: 'Fuchsia' },
    { hex: '#301934', bn: 'ডার্ক পার্পল', en: 'Dark Purple' },
    { hex: '#551A8B', bn: 'ইম্পেরিয়াল পার্পল', en: 'Imperial Purple' },

    // Maroon / Wine / Burgundy
    { hex: '#800000', bn: 'মেরুন', en: 'Maroon' },
    { hex: '#722F37', bn: 'ওয়াইন', en: 'Wine' },
    { hex: '#800020', bn: 'বারগান্ডি', en: 'Burgundy' },
    { hex: '#B5651D', bn: 'পার্সিমন', en: 'Persimmon' },

    // Skin / Nude tones
    { hex: '#F3D5B5', bn: 'নিউড', en: 'Nude' },
    { hex: '#FFDBAC', bn: 'পীচ', en: 'Peach' },
    { hex: '#FFDAB9', bn: 'পীচ পাফ', en: 'Peach Puff' },
    { hex: '#FFE4C4', bn: 'বিস্ক', en: 'Bisque' },
    { hex: '#EDC9AF', bn: 'ডেজার্ট স্যান্ড', en: 'Desert Sand' },

    // Khaki / Military
    { hex: '#C3B091', bn: 'খাকি', en: 'Khaki' },
    { hex: '#BDB76B', bn: 'ডার্ক খাকি', en: 'Dark Khaki' },
    { hex: '#4B5320', bn: 'আর্মি গ্রিন', en: 'Army Green' },
    { hex: '#3B3C36', bn: 'মিলিটারি গ্রিন', en: 'Military Green' },

    // Copper / Bronze / Metallic
    { hex: '#B87333', bn: 'কপার', en: 'Copper' },
    { hex: '#CD7F32', bn: 'ব্রোঞ্জ', en: 'Bronze' },
    { hex: '#CFB53B', bn: 'ওল্ড গোল্ড', en: 'Old Gold' },
    { hex: '#C5B358', bn: 'ভেগাস গোল্ড', en: 'Vegas Gold' },

    // Rust / Amber / Earthy
    { hex: '#B7410E', bn: 'রাস্ট', en: 'Rust' },
    { hex: '#CC7722', bn: 'ওচার', en: 'Ochre' },
    { hex: '#E49B0F', bn: 'গাম্বোজ', en: 'Gamboge' },

    // Aqua / Mint
    { hex: '#7FFFD4', bn: 'অ্যাকোয়ামারিন', en: 'Aquamarine' },
    { hex: '#66CDAA', bn: 'মিডিয়াম অ্যাকোয়ামারিন', en: 'Medium Aquamarine' },
    { hex: '#3EB489', bn: 'মিন্ট', en: 'Mint' },
    { hex: '#2F4F4F', bn: 'ডার্ক স্লেট গ্রে', en: 'Dark Slate' },

    // Mustard
    { hex: '#FFDB58', bn: 'সরিষা', en: 'Mustard' },
    { hex: '#E1AD01', bn: 'গাঢ় সরিষা', en: 'Dark Mustard' },
];

/**
 * Convert hex string to RGB
 */
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
    };
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Find the nearest color name for a given hex code.
 * Returns { bn, en, hex } with the closest match.
 */
export function getColorName(hex) {
    if (!hex) return { bn: 'অজানা', en: 'Unknown', hex: '#888888' };

    const target = hexToRgb(hex);
    let nearest = COLOR_MAP[0];
    let minDist = Infinity;

    for (const color of COLOR_MAP) {
        const dist = colorDistance(target, hexToRgb(color.hex));
        if (dist < minDist) {
            minDist = dist;
            nearest = color;
        }
    }

    return { bn: nearest.bn, en: nearest.en, hex: nearest.hex };
}

/**
 * Format the final name string: "বাংলা (English)"
 */
export function formatColorName(hex) {
    const { bn, en } = getColorName(hex);
    return `${bn} (${en})`;
}

/**
 * Mobile-friendly preset color swatches for quick selection
 */
export const PRESET_SWATCHES = [
    { hex: '#000000', en: 'Black', bn: 'কালো' },
    { hex: '#FFFFFF', en: 'White', bn: 'সাদা' },
    { hex: '#FF0000', en: 'Red', bn: 'লাল' },
    { hex: '#800000', en: 'Maroon', bn: 'মেরুন' },
    { hex: '#800020', en: 'Burgundy', bn: 'বারগান্ডি' },
    { hex: '#FFC0CB', en: 'Pink', bn: 'গোলাপি' },
    { hex: '#E8ADAA', en: 'Dusty Rose', bn: 'ডাস্টি রোজ' },
    { hex: '#FFA500', en: 'Orange', bn: 'কমলা' },
    { hex: '#FFD700', en: 'Gold', bn: 'সোনালি' },
    { hex: '#FFFF00', en: 'Yellow', bn: 'হলুদ' },
    { hex: '#FFDB58', en: 'Mustard', bn: 'সরিষা' },
    { hex: '#008000', en: 'Green', bn: 'সবুজ' },
    { hex: '#50C878', en: 'Emerald', bn: 'এমারেল্ড' },
    { hex: '#808000', en: 'Olive', bn: 'অলিভ' },
    { hex: '#0000FF', en: 'Blue', bn: 'নীল' },
    { hex: '#4169E1', en: 'Royal Blue', bn: 'রয়্যাল ব্লু' },
    { hex: '#000080', en: 'Navy', bn: 'নেভি' },
    { hex: '#87CEEB', en: 'Sky Blue', bn: 'আকাশি' },
    { hex: '#008080', en: 'Teal', bn: 'টিল' },
    { hex: '#800080', en: 'Purple', bn: 'বেগুনি' },
    { hex: '#E6E6FA', en: 'Lavender', bn: 'ল্যাভেন্ডার' },
    { hex: '#964B00', en: 'Brown', bn: 'বাদামি' },
    { hex: '#F5F5DC', en: 'Beige', bn: 'বেইজ' },
    { hex: '#FFFDD0', en: 'Cream', bn: 'ক্রিম' },
    { hex: '#808080', en: 'Grey', bn: 'গ্রে' },
    { hex: '#36454F', en: 'Charcoal', bn: 'চারকোল' },
    { hex: '#C0C0C0', en: 'Silver', bn: 'সিলভার' },
];

