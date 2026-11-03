import {Link} from 'react-router-dom';
import PropertyRoomTypes from '../../components/detail/PropertyRoomTypes.jsx';
import {MotionButton} from '../../components/motion/MotionUI.jsx';
import {DetailImage,DetailRules,DetailAmenities,DetailDistances,DetailReviews,DetailRatingBars,DetailSimilar} from '../../components/detail/DetailPrototypeParts.jsx';
// Markup converted directly from Code/giao_dien/js/detail.js; API values are React text/props.
export default function DetailPrototype({room,item,isWishlisted,onSave,onShare,onReport,onSchedule,onPhoto,onBack,savedIds,onSaveSimilar}){
 return <main id="detailApp">

    <div className="breadcrumb-wrapper">
      <div className="container breadcrumb-inner">
        <MotionButton type="button" className="btn-back-link" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Quay lại tìm kiếm</span>
        </MotionButton>
      </div>
    </div>


    <div className="container">

      <section className="detail-header-section">
        <div className="detail-header-row">
          <div className="detail-title-col">
            <div className="detail-badge-group">
              <span className="badge-verified-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Hồ sơ nhà trọ đã xác minh
              </span>
              <span className="badge-avail-pill">
                <span className="dot"></span>
                {room.availability}
              </span>
              {null}
            </div>

            <h1 className="detail-main-title">{item.propertyName}</h1>

            <div className="detail-meta-line">
              <span className="detail-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {room.location}
              </span>
              <span className="detail-meta-item" style={{"color": "var(--primary)", "fontWeight": "700"}}>
                • {room.campusDistance}
              </span>
              <span className="detail-meta-item rating">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="star-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                {room.ratingDisplay}
              </span>
            </div>
          </div>

          <div className="detail-actions-col">
            <MotionButton type="button" className="btn-header-action" id="btnShareRoom" onClick={onShare}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              <span>Chia sẻ</span>
            </MotionButton>
            <MotionButton type="button" className={"btn-header-action " + (isWishlisted ? 'active-wishlist' : '')} id="btnWishlistRoom" onClick={onSave} aria-pressed={isWishlisted} title="Lưu trên thiết bị này">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
              <span id="wishlistText">{isWishlisted ? 'Đã lưu' : 'Lưu tin'}</span>
            </MotionButton>
            <MotionButton type="button" className="btn-header-action btn-header-report" id="btnReportListing" onClick={onReport} title="Báo cáo thông tin nhà trọ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
              <span>Báo cáo thông tin</span>
            </MotionButton>
          </div>
        </div>
      </section>


      <section className="gallery-container">
        <h2 className="property-gallery-title">Hình ảnh nhà trọ</h2>
        {!room.gallery.length&&<p className="detail-empty-note">Chủ trọ chưa cập nhật hình ảnh nhà trọ.</p>}
        <div className="gallery-grid" id="mainGalleryGrid">
          <button className="gallery-item main-item" data-idx="0" type="button" aria-label="Xem ảnh 1" onClick={()=>onPhoto(0)} disabled={!room.gallery[0]}>
            <DetailImage src={(room.gallery[0]?.url)} alt={(room.title) + " - Ảnh 1"} loading="eager"/>
          </button>
          <button className="gallery-item" data-idx="1" type="button" aria-label="Xem ảnh 2" onClick={()=>onPhoto(1)} disabled={!room.gallery[1]}>
            <DetailImage src={(room.gallery[1]?.url)} alt={(room.title) + " - Ảnh 2"} loading="lazy"/>
          </button>
          <button className="gallery-item" data-idx="2" type="button" aria-label="Xem ảnh 3" onClick={()=>onPhoto(2)} disabled={!room.gallery[2]}>
            <DetailImage src={(room.gallery[2]?.url)} alt={(room.title) + " - Ảnh 3"} loading="lazy"/>
          </button>
          <button className="gallery-item" data-idx="3" type="button" aria-label="Xem ảnh 4" onClick={()=>onPhoto(3)} disabled={!room.gallery[3]}>
            <DetailImage src={(room.gallery[3]?.url)} alt={(room.title) + " - Ảnh 4"} loading="lazy"/>
          </button>
          <button className="gallery-item" data-idx="4" type="button" aria-label="Xem ảnh 5" onClick={()=>onPhoto(4)} disabled={!room.gallery[4]}>
            <DetailImage src={(room.gallery[4]?.url)} alt={(room.title) + " - Ảnh 5"} loading="lazy"/>
          </button>
          <MotionButton type="button" className="gallery-btn-all" id="btnOpenAllPhotos" onClick={()=>onPhoto(0)} disabled={!room.gallery.length}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Xem tất cả {room.gallery.length} ảnh</span>
          </MotionButton>
        </div>
      </section>


      <PropertyRoomTypes item={item}/>
      <div className="detail-main-grid" id="room-type-details">

        <div className="detail-content-col">
          <section className="detail-section-block selected-room-type" aria-labelledby="selected-room-type-title">
            <span className="selected-room-type-label">LOẠI PHÒNG ĐANG XEM</span>
            <h2 id="selected-room-type-title">{item.roomTypeName}</h2>
            <p>Giá, diện tích, tiện nghi và chi phí bên dưới áp dụng cho loại phòng này.</p>
            <div className="selected-room-photos">{item.gallery.map((photo,index)=><DetailImage key={photo.url} src={photo.url} alt={`${item.roomTypeName} — ảnh ${index+1}`}/>)}</div>
            {!item.gallery.length&&<p className="detail-empty-note">Chưa cập nhật ảnh riêng của loại phòng này.</p>}
          </section>

          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Tổng quan phòng trọ
            </h2>
            <div className="specs-grid">
              <div className="spec-item">
                <div className="spec-icon-box">🏠</div>
                <div className="spec-info">
                  <span className="spec-label">Loại hình</span>
                  <span className="spec-value">{room.typeName}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">📐</div>
                <div className="spec-info">
                  <span className="spec-label">Diện tích</span>
                  <span className="spec-value">{room.area}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">👥</div>
                <div className="spec-info">
                  <span className="spec-label">Sức chứa</span>
                  <span className="spec-value">{room.specs.capacity}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">🛏️</div>
                <div className="spec-info">
                  <span className="spec-label">Phòng ngủ</span>
                  <span className="spec-value">{room.specs.bedroom}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">🚿</div>
                <div className="spec-info">
                  <span className="spec-label">Phòng tắm</span>
                  <span className="spec-value">{room.specs.bathroom}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">🛋️</div>
                <div className="spec-info">
                  <span className="spec-label">Nội thất</span>
                  <span className="spec-value">{room.specs.furniture}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">🟢</div>
                <div className="spec-info">
                  <span className="spec-label">Tình trạng</span>
                  <span className="spec-value">{room.availability}</span>
                </div>
              </div>
              <div className="spec-item">
                <div className="spec-icon-box">📅</div>
                <div className="spec-info">
                  <span className="spec-label">Nhận phòng</span>
                  <span className="spec-value">{room.moveInDate}</span>
                </div>
              </div>
            </div>
          </div>


          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Chi phí thuê &amp; Biểu phí dịch vụ
            </h2>
            <div className="pricing-card">
              <div className="pricing-card-header">
                <div className="pricing-header-left">
                  <span className="price-big-label">Giá thuê niêm yết</span>
                  <div style={{"display": "flex", "alignItems": "baseline", "gap": "6px"}}>
                    <span className="price-big-value">{room.priceDisplay}</span>
                    <span className="price-big-unit">/ tháng</span>
                  </div>
                </div>
                <span className="badge-verified-pill" style={{"fontSize": "13px"}}>
                  ✓ Giá theo thông tin chủ trọ
                </span>
              </div>
              <div className="pricing-card-body">
                <div className="fee-list-grid">
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">⚡ Tiền điện sinh hoạt</span>
                      <span className="fee-rate">{room.electric}</span>
                    </div>
                    <span className="fee-note">{room.electricNote}</span>
                  </div>
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">💧 Tiền nước sinh hoạt</span>
                      <span className="fee-rate">{room.water}</span>
                    </div>
                    <span className="fee-note">{room.waterNote}</span>
                  </div>
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">🌐 Mạng Internet Wifi 6</span>
                      <span className="fee-rate">{room.internet}</span>
                    </div>
                    <span className="fee-note">{room.internetNote}</span>
                  </div>
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">🛡️ Tiền đặt cọc</span>
                      <span className="fee-rate">{room.deposit}</span>
                    </div>
                    <span className="fee-note">Điều kiện đặt cọc và hoàn cọc theo thỏa thuận thuê.</span>
                  </div>
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">🧹 Phí dịch vụ &amp; rác thải</span>
                      <span className="fee-rate">{room.serviceFee}</span>
                    </div>
                    <span className="fee-note">{room.serviceFeeNote}</span>
                  </div>
                  <div className="fee-row-item">
                    <div className="fee-row-top">
                      <span className="fee-name">🛵 Phí gửi xe máy</span>
                      <span className="fee-rate">{room.parkingFee}</span>
                    </div>
                    <span className="fee-note">{room.parkingFeeNote}</span>
                  </div>
                </div>

                <div className="estimate-box">
                  <div className="estimate-text">
                    💡 <strong>Chi phí ban đầu:</strong> Tiền phòng + Tiền cọc (chưa gồm điện nước)
                  </div>
                  <div className="estimate-val">{room.estimateDisplay}</div>
                </div>
              </div>
            </div>
          </div>


          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Mô tả chi tiết phòng trọ
            </h2>
            <div className="description-body" id="descContent">
              {room.description.split(/\n\n|\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
            </div>

            <div style={{"marginTop": "24px"}}>
              <h3 style={{"fontSize": "15px", "fontWeight": "700", "color": "var(--slate-900)", "marginBottom": "8px"}}>Quy định sinh hoạt tại nhà trọ:</h3>
              <ul className="rules-list">
                {<DetailRules items={room.rules}/>}
              </ul>
            </div>
          </div>


          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Tiện nghi &amp; Trang thiết bị có sẵn
            </h2>
            <div className="amenities-feature-grid">
              {<DetailAmenities items={room.amenities}/>}
            </div>
          </div>


          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Vị trí &amp; Khoảng cách tiện ích
            </h2>
            <div className="location-overview-card">
              <div className="location-address-row">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="location-icon-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <div className="location-text-full">{room.location}</div>
              </div>

              <div className="distances-list"><DetailDistances items={room.distances}/></div><small className="detail-demo-note">Khoảng cách minh họa từ bản thiết kế · vui lòng xác nhận thực tế với chủ trọ.</small>
            </div>


            <div className="map-preview-box">
              <div className="map-overlay-layer"></div>
              <div className="map-pin-banner">
                <div className="map-pin-pulse">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <strong style={{"fontSize": "15px"}}>Định vị khu vực {room.locationShort}</strong>
                <a href={"https://maps.google.com/?q=" + (encodeURIComponent(room.location))} target="_blank" rel="noopener" className="map-btn-open">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                  <span>Xem trên Google Maps</span>
                </a>
              </div>
            </div>
          </div>


          <div className="detail-section-block" id="host-contact">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Thông tin chủ nhà trọ
            </h2>
            <div className="host-profile-box">
              <div className="host-avatar-group">
                <DetailImage src={(room.hostInfo.avatar)} alt={(room.hostInfo.name)} className="host-avatar-img"/>
                <div>
                  <div className="host-details-name">
                    {room.hostInfo.name}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="host-verified-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                  </div>
                  <div className="host-meta-sub">
                    <span>{room.hostInfo.role}</span>
                    <span>•</span>
                    <span>{room.hostInfo.joined}</span>
                    <span>•</span>
                    <span style={{"color": "var(--primary)", "fontWeight": "700"}}>{room.hostInfo.responseRate}</span>
                  </div>
                </div>
              </div>
              <div className="host-actions-group">
                <a href={room.hostInfo.phone ? "tel:"+room.hostInfo.phone : undefined} aria-disabled={!room.hostInfo.phone} className="btn-host-call">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span>Gọi chủ nhà</span>
                </a>
                <a href={room.hostInfo.zalo ? "https://zalo.me/"+room.hostInfo.zalo : undefined} aria-disabled={!room.hostInfo.zalo} target="_blank" rel="noopener" className="btn-host-zalo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.48 5.43 3.77 7.02L5 22l4.13-1.84c.91.24 1.87.37 2.87.37 5.52 0 10-4.03 10-9s-4.48-9-10-9z"></path></svg>
                  <span>Chat Zalo</span>
                </a>
              </div>
            </div>
          </div>


          <div className="detail-section-block">
            <h2 className="detail-block-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Đánh giá thực tế từ người thuê
            </h2>
            <div className="reviews-summary-card">
              <div className="reviews-score-col">
                <div className="score-number">{room.rating}</div>
                <div className="score-stars" aria-label={room.ratingDisplay}>{room.rating === "—" ? "☆☆☆☆☆" : "★".repeat(Math.round(Number(room.rating))) + "☆".repeat(5-Math.round(Number(room.rating)))}</div>
                <div className="score-count-label">Dựa trên {room.ratingCount} lượt đánh giá</div>
              </div>
              <DetailRatingBars reviews={item.reviews}/>
            </div>


            <div className="reviews-feed-list">
              {<DetailReviews items={room.reviews}/>}
            </div>
          </div>
        </div>


        <aside className="sticky-sidebar-wrap">
          <div className="booking-card">
            <div className="booking-header-price">
              <div>
                <span className="price-sidebar-val">{room.priceDisplay}</span>
                <span className="price-sidebar-unit">/ tháng</span>
              </div>
              <span className="sidebar-status-tag">
                ● {room.availability}
              </span>
            </div>

            <div className="sidebar-highlights">
              <div className="sidebar-hl-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span><strong>Tiền cọc:</strong> {room.deposit}</span>
              </div>
              <div className="sidebar-hl-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span><strong>Điện &amp; Nước:</strong> {room.electric} • {room.water}</span>
              </div>
              <div className="sidebar-hl-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span><strong>Giữ chỗ:</strong> Xem phòng thực tế trước khi cọc</span>
              </div>
            </div>

            <div className="booking-cta-stack">
              <MotionButton type="button" className="btn-book-primary" id="btnOpenScheduleModal" onClick={onSchedule}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Đặt lịch xem phòng trực tiếp</span>
              </MotionButton>
              <a href={room.hostInfo.phone ? "tel:"+room.hostInfo.phone : undefined} aria-disabled={!room.hostInfo.phone} className="btn-call-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>Gọi chủ trọ: {room.hostInfo.phone || 'Chưa cập nhật'}</span>
              </a>
              <a href={room.hostInfo.zalo ? "https://zalo.me/"+room.hostInfo.zalo : undefined} aria-disabled={!room.hostInfo.zalo} target="_blank" rel="noopener" className="btn-zalo-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.48 5.43 3.77 7.02L5 22l4.13-1.84c.91.24 1.87.37 2.87.37 5.52 0 10-4.03 10-9s-4.48-9-10-9z"></path></svg>
                <span>Nhắn tin Zalo trực tiếp</span>
              </a>
            </div>

            <div className="trust-safety-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span><strong>Cam kết từ HL_RCS:</strong> 100% không thu phí môi giới. Sinh viên được khảo sát phòng trực tiếp và đối chiếu hợp đồng trước khi thanh toán.</span>
            </div>

            <div className="sidebar-report-link-wrap">
              <MotionButton type="button" className="btn-sidebar-report" id="btnSidebarReportRoom" onClick={onReport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                <span>Phát hiện thông tin sai lệch? Báo cáo nhà trọ</span>
              </MotionButton>
            </div>
          </div>
        </aside>
      </div>
    </div>


    <section className="similar-rooms-section">
      <div className="container">
        <div className="section-header" style={{"marginBottom": "28px"}}>
          <div>
            <span className="section-eyebrow">Gợi ý dành cho bạn</span>
            <h2 className="section-title">Nhà trọ tương tự quanh khu vực Hòa Lạc</h2>
          </div>
          <Link className="btn-ghost" style={{"textDecoration": "none"}} to="/search">Xem tất cả phòng →</Link>
        </div>
        <DetailSimilar rooms={item.similar} savedIds={savedIds} onSave={onSaveSimilar}/>
      </div>
    </section>


    <div className="mobile-bottom-cta">
      <div className="mobile-price-group">
        <span className="mobile-price-val">{room.priceDisplay}</span>
        <span className="mobile-price-unit">/ tháng</span>
      </div>
      <div className="mobile-actions-group">
        <a href={room.hostInfo.phone ? "tel:"+room.hostInfo.phone : undefined} aria-disabled={!room.hostInfo.phone} className="btn-mobile-call">Gọi chủ trọ</a>
        <MotionButton type="button" className="btn-mobile-book" id="btnMobileBook" onClick={onSchedule}>Đặt lịch xem</MotionButton>
      </div>
    </div>
  </main>;
}
