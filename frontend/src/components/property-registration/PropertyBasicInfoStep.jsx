import { Building2, PhoneCall } from 'lucide-react';
import FieldWrapper from './FieldWrapper.jsx';
import PropertyTypeField from '../PropertyTypeField.jsx';
import PropertyDescriptionAssist from '../PropertyDescriptionAssist.jsx';

export default function PropertyBasicInfoStep({
  data,
  errors,
  submitting,
  inputProps,
  onUpdate
}) {
  return (
    <div className="prw-step-body">
      {/* Group A: Property Identity */}
      <section className="prw-group-card" aria-labelledby="prw-group-property">
        <div className="prw-group-head">
          <span className="prw-group-icon" aria-hidden="true">
            <Building2 size={17} />
          </span>
          <div>
            <h4 id="prw-group-property">Thông tin nhà trọ</h4>
            <p>Tên gọi, loại hình và giới thiệu tổng quan giúp người thuê nhận diện cơ sở của bạn.</p>
          </div>
        </div>

        <div className="prw-group-grid">
          <FieldWrapper
            name="name"
            label="Tên nhà trọ"
            required
            count={data.name.length}
            max={100}
            hint='Tên riêng đại diện cho nhà trọ (3–100 ký tự). Ví dụ: "Nhà trọ An Khang" hoặc "An Khang Residence".'
            error={errors.name}
          >
            <input
              {...inputProps('name')}
              maxLength={100}
              required
              placeholder="Ví dụ: Nhà trọ An Khang - Tân Xã"
              autoComplete="organization"
            />
          </FieldWrapper>

          <PropertyTypeField
            value={data.propertyType}
            onChange={(value) => onUpdate('propertyType', value)}
            disabled={submitting}
            error={errors.propertyType}
          />

          <div className="prw-description-block">
            <FieldWrapper
              name="description"
              label="Mô tả nhà trọ"
              required
              count={data.description.length}
              max={2000}
              hint="Mô tả từ 30 đến 2.000 ký tự về không gian sống, an ninh, khoảng cách tới trường/chợ và điểm nổi bật."
              error={errors.description}
            >
              <textarea
                {...inputProps('description')}
                rows={5}
                maxLength={2000}
                required
                placeholder="Giới thiệu không gian nhà trọ, môi trường sống, hệ thống an ninh và các tiện ích xung quanh..."
              />
            </FieldWrapper>

            <PropertyDescriptionAssist
              form={data}
              onApply={(value) => onUpdate('description', value)}
              disabled={submitting}
            />
          </div>
        </div>
      </section>

      {/* Group B: Contact Information */}
      <section className="prw-group-card" aria-labelledby="prw-group-contact">
        <div className="prw-group-head">
          <span className="prw-group-icon" aria-hidden="true">
            <PhoneCall size={17} />
          </span>
          <div>
            <h4 id="prw-group-contact">Thông tin liên hệ quản lý</h4>
            <p>Hiển thị cho người thuê khi đặt lịch xem phòng hoặc cần trao đổi trực tiếp.</p>
          </div>
        </div>

        <div className="prw-contact-grid">
          <FieldWrapper
            name="managerName"
            label="Người liên hệ quản lý"
            required
            hint="Họ tên người trực tiếp đón khách"
            error={errors.managerName}
          >
            <input
              {...inputProps('managerName')}
              maxLength={100}
              autoComplete="name"
              placeholder="Nhập họ tên người quản lý"
              required
            />
          </FieldWrapper>

          <FieldWrapper
            name="contactPhone"
            label="Hotline trực tiếp"
            required
            hint="Số di động Việt Nam (10 số)"
            error={errors.contactPhone}
          >
            <input
              {...inputProps('contactPhone')}
              type="tel"
              maxLength={20}
              autoComplete="tel"
              placeholder="Ví dụ: 0912 345 678"
              required
            />
          </FieldWrapper>

          <FieldWrapper
            name="zaloPhone"
            label="Zalo tư vấn"
            optional
            hint="Để trống nếu trùng Hotline"
            error={errors.zaloPhone}
          >
            <input
              {...inputProps('zaloPhone')}
              type="tel"
              maxLength={20}
              placeholder="Số điện thoại Zalo"
            />
          </FieldWrapper>
        </div>
      </section>
    </div>
  );
}
