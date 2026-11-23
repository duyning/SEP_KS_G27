import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  Download,
  FileText,
  Layers,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import HostManagementShell from './HostManagementShell.jsx';
import { useToast } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import BillingKpiCards from './billing/BillingKpiCards.jsx';
import BillingFilterBar from './billing/BillingFilterBar.jsx';
import BillingInvoiceTable from './billing/BillingInvoiceTable.jsx';
import BillingPendingList from './billing/BillingPendingList.jsx';
import BillingDetailDrawer from './billing/BillingDetailDrawer.jsx';
import BillingScheduleDrawer from './billing/BillingScheduleDrawer.jsx';
import BillingDraftDrawer from './billing/BillingDraftDrawer.jsx';
import {
  billTotals,
  candidateNeedsBilling,
  candidateNeedsSupplementalUtilities,
  downloadBillsCsv,
  filterBills,
  formatBillingMonth,
  roomBillingApi,
} from '../services/room-billing.js';
import { utilityCurrentMonth } from '../services/room-utilities.js';
import '../styles/room-billing.css';

const PAGE_SIZE = 15;

export default function RoomBillingPage({ property, properties }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const month = params.get('month') || utilityCurrentMonth();
  const { propertyId } = property;

  const [ledger, setLedger] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState(() => (params.get('tab') === 'candidates' ? 'candidates' : 'bills'));
  const [status, setStatus] = useState(params.get('status') || 'ALL');
  const [roomFilter, setRoomFilter] = useState(params.get('roomId') || '');
  const [query, setQuery] = useState('');
  const [showBilledCandidates, setShowBilledCandidates] = useState(false);
  const [page, setPage] = useState(1);

  const [drawer, setDrawer] = useState(null); // { type: 'detail' | 'draft' | 'schedule', ... }
  const [detail, setDetail] = useState(null);
  const [drawerError, setDrawerError] = useState('');
  const [working, setWorking] = useState(false);

  const mutationRef = useRef(null);
  const detailReadRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    roomBillingApi
      .list(propertyId, month, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setLedger(data);
      })
      .catch(failure => {
        if (!controller.signal.aborted) {
          setLoadError(failure.message || 'Không thể tải dữ liệu phiếu thu và công nợ.');
        }
      });
    return () => controller.abort();
  }, [propertyId, month, revision]);

  useEffect(
    () => () => {
      mutationRef.current?.abort();
      detailReadRef.current?.abort();
    },
    []
  );

  const updateScope = nextParams => {
    setLedger(null);
    setStatus('ALL');
    setRoomFilter('');
    setQuery('');
    setPage(1);
    setParams(nextParams);
  };

  const closeDrawer = useCallback(() => {
    if (mutationRef.current) return;
    detailReadRef.current?.abort();
    setDrawer(null);
    setDrawerError('');
    setDetail(null);
  }, []);

  const openDetail = useCallback(bill => {
    detailReadRef.current?.abort();
    setDrawerError('');
    setDetail(null);
    setDrawer({ type: 'detail', bill });
    if (bill.status === 'DRAFT') return;
    const controller = new AbortController();
    detailReadRef.current = controller;
    roomBillingApi
      .detail(bill.id, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setDetail(data);
      })
      .catch(failure => {
        if (!controller.signal.aborted) setDrawerError(failure.message || 'Chưa tải được lịch sử thanh toán.');
      });
  }, []);

  const openDraft = useCallback((candidate, kind, bill = null) => {
    setDrawerError('');
    setDrawer({ type: 'draft', candidate, kind, bill });
  }, []);

  const openSchedule = useCallback(candidate => {
    setDrawerError('');
    setDrawer({ type: 'schedule', candidate });
  }, []);

  const runMutation = async (operation, onSuccess) => {
    if (mutationRef.current) return;
    const controller = new AbortController();
    mutationRef.current = controller;
    setWorking(true);
    setDrawerError('');
    try {
      const result = await operation(controller.signal);
      if (!controller.signal.aborted) await onSuccess(result);
    } catch (failure) {
      if (!controller.signal.aborted) {
        const message = failure.message || 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.';
        setDrawerError(message);
        toast?.(message, 'error');
      }
    } finally {
      if (mutationRef.current === controller) mutationRef.current = null;
      if (!controller.signal.aborted) setWorking(false);
    }
  };

  const refreshWithToast = message => {
    toast?.(message, 'success');
    setRevision(value => value + 1);
  };

  const selectedMonth = ledger?.month === month ? ledger : null;
  const candidates = selectedMonth?.candidates || [];
  const bills = selectedMonth?.bills || [];
  const earlierDebt = selectedMonth?.earlierDebt || [];

  const floorByRoom = useMemo(
    () => new Map(candidates.map(item => [item.roomId, item.floor])),
    [candidates]
  );

  const roomOptions = useMemo(
    () => [...new Map([...candidates, ...bills, ...earlierDebt].map(item => [String(item.roomId), item.roomNumber]))],
    [candidates, bills, earlierDebt]
  );

  const filteredBills = useMemo(
    () => filterBills(bills, earlierDebt, { roomFilter, status, query }),
    [bills, earlierDebt, roomFilter, status, query]
  );

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(candidate => {
      if (roomFilter && String(candidate.roomId) !== String(roomFilter)) return false;
      if (q) {
        const hay = `p.${candidate.roomNumber} phòng ${candidate.roomNumber} ${candidate.roomNumber} ${candidate.tenantName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [candidates, roomFilter, query]);

  const pendingCandidateCount = useMemo(
    () => candidates.filter(candidateNeedsBilling).length,
    [candidates]
  );

  const totals = useMemo(() => billTotals(filteredBills), [filteredBills]);
  const draftCount = useMemo(
    () => filteredBills.filter(bill => bill.status === 'DRAFT').length,
    [filteredBills]
  );

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedBills = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, safePage]);

  const hasActiveFilters = Boolean(roomFilter || (view === 'bills' && status !== 'ALL') || query.trim());
  const clearFilters = () => {
    setRoomFilter('');
    setStatus('ALL');
    setQuery('');
    setPage(1);
  };

  // Primary "Lập phiếu thu" action: if exactly 1 actionable pending tenancy exists, open its draft drawer immediately;
  // otherwise switch to Tab 2 ("Đợt thuê cần lập phiếu") so host picks the exact room/tenancy!
  const handlePrimaryCreateClick = () => {
    const actionable = candidates.filter(c => !c.issue && candidateNeedsBilling(c));
    if (actionable.length === 1) {
      const target = actionable[0];
      const kind = !target.mainBillId
        ? 'MAIN'
        : candidateNeedsSupplementalUtilities(target)
          ? 'UTILITIES'
          : 'MAIN';
      openDraft(target, kind, null);
      return;
    }
    setView('candidates');
  };

  const handleExportReport = () => {
    if (!filteredBills.length) {
      toast?.('Chưa có phiếu thu trong phạm vi lọc để xuất báo cáo.', 'error');
      return;
    }
    downloadBillsCsv(filteredBills, { propertyName: property.name, month });
    toast?.(`Đã xuất báo cáo ${filteredBills.length} phiếu thu (${formatBillingMonth(month)}).`, 'success');
  };

  const selectableCandidate =
    drawer?.type === 'detail'
      ? candidates.find(item => item.tenancyKey === drawer.bill.tenancyKey && !item.issue) || null
      : null;

  return (
    <HostManagementShell activePath="/host/rooms">
      <section className="hb-page" aria-label="Phiếu thu và công nợ">
        {/* BREADCRUMB */}
        <nav className="hb-breadcrumb" aria-label="Điều hướng phân cấp">
          <Link to={`/host/rooms?propertyId=${propertyId}`} className="hb-crumb-link">
            Quản lý nhà trọ
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page" className="hb-crumb-current">
            Phiếu thu &amp; công nợ
          </span>
        </nav>

        {/* HEADER */}
        <header className="hb-header-card">
          <div className="hb-header-copy">
            <div className="hb-header-title-row">
              <h2>Phiếu thu &amp; công nợ</h2>
              <span className="hb-period-pill">Kỳ {formatBillingMonth(month)}</span>
            </div>
            <p>Theo dõi thu tiền phòng, các khoản phải thu và lịch sử thanh toán · {property.name}</p>
          </div>
          <div className="hb-header-actions">
            <button
              type="button"
              className="hm-btn"
              disabled={!selectedMonth || filteredBills.length === 0}
              onClick={handleExportReport}
            >
              <Download size={15} aria-hidden="true" />
              <span>Xuất báo cáo</span>
            </button>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary hb-create-cta"
              disabled={!selectedMonth}
              onClick={handlePrimaryCreateClick}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Lập phiếu thu</span>
            </MotionButton>
          </div>
        </header>

        {/* FINANCIAL KPI CARDS */}
        {selectedMonth ? (
          <BillingKpiCards totals={totals} draftCount={draftCount} />
        ) : !loadError ? (
          <div className="hb-kpi-grid" aria-hidden="true">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="hb-skeleton-kpi" />
            ))}
          </div>
        ) : null}

        {/* TABS WITH COUNT BADGES */}
        <div className="hb-tabs-bar" role="tablist" aria-label="Chuyển chế độ xem phiếu thu">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'bills'}
            className={`hb-tab-btn ${view === 'bills' ? 'is-active' : ''}`}
            onClick={() => setView('bills')}
          >
            <FileText size={16} aria-hidden="true" />
            <span>Phiếu thu &amp; công nợ</span>
            {selectedMonth && (
              <span className="hb-tab-badge">{bills.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'candidates'}
            className={`hb-tab-btn ${view === 'candidates' ? 'is-active' : ''}`}
            onClick={() => setView('candidates')}
          >
            <Layers size={16} aria-hidden="true" />
            <span>Đợt thuê cần lập phiếu</span>
            {selectedMonth && (
              <span className={`hb-tab-badge ${pendingCandidateCount > 0 ? 'is-accent' : ''}`}>
                {pendingCandidateCount}
              </span>
            )}
          </button>
        </div>

        {/* FILTER BAR */}
        <BillingFilterBar
          propertyId={propertyId}
          properties={properties}
          month={month}
          roomFilter={roomFilter}
          roomOptions={roomOptions}
          status={status}
          query={query}
          showStatus={view === 'bills'}
          onPropertyChange={nextPropId =>
            updateScope(new URLSearchParams({ propertyId: nextPropId, billing: '1', month }))
          }
          onMonthChange={nextMonth =>
            updateScope(new URLSearchParams({ propertyId: String(propertyId), billing: '1', month: nextMonth }))
          }
          onRoomChange={value => {
            setRoomFilter(value);
            setPage(1);
          }}
          onStatusChange={value => {
            setStatus(value);
            setPage(1);
          }}
          onQueryChange={value => {
            setQuery(value);
            setPage(1);
          }}
          onClearFilters={clearFilters}
        />

        {/* LOAD ERROR */}
        {loadError && (
          <div className="hb-error-banner" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{loadError}</span>
            <button
              type="button"
              className="hm-btn"
              onClick={() => setRevision(value => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {!selectedMonth && !loadError && (
          <div className="hb-skeleton-list" role="status" aria-label="Đang tải phiếu thu và công nợ">
            <p className="hb-loading-inline">
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
              <span>Đang tải dữ liệu phiếu thu kỳ {formatBillingMonth(month)}…</span>
            </p>
            {[1, 2, 3].map(idx => (
              <div key={idx} className="hb-skeleton-row" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* TAB 1: INVOICE TABLE */}
        {selectedMonth && view === 'bills' && (
          <BillingInvoiceTable
            bills={pagedBills}
            floorByRoom={floorByRoom}
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={filteredBills.length}
            hasActiveFilters={hasActiveFilters}
            onPageChange={setPage}
            onOpenDetail={openDetail}
            onSwitchToPending={() => setView('candidates')}
            onClearFilters={clearFilters}
          />
        )}

        {/* TAB 2: PENDING TENANCY CARDS */}
        {selectedMonth && view === 'candidates' && (
          <BillingPendingList
            candidates={filteredCandidates}
            bills={bills}
            propertyId={propertyId}
            month={month}
            showBilled={showBilledCandidates}
            onToggleShowBilled={setShowBilledCandidates}
            onSchedule={openSchedule}
            onDraft={openDraft}
            onOpenBill={openDetail}
          />
        )}

        {/* DRAWER: RENT SCHEDULE */}
        {drawer?.type === 'schedule' && (
          <BillingScheduleDrawer
            candidate={drawer.candidate}
            propertyId={propertyId}
            month={month}
            busy={working}
            error={drawerError}
            onClose={closeDrawer}
            onSave={body =>
              runMutation(
                signal => roomBillingApi.schedule(body, signal),
                result => {
                  setLedger(result);
                  setDrawer(null);
                  toast?.('Đã lưu chu kỳ thu tiền phòng cho hồ sơ đợt thuê.', 'success');
                }
              )
            }
          />
        )}

        {/* DRAWER: CREATE / EDIT DRAFT & DIRECT ISSUE */}
        {drawer?.type === 'draft' && (
          <BillingDraftDrawer
            propertyName={property.name}
            propertyId={propertyId}
            candidate={drawer.candidate}
            bill={drawer.bill}
            kind={drawer.kind}
            month={month}
            busy={working}
            error={drawerError}
            onClose={closeDrawer}
            onSaveDraft={body =>
              runMutation(
                signal => roomBillingApi.draft(body, signal),
                savedBill => {
                  setView('bills');
                  setStatus('ALL');
                  openDetail(savedBill);
                  refreshWithToast('Đã lưu bản nháp phiếu thu.');
                }
              )
            }
            onSaveAndIssue={body =>
              runMutation(
                async signal => {
                  const savedDraft = await roomBillingApi.draft(body, signal);
                  return roomBillingApi.issue(savedDraft.id, savedDraft.revision, signal);
                },
                issuedBill => {
                  setView('bills');
                  setStatus('ALL');
                  setDrawer({ type: 'detail', bill: issuedBill });
                  setDetail({ bill: issuedBill, payments: [] });
                  refreshWithToast('Đã phát hành phiếu thu chính thức.');
                }
              )
            }
          />
        )}

        {/* DRAWER: INVOICE DETAIL + PAYMENT RECORDING */}
        {drawer?.type === 'detail' && (
          <BillingDetailDrawer
            key={drawer.bill.id}
            bill={drawer.bill}
            detail={detail}
            floor={floorByRoom.get(drawer.bill.roomId)}
            today={selectedMonth?.today}
            busy={working}
            error={drawerError}
            onClose={closeDrawer}
            onEditDraft={
              selectableCandidate
                ? () => openDraft(selectableCandidate, drawer.bill.kind, drawer.bill)
                : undefined
            }
            onIssue={(targetBill, done) =>
              runMutation(
                signal => roomBillingApi.issue(targetBill.id, targetBill.revision, signal),
                issued => {
                  setDrawer({ type: 'detail', bill: issued });
                  setDetail({ bill: issued, payments: [] });
                  done();
                  refreshWithToast('Đã phát hành phiếu thu chính thức.');
                }
              )
            }
            onPayment={(billId, body, done) =>
              runMutation(
                signal => roomBillingApi.payment(billId, body, signal),
                result => {
                  detailReadRef.current?.abort();
                  setDrawer({ type: 'detail', bill: result.bill });
                  setDetail(result);
                  done();
                  refreshWithToast('Đã ghi nhận thanh toán thành công.');
                }
              )
            }
          />
        )}
      </section>
    </HostManagementShell>
  );
}
