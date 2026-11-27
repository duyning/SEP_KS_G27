import { useState } from 'react';
import {
  Armchair, Bath, BedDouble, Building2, Camera, Check, Clock3, CookingPot, Fence,
  Flame, GraduationCap, KeyRound, Refrigerator, SlidersHorizontal, Snowflake, WashingMachine,
} from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import useAccommodations from '../hooks/useAccommodations.js';
import { accommodationQuery } from '../services/accommodations.js';
import { CAMPUS_RADIUS_KM, SEARCH_CAMPUSES, formatDistance, searchCampusForOrigin } from '../services/search-origin.js';
import { DEFAULT_SEARCH_SORT, searchLocations, searchPrices, searchTypes } from '../services/search-prototype.js';

const radiusOptions = [1, 2, 3, 5, null];
const amenityGroups = [
  ['Trong phòng', [
    ['airConditioner', 'Điều hòa', Snowflake], ['waterHeater', 'Bình nóng lạnh', Bath],
    ['washingMachine', 'Máy giặt', WashingMachine], ['refrigerator', 'Tủ lạnh', Refrigerator],
    ['kitchen', 'Bếp riêng', CookingPot], ['balcony', 'Ban công', Fence],
  ]],
  ['Tòa nhà & an ninh', [
    ['elevator', 'Thang máy', Building2], ['fingerprint', 'Khóa vân tay / thẻ từ', KeyRound],
    ['camera', 'Camera an ninh', Camera], ['fireSafety', 'Phòng cháy chữa cháy', Flame],
  ]],
  ['Sinh hoạt', [
    ['flexibleHours', 'Giờ giấc tự do', Clock3], ['separateOwner', 'Không chung chủ', Armchair],
  ]],
];
const number = new Intl.NumberFormat('vi-VN');

export function SearchSelectField({ id, label, options, value, onChange }) {
  return <div className="search-field-select">
    <label className="search-sr-only" htmlFor={id}>{label}</label>
    <select id={id} className="search-select-dropdown" value={value} onChange={event => onChange(event.target.value)}>
      {options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}
    </select>
  </div>;
}

