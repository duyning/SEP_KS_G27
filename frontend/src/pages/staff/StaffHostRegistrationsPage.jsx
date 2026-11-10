import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { StateView } from '../../components/PortalUI.jsx';
import { staffHostApi } from '../../services/staff-host-applications.js';
import StaffHostShell, {
  HostApplicationStatus,
  date,
  isLongPending,
  relativeTime,
} from './StaffHostShell.jsx';
import StaffHostListTemplate, { StaffHostListSkeleton } from './StaffHostListTemplate.jsx';

const initial = { search: '', status: 'ALL', sort: 'NEWEST', page: 0, size: 8 };

export default function StaffHostRegistrationsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [filters, setFilters] = useState(() => ({
    ...initial,
    search: params.get('search') || '',
    status: params.get('status') || 'ALL',
    sort: params.get('sort') || 'NEWEST',
    page: Math.max(0, Number(params.get('page')) || 0),
  }));
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [copiedKey, setCopiedKey] = useState('');
  const copyTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  useEffect(() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== initial[key]) next.set(key, String(value));
    }
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [filters, params, setParams]);

  // Debounce search (~300ms) so typing does not fire redundant requests or lose focus
  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(
      () => setFilters(previous => ({ ...previous, search: searchInput, page: 0 })),
      300
    );
    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    staffHostApi
      .list(filters, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(
            err.status === 404
              ? 'Backend chưa có API xét duyệt đăng ký làm chủ trọ. Vui lòng khởi động lại backend.'
              : err.message
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, revision]);

  const reset = () => {
    setSearchInput('');
    setFilters(initial);
  };

  const copyText = (event, key, text) => {
    event.preventDefault();
    event.stopPropagation();
    if (!text) return;
    navigator.clipboard?.writeText(String(text)).catch(() => {});
    setCopiedKey(key);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(''), 1500);
  };

  function onClick(event) {
    const target = event.target;
    const status = target.closest('#cardKpiAll')
      ? 'ALL'
      : target.closest('#cardKpiPending')
      ? 'PENDING_REVIEW'
      : target.closest('#cardKpiNeedsChanges')
      ? 'NEEDS_CHANGES'
      : target.closest('#cardKpiProcessed')
      ? 'PROCESSED'
      : null;
    if (status) {
      setFilters(previous => ({ ...previous, status, page: 0 }));
    }
    if (target.closest('#btnResetFilter,#btnEmptyReset')) reset();
    if (target.closest('#btnClearSearch')) {
      setSearchInput('');
      setFilters(previous => ({ ...previous, search: '', page: 0 }));
    }
    if (target.closest('#btnRefreshList')) setRevision(value => value + 1);
  }

  function onChange(event) {
    const key = {
      searchHostReg: 'search',
      selectStatusFilter: 'status',
      selectSortFilter: 'sort',
    }[event.target.id];
    if (key === 'search') {
      setSearchInput(event.target.value);
    } else if (key) {
      setFilters(previous => ({ ...previous, [key]: event.target.value, page: 0 }));
    }
  }

  function onSearchKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchInput !== filters.search) {
        setFilters(previous => ({ ...previous, search: searchInput, page: 0 }));
      }
    }
  }

  if (!data || error) {
    return (
      <StaffHostShell>
        <section className="staff-content">
          {loading && !error ? (
            <StaffHostListSkeleton />
          ) : (
            <StateView kind="error" message={error}>
              {error && (
                <MotionButton className="p-button" onClick={() => setRevision(value => value + 1)}>
                  Thử lại
                </MotionButton>
              )}
            </StateView>
          )}
        </section>
      </StaffHostShell>
    );
  }

  const href = item => `/staff/host-registrations/detail?id=${item.id}`;

  const rows = data.content.map(item => {
    const rel = relativeTime(item.submittedAt);
    const longWait = isLongPending(item.submittedAt, item.status);
    return (
      <tr key={item.id}>
        <td>
          <div className="shr-user-cell">
            <div className="shr-user-avatar" aria-hidden="true">
              {(item.userName || 'U').trim().charAt(0).toUpperCase()}
            </div>
            <div className="shr-user-meta">
              <Link
                className="shr-user-name"
                to={href(item)}
                state={{ hostRegistrationSearch: location.search }}
              >
                {item.userName}
              </Link>
            </div>
          </div>
        </td>
        <td>
          <div className="shr-contact-cell">
            <div className="shr-contact-row">
              <strong>{item.userPhone || 'Chưa có SĐT'}</strong>
              {item.userPhone && (
                <button
                  type="button"
                  className="shr-copy-btn"
                  title="Sao chép số điện thoại"
                  aria-label={`Sao chép số điện thoại ${item.userPhone}`}
                  onClick={event => copyText(event, `phone-${item.id}`, item.userPhone)}
                >
                  {copiedKey === `phone-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
            <div className="shr-contact-row">
              <span className="shr-contact-email" title={item.userEmail}>
                {item.userEmail || 'Chưa có email'}
              </span>
              {item.userEmail && (
                <button
                  type="button"
                  className="shr-copy-btn"
                  title="Sao chép email"
                  aria-label={`Sao chép email ${item.userEmail}`}
                  onClick={event => copyText(event, `email-${item.id}`, item.userEmail)}
                >
                  {copiedKey === `email-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>
        </td>
        <td>
          <div className="shr-scope-cell">
            <span className="shr-commune-pill">Khu vực: <strong>{item.targetCommune}</strong></span>
            <span className="shr-scale-tag">Quy mô: {item.expectedScale}</span>
          </div>
        </td>
        <td
          title={`Cập nhật: ${date(item.updatedAt)}${
            item.reviewedBy ? ` · Xử lý bởi: ${item.reviewedBy}` : ''
          }`}
        >
          <div className="shr-date-cell">
            <span className="shr-date-main">{date(item.submittedAt)}</span>
            <div className="shr-date-sub">
              {rel && <small className="shr-date-rel">{rel}</small>}
              {longWait && (
                <span className="shr-sla-tag" title="Hồ sơ đã chờ xét duyệt trên 48 giờ">
                  Chờ &gt; 48h
                </span>
              )}
            </div>
          </div>
        </td>
        <td>
          <div className="shr-status-cell">
            <HostApplicationStatus status={item.status} />
            {item.status !== 'PENDING_REVIEW' && item.reviewedBy && (
              <small
                className="shr-reviewer-meta"
                title={item.reviewedAt ? `Thời gian xử lý: ${date(item.reviewedAt)}` : undefined}
              >
                Xử lý: {item.reviewedBy}
              </small>
            )}
          </div>
        </td>
        <td>
          <Link
            className="shr-btn-view"
            to={href(item)}
            state={{ hostRegistrationSearch: location.search }}
            title="Xem chi tiết và xét duyệt hồ sơ"
          >
            Xem hồ sơ
          </Link>
        </td>
      </tr>
    );
  });

  const cards = data.content.map(item => (
    <article className="host-reg-mobile-card" key={item.id}>
      <header>
        <div>
          <strong>{item.userName}</strong>
        </div>
        <HostApplicationStatus status={item.status} />
      </header>
      <p className="shr-mobile-contact">
        {item.userPhone || 'Chưa có SĐT'} · {item.userEmail || 'Chưa có email'}
      </p>
      <p className="shr-mobile-scope">
        Khu vực: <strong>{item.targetCommune}</strong> · Quy mô: {item.expectedScale}
      </p>
      <div className="shr-mobile-footer">
        <small>
          Gửi: {date(item.submittedAt)}
          {item.status !== 'PENDING_REVIEW' && item.reviewedBy ? ` · Xử lý: ${item.reviewedBy}` : ''}
        </small>
        <Link
          className="shr-btn-view"
          to={href(item)}
          state={{ hostRegistrationSearch: location.search }}
        >
          Xem hồ sơ
        </Link>
      </div>
    </article>
  ));

  const pages = Math.max(1, data.totalPages);
  const page = Math.min(filters.page, pages - 1);
  const visiblePages = [
    ...new Set([0, page - 1, page, page + 1, pages - 1].filter(index => index >= 0 && index < pages)),
  ].sort((a, b) => a - b);

  const pagination = (
    <>
      <MotionButton
        className="btn-page-nav"
        disabled={page === 0 || loading}
        onClick={() => setFilters(previous => ({ ...previous, page: page - 1 }))}
      >
        Trước
      </MotionButton>
      {visiblePages.map((index, i) => (
        <span key={index} className="sha-page-number-wrap">
          {i > 0 && index - visiblePages[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <MotionButton
            className="btn-page-nav"
            aria-label={`Trang ${index + 1}`}
            aria-current={page === index ? 'page' : undefined}
            disabled={loading}
            onClick={() => setFilters(previous => ({ ...previous, page: index }))}
          >
            {index + 1}
          </MotionButton>
        </span>
      ))}
      <MotionButton
        className="btn-page-nav"
        disabled={page >= pages - 1 || loading}
        onClick={() => setFilters(previous => ({ ...previous, page: page + 1 }))}
      >
        Sau
      </MotionButton>
    </>
  );

  const paginationInfo = data.totalElements
    ? `Hiển thị ${page * data.size + 1}–${Math.min(
        (page + 1) * data.size,
        data.totalElements
      )} trong tổng số ${data.totalElements} hồ sơ`
    : 'Không có hồ sơ';

  return (
    <StaffHostShell>
      <div aria-busy={loading}>
        <StaffHostListTemplate
          {...{
            data,
            rows,
            cards,
            pagination,
            paginationInfo,
            onClick,
            onChange,
            onSearchKeyDown,
            loading,
          }}
          filters={{ ...filters, search: searchInput }}
        />
      </div>
    </StaffHostShell>
  );
}
