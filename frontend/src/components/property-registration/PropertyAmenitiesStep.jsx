import {
  AlertCircle,
  ArrowUpDown,
  Bike,
  Building2,
  Car,
  Check,
  ClipboardList,
  Clock3,
  DoorOpen,
  Droplets,
  Fingerprint,
  Flame,
  KeyRound,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Users,
  Video,
  WashingMachine,
  Wifi
} from 'lucide-react';
import FieldWrapper from './FieldWrapper.jsx';
import {
  AMENITIES,
  DEFAULT_QUIET_HOURS_TIME,
  RULES,
  getQuietHoursTime,
  hasQuietHoursRule,
  setQuietHoursRule
} from '../../services/property-registration.js';

const AMENITY_ICONS = {
  parking: Car,
  fingerprint: Fingerprint,
  camera: Video,
  flexibleHours: Clock3,
  fireSafety: Flame,
  separateOwner: KeyRound,
  wifi: Wifi,
  laundry: WashingMachine,
  drying: Sun,
  cleaning: Sparkles,
  water: Droplets,
  elevator: ArrowUpDown,
  security: ShieldCheck,
  emergencyExit: DoorOpen,
  emergencyLighting: Lightbulb,
  wasteCollection: Trash2,
  bicycleParking: Bike,
  commonArea: Users
};

export default function PropertyAmenitiesStep({
  data,
  errors,
  quietTimeDraft,
  onQuietTimeChange,
  inputProps,
  onUpdate
}) {
  const quietChecked = hasQuietHoursRule(data.selectedRules);
  const activeQuietTime = quietChecked ? getQuietHoursTime(data.selectedRules) : quietTimeDraft;

  function toggleAmenity(key) {
    const next = data.amenities.includes(key)
      ? data.amenities.filter((item) => item !== key)
      : [...data.amenities, key];
    onUpdate('amenities', next);
  }

  function toggleRule(key) {
    const next = data.selectedRules.includes(key)
      ? data.selectedRules.filter((item) => item !== key)
      : [...data.selectedRules, key];
    onUpdate('selectedRules', next);
  }

  return (
    <div className="prw-step-body">
      {/* Group A: Selectable Amenity Cards */}
      <section className="prw-group-card" aria-labelledby="prw-group-amenities">
        <div className="prw-group-head-split">
          <div className="prw-group-head">
            <span className="prw-group-icon" aria-hidden="true">
              <Building2 size={17} />
            </span>
            <div>
              <h4 id="prw-group-amenities">Tiện ích &amp; cơ sở vật chất chung</h4>
              <p>Chọn các tiện ích hiện có tại toàn nhà trọ để giúp người thuê lọc phòng chính xác.</p>
            </div>
          </div>
          <div className="prw-count-group">
            <span className="prw-count-pill">
              Đã chọn {data.amenities.length}/{AMENITIES.length}
            </span>
            {data.amenities.length > 0 && (
              <button
                type="button"
                className="prw-clear-link"
                onClick={() => onUpdate('amenities', [])}
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
        </div>

        <div className="prw-choice-grid" role="group" aria-label="Danh sách tiện ích nhà trọ">
          {AMENITIES.map(([key, label]) => {
            const selected = data.amenities.includes(key);
            const Icon = AMENITY_ICONS[key] || Sparkles;
            return (
              <label
                key={key}
                className={`prw-choice-card${selected ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="prw-sr-checkbox"
                  checked={selected}
                  onChange={() => toggleAmenity(key)}
                />
                <span className="prw-choice-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <span className="prw-choice-label">{label}</span>
                <span className="prw-choice-check" aria-hidden="true">
                  {selected && <Check size={13} strokeWidth={2.8} />}
                </span>
              </label>
            );
          })}
        </div>

        {errors.amenities && (
          <p id="amenities-error" className="prw-field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{errors.amenities}</span>
          </p>
        )}
      </section>

      {/* Group B: House Rules */}
      <section className="prw-group-card" aria-labelledby="prw-group-rules">
        <div className="prw-group-head-split">
          <div className="prw-group-head">
            <span className="prw-group-icon" aria-hidden="true">
              <ClipboardList size={17} />
            </span>
            <div>
              <h4 id="prw-group-rules">Quy định sinh hoạt chung</h4>
              <p>Thiết lập nội quy minh bạch để khách thuê nắm rõ ngay từ khi tìm phòng.</p>
            </div>
          </div>
          <span className="prw-count-pill">
            Đã chọn {data.selectedRules.length} quy định
          </span>
        </div>

        <div className="prw-choice-grid prw-rules-grid" role="group" aria-label="Danh sách quy định nhà trọ">
          {RULES.map(([key, label]) => {
            if (key === 'quietHours') {
              return (
                <div
                  key="quietHours"
                  className={`prw-choice-card prw-quiet-card${quietChecked ? ' is-selected' : ''}`}
                >
                  <label className="prw-quiet-toggle">
                    <input
                      type="checkbox"
                      className="prw-sr-checkbox"
                      checked={quietChecked}
                      onChange={(event) =>
                        onUpdate(
                          'selectedRules',
                          setQuietHoursRule(data.selectedRules, event.target.checked, activeQuietTime)
                        )
                      }
                    />
                    <span className="prw-choice-icon" aria-hidden="true">
                      <Clock3 size={17} />
                    </span>
                    <span className="prw-choice-label">Giữ trật tự sau</span>
                    <span className="prw-choice-check" aria-hidden="true">
                      {quietChecked && <Check size={13} strokeWidth={2.8} />}
                    </span>
                  </label>
                  <input
                    type="time"
                    className="prw-quiet-time-input"
                    aria-label="Giờ giữ trật tự"
                    value={activeQuietTime}
                    onChange={(event) => {
                      const nextTime = event.target.value || DEFAULT_QUIET_HOURS_TIME;
                      onQuietTimeChange(nextTime);
                      onUpdate('selectedRules', setQuietHoursRule(data.selectedRules, true, nextTime));
                    }}
                  />
                </div>
              );
            }

            const selected = data.selectedRules.includes(key);
            return (
              <label
                key={key}
                className={`prw-choice-card${selected ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="prw-sr-checkbox"
                  checked={selected}
                  onChange={() => toggleRule(key)}
                />
                <span className="prw-choice-label">{label}</span>
                <span className="prw-choice-check" aria-hidden="true">
                  {selected && <Check size={13} strokeWidth={2.8} />}
                </span>
              </label>
            );
          })}
        </div>

        {errors.selectedRules && (
          <p id="selectedRules-error" className="prw-field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{errors.selectedRules}</span>
          </p>
        )}

        <details className="prw-collapsible" open={Boolean(errors.rules) || Boolean(data.rules) || undefined}>
          <summary>
            <span>Quy định bổ sung khác (không bắt buộc)</span>
          </summary>
          <div className="prw-collapsible-body">
            <FieldWrapper
              name="rules"
              label="Nội quy bổ sung"
              optional
              count={data.rules.length}
              max={2000}
              error={errors.rules}
            >
              <textarea
                {...inputProps('rules')}
                rows={4}
                maxLength={2000}
                placeholder="Nhập thêm các quy định riêng về gửi xe, khách đến chơi, phân loại rác..."
              />
            </FieldWrapper>
          </div>
        </details>
      </section>
    </div>
  );
}