export default function SearchFiltersDialog({ filters, origin, onApply, onClose }) {
  const [draft, setDraft] = useState(() => ({
    location: filters.location, price: filters.price, type: filters.type, amenities: filters.amenities,
    availableOnly: filters.availableOnly, origin, radiusKm: filters.radiusKm ?? null,
  }));
  const campus = searchCampusForOrigin(draft.origin);
  const customOrigin = origin && !searchCampusForOrigin(origin) ? origin : null;
  const areaChanged = draft.origin?.originLat !== origin?.originLat || draft.origin?.originLng !== origin?.originLng;
  const sort = draft.origin && areaChanged ? 'nearest' : !draft.origin && filters.sort === 'nearest' ? DEFAULT_SEARCH_SORT : filters.sort;
  const { origin: draftOrigin, ...criteria } = draft;
  const query = accommodationQuery({
    ...criteria, ...draftOrigin, q: filters.q, page: 0, size: 1, amenities: draft.amenities.join(','),
  });
  const { data, loading, error } = useAccommodations(query);
  const distances = draft.radiusKm !== null && !radiusOptions.includes(draft.radiusKm)
    ? [...radiusOptions.slice(0, -1), draft.radiusKm, null] : radiusOptions;

  function update(field, value) {
    setDraft(previous => ({ ...previous, [field]: value }));
  }

  function chooseLocation(point) {
    setDraft(previous => ({
      ...previous, origin: point, radiusKm: point ? previous.origin ? previous.radiusKm : CAMPUS_RADIUS_KM : null,
    }));
  }

  function toggleAmenity(key) {
    setDraft(previous => ({
      ...previous,
      amenities: previous.amenities.includes(key) ? previous.amenities.filter(value => value !== key) : [...previous.amenities, key],
    }));
  }

  function reset() {
    setDraft({ location: 'all', price: 'all', type: 'all', amenities: [], availableOnly: false, origin: null, radiusKm: null });
  }

  function submit(event) {
    event.preventDefault();
    onApply({
      ...criteria, originLat: draftOrigin?.originLat, originLng: draftOrigin?.originLng,
      sort: sort === DEFAULT_SEARCH_SORT ? null : sort,
    });
  }

  return <Modal title="Bộ lọc tìm phòng" onClose={onClose} className="search-filter-dialog">
    <form className="search-filter-form" onSubmit={submit}>
      <div className="search-filter-body">
        <div className="search-filter-location">
          <fieldset className="search-filter-campuses">
            <legend><GraduationCap size={19} aria-hidden="true"/> Gần trường</legend>
            <div className="search-filter-campus-options">
              <label className="search-filter-campus-option">
                <input type="radio" name="search-campus" checked={!draftOrigin} onChange={() => chooseLocation(null)}/>
                <span><strong>Tất cả khu vực</strong></span>
              </label>
              {SEARCH_CAMPUSES.map(school => <label className="search-filter-campus-option" key={school.id}>
                <input type="radio" name="search-campus" checked={campus?.id === school.id} onChange={() => chooseLocation(school.origin)}/>
                <span><strong>{school.name}</strong><small>{school.site}</small></span>
              </label>)}
              {customOrigin && <label className="search-filter-campus-option">
                <input type="radio" name="search-campus" checked={Boolean(draftOrigin && !campus)} onChange={() => chooseLocation(customOrigin)}/>
                <span><strong>Ghim đã chọn trên bản đồ</strong><small>Địa điểm tùy chọn</small></span>
              </label>}
            </div>
          </fieldset>
          <fieldset className="search-filter-radius" disabled={!draftOrigin}>
            <legend>Bán kính tìm kiếm</legend>
            <div>
              {distances.map(km => <label className="search-filter-radius-option" key={km ?? 'any'}>
                <input type="radio" name="search-radius" checked={Boolean(draftOrigin) && draft.radiusKm === km} onChange={() => update('radiusKm', km)}/>
                <span>{km === null ? 'Mọi khoảng cách' : `≤ ${formatDistance(km)}`}</span>
              </label>)}
            </div>
            <p>{draftOrigin ? 'Khoảng cách đường thẳng từ mốc đã chọn.' : 'Chọn trường để đặt bán kính theo đường thẳng.'}</p>
          </fieldset>
        </div>
        <div className="search-filter-refinements">
          <fieldset className="search-filter-basics">
            <legend><SlidersHorizontal size={18} aria-hidden="true"/> Khu vực và mức thuê</legend>
            <div>
              <SearchSelectField id="advancedLocation" label="Khu vực" options={searchLocations} value={draft.location} onChange={value => update('location', value)}/>
              <SearchSelectField id="advancedPrice" label="Mức giá thuê" options={searchPrices} value={draft.price} onChange={value => update('price', value)}/>
              <SearchSelectField id="advancedType" label="Loại phòng" options={searchTypes} value={draft.type} onChange={value => update('type', value)}/>
            </div>
          </fieldset>
          <label className="search-filter-availability">
            <span className="search-filter-option-icon"><BedDouble size={19} aria-hidden="true"/></span>
            <span><strong>Chỉ phòng còn trống</strong><small>Theo tình trạng chủ trọ cập nhật</small></span>
            <input type="checkbox" checked={draft.availableOnly} onChange={event => update('availableOnly', event.target.checked)}/>
          </label>
          {amenityGroups.map(([title, options]) => <fieldset className="search-filter-amenities" key={title}>
            <legend>{title}</legend>
            <div>
              {options.map(([key, label, Icon]) => <label className="search-filter-amenity" key={key}>
                <span className="search-filter-option-icon"><Icon size={17} aria-hidden="true"/></span>
                <span>{label}</span>
                <input type="checkbox" checked={draft.amenities.includes(key)} onChange={() => toggleAmenity(key)}/>
              </label>)}
            </div>
          </fieldset>)}
        </div>
      </div>
      <footer className="search-filter-footer">
        <p role="status">{loading ? 'Đang đếm kết quả…' : error ? 'Chưa tải được số kết quả' : `${number.format(data.totalElements)} loại phòng phù hợp`}</p>
        <button type="button" className="search-filter-reset" onClick={reset}>Đặt lại</button>
        <button type="submit" className="search-filter-apply"><Check size={18} aria-hidden="true"/>Áp dụng bộ lọc</button>
      </footer>
    </form>
  </Modal>;
}
