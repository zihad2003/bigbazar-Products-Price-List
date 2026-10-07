/** Map an IP city/region onto a Bangladesh district, or a Chattogram upazila when the city is that specific. */

const DISTRICTS = [
  ['chittagong', 'চট্টগ্রাম'],
  ['chattogram', 'চট্টগ্রাম'],
  ['coxs bazar', 'কক্সবাজার'],
  ['coxsbazar', 'কক্সবাজার'],
  ['cox bazar', 'কক্সবাজার'],
  ['comilla', 'কুমিল্লা'],
  ['cumilla', 'কুমিল্লা'],
  ['brahmanbaria', 'ব্রাহ্মণবাড়িয়া'],
  ['chandpur', 'চাঁদপুর'],
  ['lakshmipur', 'লক্ষ্মীপুর'],
  ['laxmipur', 'লক্ষ্মীপুর'],
  ['noakhali', 'নোয়াখালী'],
  ['feni', 'ফেনী'],
  ['khagrachhari', 'খাগড়াছড়ি'],
  ['khagrachari', 'খাগড়াছড়ি'],
  ['rangamati', 'রাঙ্গামাটি'],
  ['bandarban', 'বান্দরবান'],
  ['dhaka', 'ঢাকা'],
  ['dacca', 'ঢাকা'],
  ['gazipur', 'গাজীপুর'],
  ['narayanganj', 'নারায়ণগঞ্জ'],
  ['narayangonj', 'নারায়ণগঞ্জ'],
  ['manikganj', 'মানিকগঞ্জ'],
  ['manikgonj', 'মানিকগঞ্জ'],
  ['munshiganj', 'মুন্সিগঞ্জ'],
  ['munshigonj', 'মুন্সিগঞ্জ'],
  ['narsingdi', 'নরসিংদী'],
  ['tangail', 'টাঙ্গাইল'],
  ['kishoreganj', 'কিশোরগঞ্জ'],
  ['kishoregonj', 'কিশোরগঞ্জ'],
  ['madaripur', 'মাদারীপুর'],
  ['shariatpur', 'শরীয়তপুর'],
  ['faridpur', 'ফরিদপুর'],
  ['gopalganj', 'গোপালগঞ্জ'],
  ['gopalganj', 'গোপালগঞ্জ'],
  ['rajbari', 'রাজবাড়ী'],
  ['barisal', 'বরিশাল'],
  ['barishal', 'বরিশাল'],
  ['bhola', 'ভোলা'],
  ['jhalokati', 'ঝালকাঠি'],
  ['jhalokathi', 'ঝালকাঠি'],
  ['patuakhali', 'পটুয়াখালী'],
  ['pirojpur', 'পিরোজপুর'],
  ['barguna', 'বরগুনা'],
  ['khulna', 'খুলনা'],
  ['bagerhat', 'বাগেরহাট'],
  ['satkhira', 'সাতক্ষীরা'],
  ['jessore', 'যশোর'],
  ['jashore', 'যশোর'],
  ['narail', 'নড়াইল'],
  ['magura', 'মাগুরা'],
  ['kushtia', 'কুষ্টিয়া'],
  ['kushtia', 'কুষ্টিয়া'],
  ['meherpur', 'মেহেরপুর'],
  ['chuadanga', 'চুয়াডাঙ্গা'],
  ['jhenaidah', 'ঝিনাইদহ'],
  ['jhenidah', 'ঝিনাইদহ'],
  ['mymensingh', 'ময়মনসিংহ'],
  ['jamalpur', 'জামালপুর'],
  ['sherpur', 'শেরপুর'],
  ['netrokona', 'নেত্রকোনা'],
  ['netrakona', 'নেত্রকোনা'],
  ['rajshahi', 'রাজশাহী'],
  ['chapainawabganj', 'চাঁপাইনবাবগঞ্জ'],
  ['nawabganj', 'চাঁপাইনবাবগঞ্জ'],
  ['naogaon', 'নওগাঁ'],
  ['natore', 'নাটোর'],
  ['pabna', 'পাবনা'],
  ['sirajganj', 'সিরাজগঞ্জ'],
  ['sirajgonj', 'সিরাজগঞ্জ'],
  ['bogra', 'বগুড়া'],
  ['bogura', 'বগুড়া'],
  ['joypurhat', 'জয়পুরহাট'],
  ['rangpur', 'রংপুর'],
  ['dinajpur', 'দিনাজপুর'],
  ['kurigram', 'কুড়িগ্রাম'],
  ['lalmonirhat', 'লালমনিরহাট'],
  ['gaibandha', 'গাইবান্ধা'],
  ['nilphamari', 'নীলফামারী'],
  ['panchagarh', 'পঞ্চগড়'],
  ['thakurgaon', 'ঠাকুরগাঁও'],
  ['sylhet', 'সিলেট'],
  ['moulvibazar', 'মৌলভীবাজার'],
  ['maulvibazar', 'মৌলভীবাজার'],
  ['moulvi bazar', 'মৌলভীবাজার'],
  ['habiganj', 'হবিগঞ্জ'],
  ['sunamganj', 'সুনামগঞ্জ'],
];

