import { Compass, MapPin, Navigation } from 'lucide-react';
import FieldWrapper from './FieldWrapper.jsx';
import PropertyAddressLookup from '../PropertyAddressLookup.jsx';
import PropertyLocationMap from '../PropertyLocationMap.jsx';
import { AREAS } from '../../services/property-registration.js';

export default function PropertyLocationStep({
  data,
  errors,
  submitting,
  lookup,
  manualCoordinatesOpen,
  onToggleManualCoordinates,
  inputProps,
  onApplyLookup,
  onSelectLocation
}) {
  return (
    <div className="prw-step-body">
      {/* Part A: Structured Address */}
      <section className="prw-group-card" aria-labelledby="prw-group-address">
        <div className="prw-group-head">
          <span className="prw-group-icon" aria-hidden="true">
            <Navigation size={17} />
          </span>
          <div>
            <h4 id="prw-group-address">Thông tin địa chỉ</h4>
            <p>Tìm nhanh địa chỉ hoặc chọn từ khu vực tổng quát đến số nhà, ngõ chi tiết.</p>
          </div>
        </div>

        <div className="prw-lookup-box">
          <PropertyAddressLookup
            lookup={lookup}
            resolveDetails
            coordinates={data}
            disabled={submitting}
            locationKey={[data.latitude, data.longitude, data.addressDetail, data.commune, data.nearby].join('|')}
            onApply={onApplyLookup}
          />
        </div>

        <div className="prw-two-col">
          <FieldWrapper
            name="provinceDisplay"
            label="Tỉnh / Thành phố"
            hint="Khu vực hoạt động hiện tại của hệ thống."
          >
            <input
              id="provinceDisplay"
              type="text"
              value="TP. Hà Nội (Đô thị vệ tinh Hòa Lạc)"
              readOnly
              className="prw-readonly-input"
              aria-readonly="true"
            />
          </FieldWrapper>

          <FieldWrapper
            name="commune"
            label="Xã / Khu vực tại Hòa Lạc"
            required
            hint="Chọn đơn vị hành chính / khu vực của nhà trọ."
            error={errors.commune}
          >
            <select {...inputProps('commune')} required>
              <option value="">— Chọn khu vực —</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area === 'Tân Xã' ? 'Tân Xã (Gần ĐH FPT, hồ Tân Xã)' : area}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        <div className="prw-stack-sm">
          <FieldWrapper
            name="addressDetail"
            label="Địa chỉ chi tiết"
            required
            count={data.addressDetail.length}
            max={255}
            hint="Ghi rõ số nhà, ngõ/ngách, xóm, thôn (từ 10 đến 255 ký tự)."
            error={errors.addressDetail}
          >
            <input
              {...inputProps('addressDetail')}
              maxLength={255}
              autoComplete="street-address"
              required
              placeholder="Ví dụ: Số 18, ngõ 12, Thôn 2"
            />
          </FieldWrapper>

          <FieldWrapper
            name="nearby"
            label="Mô tả vị trí dễ tìm / Điểm lân cận"
            optional
            count={data.nearby.length}
            max={255}
            hint="Giúp người thuê ước lượng nhanh khoảng cách đi học, đi làm hằng ngày."
            error={errors.nearby}
          >
            <input
              {...inputProps('nearby')}
              maxLength={255}
              placeholder="Ví dụ: Cách ĐH FPT 800m, gần chợ Tân Xã, đầu ngõ có quán tạp hóa..."
            />
          </FieldWrapper>
        </div>
      </section>

      {/* Part B: Interactive Leaflet + OpenStreetMap */}
      <section className="prw-group-card" aria-labelledby="prw-group-map">
        <div className="prw-group-head">
          <span className="prw-group-icon" aria-hidden="true">
            <MapPin size={17} />
          </span>
          <div>
            <h4 id="prw-group-map">Vị trí trên bản đồ (Leaflet &amp; OpenStreetMap)</h4>
            <p>Nhấn vào bản đồ, kéo ghim hoặc dùng nút “Vị trí hiện tại” để đánh dấu đúng cổng nhà trọ.</p>
          </div>
        </div>

        <PropertyLocationMap
          commune={data.commune}
          latitude={data.latitude}
          longitude={data.longitude}
          address={[data.addressDetail.trim(), data.commune].filter(Boolean).join(', ')}
          error={errors.location}
          onSelect={onSelectLocation}
        />

        <details
          className="prw-collapsible"
          open={manualCoordinatesOpen}
          onToggle={(event) => onToggleManualCoordinates(event.currentTarget.open)}
        >
          <summary>
            <Compass size={15} aria-hidden="true" />
            <span>Nhập tọa độ vĩ độ / kinh độ thủ công (tùy chọn)</span>
          </summary>
          <div className="prw-two-col prw-collapsible-body">
            <FieldWrapper name="latitude" label="Vĩ độ (Latitude)" error={errors.latitude}>
              <input {...inputProps('latitude')} inputMode="decimal" placeholder="Ví dụ: 21.018800" />
            </FieldWrapper>
            <FieldWrapper name="longitude" label="Kinh độ (Longitude)" error={errors.longitude}>
              <input {...inputProps('longitude')} inputMode="decimal" placeholder="Ví dụ: 105.521500" />
            </FieldWrapper>
          </div>
        </details>
      </section>
    </div>
  );
}
