import { localityChoices, placeLabel } from '../data/bdLocations';

export function localityPrompt(district, language) {
  const bn = language === 'bn';
  if (!district) return bn ? 'উপজেলা বা থানা নির্বাচন করুন' : 'Select upazila or thana';
  const { cities = [] } = localityChoices(district);
  if (cities.length) return bn ? 'উপজেলা বা থানা নির্বাচন করুন' : 'Select upazila or thana';
  return bn ? 'উপজেলা নির্বাচন করুন' : 'Select upazila';
}

export function localityOptionList(district, language) {
  if (!district) return [];
  const { upazilas = [], cities = [] } = localityChoices(district);
  const bn = language === 'bn';
  const options = [];
  if (upazilas.length) {
    const group = bn ? 'উপজেলা' : 'Upazila';
    upazilas.forEach((name) => {
      options.push({ value: `u:${name}`, label: placeLabel(name, language), group });
    });
  }
  cities.forEach((city) => {
    const group = bn ? `${city.name} · থানা` : `${placeLabel(city.name, language)} · Thana`;
    city.thanas.forEach((name) => {
      options.push({
        value: `t:${name}|${city.name}`,
        label: placeLabel(name, language),
        group,
      });
    });
  });
  return options;
}

export default function LocalityOptions({ district, language }) {
  if (!district) {
    return <option value="">{localityPrompt('', language)}</option>;
  }
  const { upazilas = [], cities = [] } = localityChoices(district);
  const bn = language === 'bn';
  return (
    <>
      <option value="">{localityPrompt(district, language)}</option>
      {upazilas.length > 0 && (
        <optgroup label={bn ? 'উপজেলা' : 'Upazila'}>
          {upazilas.map((name) => (
            <option key={`u:${name}`} value={`u:${name}`}>{name}</option>
          ))}
        </optgroup>
      )}
      {cities.map((city) => (
        <optgroup key={city.name} label={bn ? `${city.name} · থানা` : `${city.name} · Thana`}>
          {city.thanas.map((name) => (
            <option key={`t:${name}|${city.name}`} value={`t:${name}|${city.name}`}>{name}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