/** Chattogram upazilas. A city hit here is more specific than the district. */
const UPAZILAS = [
  ['mirsarai', 'মীরসরাই'],
  ['mirsharai', 'মীরসরাই'],
  ['sitakunda', 'সীতাকুণ্ড'],
  ['sitakundu', 'সীতাকুণ্ড'],
  ['fatikchhari', 'ফটিকছড়ি'],
  ['fatikchari', 'ফটিকছড়ি'],
  ['hathazari', 'হাটহাজারী'],
  ['raozan', 'রাউজান'],
  ['rangunia', 'রাঙ্গুনিয়া'],
  ['boalkhali', 'বোয়ালখালী'],
  ['patiya', 'পটিয়া'],
  ['chandanaish', 'চন্দনাইশ'],
  ['satkania', 'সাতকানিয়া'],
  ['satkaniya', 'সাতকানিয়া'],
  ['lohagara', 'লোহাগাড়া'],
  ['banshkhali', 'বাঁশখালী'],
  ['bashkhali', 'বাঁশখালী'],
  ['anwara', 'আনোয়ারা'],
  ['karnaphuli', 'কর্ণফুলী'],
  ['sandwip', 'সন্দ্বীপ'],
];

const DISTRICT_BY_KEY = new Map(DISTRICTS);
const UPAZILA_BY_KEY = new Map(UPAZILAS);
const BENGALI_DISTRICTS = new Set(DISTRICTS.map(([, name]) => name));
const BENGALI_UPAZILAS = new Map(UPAZILAS.map(([, name]) => [name, name]));

function normPlace(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/\b(district|division|upazila|upozila|zila|zilla|sadar)\b/g, '')
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupName(raw) {
  const key = normPlace(raw);
  if (!key || key === 'bangladesh') return null;
  if (BENGALI_UPAZILAS.has(raw)) return { district: 'চট্টগ্রাম', upazila: raw };
  if (BENGALI_DISTRICTS.has(raw)) return { district: raw, upazila: null };
  if (UPAZILA_BY_KEY.has(key)) return { district: 'চট্টগ্রাম', upazila: UPAZILA_BY_KEY.get(key) };
  if (DISTRICT_BY_KEY.has(key)) return { district: DISTRICT_BY_KEY.get(key), upazila: null };
  return null;
}

/** City wins over region, so a Feni customer is not labeled as all of Chattogram division. */
export function resolveBdPlace(city, region) {
  return lookupName(city) || lookupName(region) || { district: null, upazila: null };
}

export function withBdPlace(geo) {
  if (!geo) return null;
  const place = resolveBdPlace(geo.city, geo.region);
  return {
    ...geo,
    district: geo.district || place.district,
    upazila: geo.upazila || place.upazila,
  };
}

/** Order address is stored as "street | upazila, district" or "street | district". */
export function orderPlace(address) {
  const loc = String(address || '').split('|')[1]?.trim() || '';
  const bits = loc.split(',').map((s) => s.trim()).filter(Boolean);
  if (bits.length >= 2) return { upazila: bits[0], district: bits[bits.length - 1] };
  if (bits.length === 1) return { upazila: null, district: bits[0] };
  return { upazila: null, district: null };
}
