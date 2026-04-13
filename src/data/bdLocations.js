// Bangladesh Delivery Zone Data
// Delivery charge logic:
//   - চট্টগ্রাম জেলা, মীরসরাই উপজেলা → FREE
//   - চট্টগ্রাম জেলা (অন্যান্য উপজেলা) → ৳100
//   - অন্য যেকোনো জেলা → ৳150+

export const FREE_UPAZILA = 'মীরসরাই';
export const CHATTOGRAM_DISTRICT = 'চট্টগ্রাম';

// Upazilas of Chattogram district (needed to identify Mirsarai)
export const chattogramUpazilas = [
    'মীরসরাই',
    'সীতাকুণ্ড',
    'ফটিকছড়ি',
    'হাটহাজারী',
    'রাউজান',
    'রাঙ্গুনিয়া',
    'বোয়ালখালী',
    'পটিয়া',
    'চন্দনাইশ',
    'সাতকানিয়া',
    'লোহাগাড়া',
    'বাঁশখালী',
    'আনোয়ারা',
    'কর্ণফুলী',
    'সন্দ্বীপ',
    'চট্টগ্রাম সিটি কর্পোরেশন'
];

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
