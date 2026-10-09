// Bangladesh Delivery Zone Data
// Delivery charge logic:
//   - চট্টগ্রাম জেলা, মীরসরাই উপজেলা → FREE
//   - চট্টগ্রাম জেলা (অন্যান্য উপজেলা বা সিটি থানা) → ৳100
//   - অন্য যেকোনো জেলা → ৳150+

import { districtLocalities } from './bdLocalities';
import { placeNamesEn } from './bdPlaceNames';

export const FREE_UPAZILA = 'মীরসরাই';
export const CHATTOGRAM_DISTRICT = 'চট্টগ্রাম';

export const chattogramUpazilas = districtLocalities[CHATTOGRAM_DISTRICT]?.upazilas || [];

export function localityChoices(district) {
    return districtLocalities[district] || { upazilas: [], cities: [] };
}

/** Dropdown value: u:উপজেলা or t:থানা|সিটি কর্পোরেশন */
export function localityName(value) {
    const raw = String(value || '');
    if (raw.startsWith('t:')) return raw.slice(2).split('|')[0];
    if (raw.startsWith('u:')) return raw.slice(2);
    return raw;
}

export function placeLabel(name, language) {
    const text = String(name || '').trim();
    if (!text || language !== 'en') return text;
    return placeNamesEn[text] || text;
}

export function formatLocation(district, value, language) {
    const raw = String(value || '');
    const label = (name) => placeLabel(name, language);
    if (!district) return '';
    if (raw.startsWith('t:')) {
        const [thana, city] = raw.slice(2).split('|');
        return [label(thana), label(city), label(district)].filter(Boolean).join(', ');
    }
    const name = localityName(raw);
    return name ? `${label(name)}, ${label(district)}` : label(district);
}

export function matchLocality(district, saved) {
    const name = String(saved || '').trim();
    if (!district || !name) return '';
    const { upazilas = [], cities = [] } = localityChoices(district);
    if (upazilas.includes(name)) return `u:${name}`;
    for (const city of cities) {
        if (city.thanas.includes(name)) return `t:${name}|${city.name}`;
    }
    return '';
}

export function splitOrderAddress(raw) {
    const text = String(raw || '').trim();
    const cut = text.indexOf('|');
    if (cut < 0) return { street: text, selected: '' };
    return {
        street: text.slice(0, cut).trim(),
        selected: text.slice(cut + 1).trim(),
    };
}

// All 64 districts of Bangladesh (sorted with চট্টগ্রাম first for convenience)
export const allDistricts = [
    // Chattogram Division
    'চট্টগ্রাম',
    'কক্সবাজার',
    'কুমিল্লা',
    'ব্রাহ্মণবাড়িয়া',
    'চাঁদপুর',
    'লক্ষ্মীপুর',
    'নোয়াখালী',
    'ফেনী',
    'খাগড়াছড়ি',
    'রাঙ্গামাটি',
    'বান্দরবান',
    // Dhaka Division
    'ঢাকা',
    'গাজীপুর',
    'নারায়ণগঞ্জ',
    'মানিকগঞ্জ',
    'মুন্সিগঞ্জ',
    'নরসিংদী',
    'টাঙ্গাইল',
    'কিশোরগঞ্জ',
    'মাদারীপুর',
    'শরীয়তপুর',
    'ফরিদপুর',
    'গোপালগঞ্জ',
    'রাজবাড়ী',
    // Barishal Division
    'বরিশাল',
    'ভোলা',
    'ঝালকাঠি',
    'পটুয়াখালী',
    'পিরোজপুর',
    'বরগুনা',
    // Khulna Division
    'খুলনা',
    'বাগেরহাট',
    'সাতক্ষীরা',
    'যশোর',
    'নড়াইল',
    'মাগুরা',
    'কুষ্টিয়া',
    'মেহেরপুর',
    'চুয়াডাঙ্গা',
    'ঝিনাইদহ',
    // Mymensingh Division
    'ময়মনসিংহ',
    'জামালপুর',
    'শেরপুর',
    'নেত্রকোনা',
    // Rajshahi Division
    'রাজশাহী',
    'চাঁপাইনবাবগঞ্জ',
    'নওগাঁ',
    'নাটোর',
    'পাবনা',
    'সিরাজগঞ্জ',
    'বগুড়া',
    'জয়পুরহাট',
    // Rangpur Division
    'রংপুর',
    'দিনাজপুর',
    'কুড়িগ্রাম',
    'লালমনিরহাট',
    'গাইবান্ধা',
    'নীলফামারী',
    'পঞ্চগড়',
    'ঠাকুরগাঁও',
    // Sylhet Division
    'সিলেট',
    'মৌলভীবাজার',
    'হবিগঞ্জ',
    'সুনামগঞ্জ'
];

/**
 * Get delivery charge info based on selected district and upazila
 */
export function getDeliveryInfo(district, upazila) {
    if (district === CHATTOGRAM_DISTRICT && upazila === FREE_UPAZILA) {
        return { area: 'mirsarai', charge: 0, advance: 100, label: 'ফ্রি ডেলিভারি!' };
    }
    if (district === CHATTOGRAM_DISTRICT) {
        return { area: 'chattogram', charge: 100, label: 'ডেলিভারি চার্জ: ৳১০০' };
    }
    return { area: 'outside', charge: 150, label: 'ডেলিভারি চার্জ: ৳১৫০' };
}
