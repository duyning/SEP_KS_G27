import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, LoaderCircle, Plus, RotateCcw } from 'lucide-react';
import HostManagementShell from './HostManagementShell.jsx';
import { Modal, useToast } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import RoomTypeCreateModal from './RoomTypeCreateModal.jsx';
import { hostApi } from '../services/host.js';
import { emptyRoomType, money, roomTypePayload } from '../services/room-types.js';
import {
  ROOM_LAYOUT_LIMIT, applyLayoutPattern, copyFloorLayout, generateRoomLayout,
  layoutFloorNumber, layoutIssues, nextRoomSequence, roomKey, selectLayoutNumbers,
} from '../services/room-layout.js';
import '../styles/multi-floor-room-setup.css';

const PAGE_SIZE = 24;
const TYPE_LIMIT = 20;
const countLabel = count => count.toLocaleString('vi-VN');
const getFloorNames = rows => [...new Set(rows.map(row => row.floor))];
const sortFloors = (a, b) => a.localeCompare(b, 'vi', { numeric: true });

function readDraft(key) {
  try {
    const data = JSON.parse(sessionStorage.getItem(key));
    const rooms = Array.isArray(data) ? data : data?.rooms;
    const types = Array.isArray(data?.types) ? data.types.filter(type =>
      Number.isSafeInteger(type?.id) && type.id < 0 && typeof type.data?.roomType === 'string'
    ).slice(0, TYPE_LIMIT).map(type => ({
      id: type.id, data: { ...emptyRoomType(), ...type.data, photos: [] }, missingPhotos: Number(type.photoCount) || 0,
    })) : [];
    if (Array.isArray(rooms) && rooms.length <= ROOM_LAYOUT_LIMIT &&
        rooms.every(row => typeof row?.id === 'string' && typeof row.roomNumber === 'string' && typeof row.floor === 'string')) return { rooms, types };
  } catch { /* Start with an empty draft when session storage is unavailable. */ }
  return { rooms: [], types: [] };
}

function groupRooms(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.floor)) groups.set(row.floor, []);
    groups.get(row.floor).push(row);
  }
  return groups;
}

function TypeOptions({ types }) {
  return types.map(type => <option key={type.roomTypeId} value={type.roomTypeId}>
    {type.roomType}{type.roomTypeId < 0 ? ' · Mới' : Number(type.price) > 0 ? '' : ' · Chưa có giá hợp lệ'}
  </option>);
}

function Generator({ floors, floor, inventory, rows, types, mode, setMode, onFloor, onAdd }) {
  const [form, setForm] = useState({ floors: '1', count: '10', extra: '1', name: '', numbering: 'ALL', first: '', start: '' });
  const [error, setError] = useState('');
  const [defaultType, setDefaultType] = useState('');
  const activeType = types.find(type => type.roomTypeId === Number(defaultType) && Number(type.price) > 0);
  const activeNumber = layoutFloorNumber(floor);
  const selectableFloors = floors.filter(name => layoutFloorNumber(name) !== null);
  const adding = mode === 'add' && selectableFloors.length > 0;
  const target = activeNumber === null ? selectableFloors[0] : floor;
  const firstFloor = adding ? layoutFloorNumber(target) : Number(form.first || '1');
  const floorCount = adding ? 1 : Number(form.floors);
  const perFloor = adding ? form.extra : form.count;
  const existingRows = useMemo(() => [...inventory, ...rows], [inventory, rows]);
  const { result, validation } = useMemo(() => {
    try {
      if (firstFloor === null) throw Error('Chọn tầng muốn thêm phòng.');
      if (!Number.isSafeInteger(floorCount) || floorCount < 1 || floorCount > 200) throw Error('Nhập số tầng từ 1 đến 200.');
      const lastFloor = firstFloor + floorCount - 1;
      const floorPlans = new Map();
      if (!adding) {
        for (const label of floors) {
          const number = layoutFloorNumber(label);
          if (number !== null && number >= firstFloor && number <= lastFloor) {
            floorPlans.set(number, { label, start: form.start ? Number(form.start) : nextRoomSequence(existingRows, label, form.name) });
          }
        }
      }
      const start = form.start || (adding ? nextRoomSequence(existingRows, target, form.name) : 1);
      const result = generateRoomLayout({
        from: firstFloor, to: lastFloor, count: perFloor, start, prefix: form.name,
        numbering: form.numbering, floorLabel: adding ? target : undefined, floorPlans,
      }, existingRows.map(row => row.roomNumber));
      if (rows.length + result.rooms.length > ROOM_LAYOUT_LIMIT) throw Error('Một bản nháp tối đa 5.000 phòng.');
      if (!result.rooms.length) throw Error('Các tên phòng này đã có. Đổi tên hoặc số thứ tự bắt đầu.');
      return { result, validation: '' };
    } catch (cause) {
      return { result: null, validation: cause.message };
    }
  }, [adding, existingRows, firstFloor, floorCount, floors, form, perFloor, rows.length, target]);

  const update = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setError('');
  };
  const numberField = (key, label, min, placeholder) => <label>
    {label}<input type="number" min={min} step="1" value={form[key]} placeholder={placeholder}
      onChange={e => update(key, e.target.value)} />
  </label>;

  function addRooms() {
    if (validation) {
      setError(validation);
      return;
    }
    onAdd(activeType ? {
      ...result, rooms: result.rooms.map(room => ({ ...room, roomTypeId: activeType.roomTypeId })),
    } : result);
  }

  return <section className="ml-panel ml-generator" aria-labelledby="ml-generator-title">
    <h2 id="ml-generator-title" tabIndex={-1}>Tạo phòng theo tầng</h2>
    <p className="ml-step-intro">Nhập số tầng và số phòng. Bạn có thể thêm từng tầng nếu số phòng khác nhau.</p>
    <div className="ml-generator-grid">
    <div className="ml-stack">
      <div className="ml-mode" role="group" aria-label="Cách tạo khung phòng">
        <MotionButton type="button" className="hm-btn" aria-pressed={!adding} onClick={() => { setMode('new'); setError(''); }}>Tạo theo dãy tầng</MotionButton>
        <MotionButton type="button" className="hm-btn" aria-pressed={adding} disabled={!selectableFloors.length}
          onClick={() => { setMode('add'); setError(''); }}>Thêm vào tầng đã có</MotionButton>
      </div>
      {adding ? <>
        <label>Tầng nhận phòng
          <select aria-label="Tầng nhận phòng" value={target} onChange={e => { onFloor(e.target.value); setError(''); }}>
            {selectableFloors.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        {numberField('extra', 'Số phòng thêm', 1)}
      </> : <>
        <p className="ml-target">Tầng bắt đầu <strong>{Number.isSafeInteger(firstFloor) ? firstFloor : '—'}</strong></p>
        <p className="ml-hint">Tầng đã có phòng sẽ được thêm tiếp theo số phòng hiện tại.</p>
        <div className="ml-form-pair">
          {numberField('floors', 'Số tầng', 1)}
          {numberField('count', 'Số phòng mỗi tầng', 1)}
        </div>
      </>}
      <label>Phần tên trước số phòng (tùy chọn) <input value={form.name} maxLength={12} placeholder="Ví dụ P."
        onChange={e => update('name', e.target.value)} aria-describedby="ml-name-help" /></label>
      <p id="ml-name-help" className="ml-hint">Ví dụ nhập P. để có P.101, P.102. Để trống để dùng 101, 102.</p>
      {types.length > 0 && <label>Loại chung cho nhóm này (tùy chọn)
        <select aria-label="Loại chung cho nhóm này" value={activeType?.roomTypeId ?? ''} onChange={e => setDefaultType(e.target.value)}>
          <option value="">Gán loại sau</option>
          <TypeOptions types={types.filter(type => Number(type.price) > 0)}/>
        </select>
      </label>}
      <details className="ml-options">
        <summary>Tùy chỉnh cách đánh số</summary>
        <label>Kiểu số phòng tạo mới
          <select aria-label="Kiểu số phòng tạo mới" value={form.numbering} onChange={e => update('numbering', e.target.value)}>
            <option value="ALL">Liên tiếp</option><option value="ODD">Chỉ tạo số lẻ</option><option value="EVEN">Chỉ tạo số chẵn</option>
          </select>
        </label>
        {!adding && numberField('first', 'Số tầng bắt đầu', 0, '1')}
        {numberField('start', 'Số thứ tự bắt đầu', 1, 'Tự đánh số')}
      </details>
    </div>
    <div className="ml-stack ml-generator-summary">
      <div className="ml-preview">
        <strong>Xem trước tên phòng</strong>
        {result ? <p>{result.rooms.slice(0, 4).map(row => row.roomNumber).join(', ')}{result.rooms.length > 4 ? '…' : ''}</p>
          : <p>Kiểm tra số tầng, số phòng và cách đánh số.</p>}
        {result && <p className="ml-preview-count">{countLabel(result.rooms.length)} phòng sẽ được thêm{activeType ? ' · ' + activeType.roomType : ''}</p>}
      </div>
      {error && validation && <p role="alert" className="ml-error">{validation}</p>}
      <MotionButton type="button" className="hm-btn hm-btn-primary" onClick={addRooms}><Plus size={16}/>Thêm vào danh sách</MotionButton>
    </div>
    </div>
  </section>;
}

function CopyAssignments({ source, floors, groups, rows, onApply }) {
  const [targets, setTargets] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const destinations = floors.filter(name => name !== source);
  const selected = targets.filter(name => destinations.includes(name));
  const next = copyFloorLayout(rows, source, selected, overwrite);
  const affected = next.reduce((count, row, index) => count + Number(row !== rows[index]), 0);
  const sourceCount = groups.get(source)?.length || 0;

  return <details className="ml-options ml-copy">
    <summary>Sao chép cách gán sang tầng khác</summary>
    <p><strong>Tầng nguồn</strong> {source} ({sourceCount} phòng)</p>
    <p>Ghép theo thứ tự trong bản nháp, từ dòng đầu tiên. Chỉ gán vào vị trí có loại ở tầng nguồn và có phòng tương ứng ở tầng đích. Tên phòng được giữ nguyên.</p>
    <div className="ml-actions">
      <strong>Tầng đích</strong>
      <MotionButton type="button" className="hm-btn hm-btn-subtle" onClick={() => setTargets(destinations)}>Chọn mọi tầng còn lại</MotionButton>
    </div>
    <div className="ml-targets">
      {destinations.map(name => <label className="ml-check" key={name}><input type="checkbox" checked={selected.includes(name)}
        onChange={e => setTargets(previous => e.target.checked ? [...previous, name] : previous.filter(item => item !== name))} />
        {name} ({groups.get(name).length} phòng)
      </label>)}
    </div>
    <label className="ml-check"><input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />Ghi đè loại đã gán ở tầng đích</label>
    <div className="ml-actions">
      <span role="status">Sẽ cập nhật {affected} phòng ở {selected.length} tầng đích đã chọn.</span>
      <MotionButton type="button" className="hm-btn" disabled={!affected} onClick={() => onApply(next, affected)}><Copy size={15}/>Áp dụng sao chép</MotionButton>
    </div>
  </details>;
}

export default function MultiFloorRoomSetup({ property, types: savedTypes, userId, onDone }) {
  const storageKey = 'hlrcs:room-layout:' + userId + ':' + property.propertyId;
  const notify = useToast();
  const [initialDraft] = useState(() => readDraft(storageKey));
  const [step, setStep] = useState(() => initialDraft.rooms.length ? 'assign' : 'types');
  const [generatorMode, setGeneratorMode] = useState('new');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [rows, setRows] = useState(initialDraft.rooms);
  const [newTypes, setNewTypes] = useState(initialDraft.types);
  const [typeEditor, setTypeEditor] = useState(null);
  const [removeType, setRemoveType] = useState(null);
  const [floor, setFloor] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [selectionText, setSelectionText] = useState('');
  const [chosenType, setChosenType] = useState('');
  const [pattern, setPattern] = useState([]);
  const [review, setReview] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef();
  const finished = useRef(false);
  const stepHeading = useRef();
  const pageCheckbox = useRef();

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (finished.current) return;
    try {
      if (!rows.length && !newTypes.length) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, JSON.stringify({
        rooms: rows, types: newTypes.map(({ id, data, missingPhotos }) => ({
          id, data: { ...data, photos: [] }, photoCount: missingPhotos || data.photos.length,
        })),
      }));
      setStorageError('');
    } catch {
      setStorageError('Trình duyệt không lưu được bản nháp. Giữ trang mở cho đến khi tạo phòng.');
    }
  }, [rows, newTypes, storageKey]);

  const types = useMemo(() => [
    ...newTypes.map(({ id, data }) => ({ roomTypeId: id, roomType: data.roomType, price: data.price })),
    ...savedTypes,
  ], [newTypes, savedTypes]);
  const typeIds = new Set(types.map(type => type.roomTypeId));
  const activeChosenType = typeIds.has(Number(chosenType)) ? Number(chosenType) : types[0]?.roomTypeId || '';
  const validPattern = pattern.length ? pattern.filter(id => typeIds.has(id)) : types.slice(0, 2).map(type => type.roomTypeId);
  const activePattern = validPattern.length ? validPattern : types.slice(0, 2).map(type => type.roomTypeId);
  const inventory = useMemo(() => savedTypes.flatMap(type => type.rooms || []), [savedTypes]);
  const groups = useMemo(() => groupRooms(rows), [rows]);
  const draftFloors = useMemo(() => [...groups.keys()].sort(sortFloors), [groups]);
  const floors = useMemo(() => {
    const draftNumbers = new Set(draftFloors.map(layoutFloorNumber));
    const savedFloors = getFloorNames(inventory).filter(name => {
      const number = layoutFloorNumber(name);
      if (number === null || draftNumbers.has(number)) return false;
      draftNumbers.add(number);
      return true;
    });
    return [...draftFloors, ...savedFloors].sort(sortFloors);
  }, [inventory, draftFloors]);
  const issues = useMemo(() => layoutIssues(rows, types, inventory.map(room => room.roomNumber)), [rows, types, inventory]);
  const activeFloor = floors.includes(floor) ? floor : draftFloors[0] || floors[0];
  const onFloor = groups.get(activeFloor) || [];
  const current = onFloor.filter(row => row.id === editingRoom ||
    ((!onlyIssues || issues.get(row.id).messages.length) && roomKey(row.roomNumber).includes(roomKey(search))));
  const floorIssueCount = onFloor.filter(row => issues.get(row.id).messages.length).length;
  const maxPage = Math.max(1, Math.ceil(current.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const visible = current.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedFloors = new Set(rows.filter(row => selected.has(row.id)).map(row => row.floor));
  const pageSelected = visible.filter(row => selected.has(row.id)).length;
  const assigned = rows.filter(row => issues.get(row.id).assigned).length;
  const issueCount = rows.filter(row => issues.get(row.id).messages.length).length;
  const canEdit = property.status === 'ACTIVE';
  const missingPhotos = newTypes.some(type => type.missingPhotos);
  const photos = newTypes.flatMap(type => type.data.photos);
  const tooManyPhotos = photos.length > 40 || photos.reduce((bytes, file) => bytes + file.size, 0) > 80 * 1024 * 1024;
  const canSave = canEdit && (rows.length > 0 || newTypes.length > 0) && issueCount === 0 && !missingPhotos && !tooManyPhotos;
  const roomTypesUrl = '/host/room-types?propertyId=' + property.propertyId;
  const confirmationLabel = newTypes.length
    ? 'Tạo ' + countLabel(newTypes.length) + ' loại phòng' + (rows.length ? ' và ' + countLabel(rows.length) + ' phòng' : '')
    : 'Tạo ' + countLabel(rows.length) + ' phòng';
  const steps = [
    { id: 'types', label: 'Loại phòng', progress: types.length ? countLabel(types.length) + ' loại có thể dùng' : 'Chưa có loại phòng' },
    { id: 'generate', label: 'Tạo theo tầng', progress: rows.length ? countLabel(rows.length) + ' phòng trong bản nháp' : 'Chưa có phòng' },
    { id: 'assign', label: 'Gán loại phòng', progress: rows.length ? countLabel(assigned) + '/' + countLabel(rows.length) + ' phòng đã gán' : 'Chưa bắt đầu' },
  ];

  useEffect(() => {
    if (pageCheckbox.current) pageCheckbox.current.indeterminate = pageSelected > 0 && pageSelected < visible.length;
  }, [pageSelected, visible.length, currentPage, activeFloor]);

  function commit(next, notice = '') {
    setHistory(previous => [...previous.slice(-9), rows]);
    setRows(next);
    setError('');
    setMessage(notice);
  }

  function selectFloor(name) {
    setFloor(name);
    setPage(1);
    setSearch('');
    setOnlyIssues(false);
    setEditingRoom(null);
    setSelected(new Set());
    setError('');
    setMessage('');
  }

  function changeSelection(ids, checked) {
    setSelected(previous => {
      const next = new Set(previous);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function quickSelect(group) {
    const rules = {
      all: () => true,
      odd: row => /[13579]$/.test(row.roomNumber.trim()),
      even: row => /[02468]$/.test(row.roomNumber.trim()),
      unassigned: row => !issues.get(row.id).assigned,
      none: () => false,
    };
    setSelected(new Set(onFloor.filter(rules[group]).map(row => row.id)));
    setError('');
    setMessage('');
  }

  function selectNumbers() {
    try {
      const ids = selectLayoutNumbers(rows, selectionText);
      setSelected(ids);
      setError('');
      setMessage('');
    } catch (cause) { setError(cause.message); }
  }

  function addRooms(result) {
    const notice = 'Đã thêm ' + countLabel(result.rooms.length) + ' phòng vào bản nháp.' +
      (result.skipped ? ' Bỏ qua ' + result.skipped + ' tên phòng đã có.' : '');
    selectFloor(result.rooms[0].floor);
    commit([...rows, ...result.rooms], notice);
    goTo('assign');
  }

  function goTo(nextStep, mode) {
    if (mode) setGeneratorMode(mode);
    setStep(nextStep);
    requestAnimationFrame(() => {
      const title = nextStep === 'types' ? 'ml-types-title' : nextStep === 'generate' ? 'ml-generator-title' : 'ml-list-title';
      stepHeading.current?.querySelector('#' + title)?.focus();
    });
  }

  function updateRoom(id, field, value) {
    commit(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  function assign() {
    commit(rows.map(row => selected.has(row.id) ? { ...row, roomTypeId: activeChosenType } : row),
      'Đã gán loại cho ' + selected.size + ' phòng.');
  }

  function alternating() {
    const ids = selected.size ? selected : new Set(current.map(row => row.id));
    if (!ids.size) return;
    try {
      commit(applyLayoutPattern(rows, ids, activePattern), 'Đã gán so le cho ' + ids.size + ' phòng.');
    } catch (cause) { setError(cause.message); }
  }

  function undo() {
    setRows(history.at(-1));
    setHistory(previous => previous.slice(0, -1));
    setSelected(new Set());
    setError('');
    setMessage('Đã hoàn tác thay đổi gần nhất.');
  }

  function reviewFloor(name, index = 0) {
    setReview(false);
    selectFloor(name);
    setPage(Math.floor(index / PAGE_SIZE) + 1);
    goTo('assign');
  }

  function saveTypeDraft(data) {
    const name = roomKey(data.roomType);
    if (types.some(type => type.roomTypeId !== typeEditor.id && roomKey(type.roomType) === name)) {
      return 'Tên loại phòng đã có trong nhà trọ hoặc trong bản nháp.';
    }
    if (typeEditor.id) {
      setNewTypes(previous => previous.map(type => type.id === typeEditor.id ? { ...type, data, missingPhotos: 0 } : type));
    } else {
      const usedIds = [...newTypes.map(type => type.id), ...rows.map(row => Number(row.roomTypeId) || 0)];
      const id = Math.min(0, ...usedIds) - 1;
      setNewTypes(previous => [...previous, { id, data, missingPhotos: 0 }]);
    }
    setTypeEditor(null);
  }

  function deleteTypeDraft() {
    setNewTypes(previous => previous.filter(type => type.id !== removeType.id));
    setRows(previous => previous.map(row => row.roomTypeId === removeType.id ? { ...row, roomTypeId: null } : row));
    setHistory([]);
    setRemoveType(null);
  }

  async function save() {
    if (!canSave || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setSaveError('');
    try {
      const layout = {
        propertyId: property.propertyId,
        rooms: rows.map(({ roomTypeId, roomNumber, floor }) => ({ roomTypeId, roomNumber: roomNumber.trim(), floor: floor.trim() })),
      };
      let createdRooms;
      let createdTypeCount = 0;
      if (newTypes.length) {
        const result = await hostApi.createRoomSetup({
          ...layout, types: newTypes.map(({ id, data }) => ({
            localId: id, details: roomTypePayload(data, property.propertyId), photoCount: data.photos.length,
          })),
        }, photos, controller.signal);
        createdRooms = result.rooms;
        createdTypeCount = Object.keys(result.createdTypes).length;
      } else {
        createdRooms = await hostApi.createRoomLayout(layout, controller.signal);
      }
      if (controller.signal.aborted) return;
      finished.current = true;
      try { sessionStorage.removeItem(storageKey); } catch { /* Creation already succeeded. */ }
      notify?.('Đã tạo ' + (createdTypeCount ? createdTypeCount + ' loại phòng' + (createdRooms.length ? ' và ' : '') : '') +
        (createdRooms.length ? countLabel(createdRooms.length) + ' phòng' : '') + '.');
      onDone(createdRooms.length);
    } catch (cause) {
      if (!controller.signal.aborted) {
        const field = Object.keys(cause.fields || {}).find(key => /^(rooms|types)\[\d+\]/.test(key));
        const index = field?.match(/\[(\d+)\]/)?.[1];
        const row = index == null || !field.startsWith('rooms') ? null : rows[Number(index)];
        const type = index == null || !field.startsWith('types') ? null : newTypes[Number(index)];
        const detail = row ? row.floor + ' · ' + row.roomNumber : type?.data.roomType;
        setSaveError(cause.message + (detail ? ' ' + detail + ' — ' + cause.fields[field] : ''));
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <HostManagementShell activePath="/host/room-types">
    <section className="ml-page" ref={stepHeading}>
      <Link className="hm-btn hm-btn-subtle" to={roomTypesUrl}><ArrowLeft size={16}/>Loại phòng &amp; Giá</Link>
      <header className="ml-header">
        <div><h1>Thiết lập phòng nhiều tầng</h1><p>{property.name} · Mọi thay đổi được giữ trong bản nháp đến khi bạn xác nhận tạo.</p></div>
        <div className="ml-metrics" aria-live="polite">
          <span><strong>{newTypes.length}</strong> loại phòng mới</span>
          <span><strong>{countLabel(rows.length)}</strong> phòng chuẩn bị tạo</span>
          {draftFloors.length > 0 && <span><strong>{draftFloors.length}</strong> tầng</span>}
        </div>
      </header>
        <nav className="ml-steps" aria-label="Các bước thiết lập phòng">
          {steps.map(({ id, label, progress }, index) =>
            <MotionButton key={id} type="button" aria-current={step === id ? 'step' : undefined}
              disabled={busy || (id === 'assign' && !rows.length && step !== 'assign')}
              onClick={() => goTo(id)}>
              <span className="ml-step-number" aria-hidden="true">{index + 1}</span>
              <span><strong>{label}</strong><small>{progress}</small></span>
            </MotionButton>)}
        </nav>
        {!canEdit && <p className="ml-error" role="alert">Nhà trọ cần được phê duyệt và đang hoạt động để tạo phòng.</p>}
        {storageError && <p className="ml-error" role="status">{storageError}</p>}
        <section className="ml-panel ml-type-panel" hidden={step !== 'types'} aria-labelledby="ml-types-title">
          <div className="ml-list-header">
            <div><h2 id="ml-types-title" tabIndex={-1}>Chuẩn bị loại phòng</h2>
              <p>Mỗi loại có giá thuê, diện tích và tiện nghi riêng. Bạn có thể dùng lại các loại đã lưu.</p></div>
            <MotionButton type="button" className="hm-btn" disabled={!canEdit || busy || newTypes.length >= TYPE_LIMIT}
              onClick={() => setTypeEditor({})}><Plus size={16}/>Thêm loại phòng</MotionButton>
          </div>
          {newTypes.length > 0 && <ul className="ml-type-list">
            {newTypes.map(type => <li key={type.id}>
              <div><strong>{type.data.roomType}</strong>
                <p>{money(type.data.price)} / tháng · {type.data.areaSqm} m² · {type.data.capacity} người</p>
                {type.missingPhotos > 0 && <span className="ml-issue">Cần chọn lại {type.missingPhotos} ảnh</span>}
              </div>
              <div className="ml-type-actions">
                <MotionButton type="button" className="hm-btn hm-btn-subtle" aria-label={'Sửa ' + type.data.roomType}
                  disabled={!canEdit || busy} onClick={() => setTypeEditor(type)}>Sửa</MotionButton>
                <MotionButton type="button" className="hm-btn hm-btn-subtle" aria-label={'Bỏ ' + type.data.roomType}
                  disabled={!canEdit || busy} onClick={() => setRemoveType(type)}>Bỏ</MotionButton>
              </div>
            </li>)}
          </ul>}
          {newTypes.length >= TYPE_LIMIT && <p>Mỗi đợt có thể tạo tối đa {TYPE_LIMIT} loại phòng mới.</p>}
          {savedTypes.length ? <details className="ml-options">
            <summary>{savedTypes.length} loại phòng đã lưu</summary>
            <ul className="ml-saved-types">{savedTypes.map(type => <li key={type.roomTypeId}>
              <strong>{type.roomType}</strong><span>{money(type.price)} / tháng</span>
            </li>)}</ul>
          </details> : !newTypes.length && <p className="ml-empty">Chưa có loại phòng. Thêm loại đầu tiên, ví dụ Phòng tiêu chuẩn hoặc Studio có ban công.</p>}
        </section>
        <fieldset className="ml-workspace" hidden={step !== 'generate'} disabled={!canEdit || busy}>
          <Generator floors={floors} floor={activeFloor} inventory={inventory} rows={rows} types={types}
            mode={generatorMode} setMode={setGeneratorMode} onFloor={selectFloor} onAdd={addRooms} />
        </fieldset>
        <fieldset className="ml-workspace" hidden={step !== 'assign'} disabled={!canEdit || busy}>
          <section className="ml-panel ml-list" aria-labelledby="ml-list-title">
            <div className="ml-list-header">
              <div><h2 id="ml-list-title" tabIndex={-1}>Gán loại cho từng phòng</h2>
                <p>Đổi loại ngay trong bảng hoặc chọn nhiều phòng để gán cùng lúc.</p></div>
              <div className="ml-inline-actions">
                <MotionButton type="button" className="hm-btn" disabled={layoutFloorNumber(activeFloor) === null}
                  onClick={() => goTo('generate', 'add')}><Plus size={15}/>Thêm phòng vào tầng đang xem</MotionButton>
                <MotionButton type="button" className="hm-btn hm-btn-subtle" disabled={!history.length} onClick={undo}><RotateCcw size={15}/>Hoàn tác</MotionButton>
              </div>
            </div>
            {!types.length && <div className="ml-assignment-hint">
              <p>Thêm ít nhất một loại phòng để gán cho danh sách này.</p>
              <MotionButton type="button" className="hm-btn" onClick={() => goTo('types')}>Đến bước loại phòng</MotionButton>
            </div>}
            {floors.length > 0 && <div className={'ml-floor-switch' + (floors.length <= 5 ? ' ml-few-floors' : '')}>
              {floors.length <= 5 && <div className="ml-floor-buttons" role="group" aria-label="Chọn tầng">
                {floors.map(name => <MotionButton type="button" className="hm-btn" key={name} aria-pressed={activeFloor === name}
                  onClick={() => { if (name !== activeFloor) selectFloor(name); }}>{name} <span>{groups.get(name)?.length || 0}</span></MotionButton>)}
              </div>}
              <label className="ml-floor-select">Tầng đang xem
                <select aria-label="Tầng đang xem" value={activeFloor} onChange={e => selectFloor(e.target.value)}>
                  {floors.map(name => <option key={name} value={name}>{name} · {groups.get(name)?.length || 0} phòng</option>)}
                </select>
              </label>
            </div>}
            {rows.length > 0 && <div className="ml-assign">
              <div className="ml-selection" aria-live="polite"><strong>Đã chọn {selected.size} phòng</strong>
                {selectedFloors.size > 0 && <span>{[...selectedFloors].join(', ')}</span>}
              </div>
              <label>Chọn nhanh
                <select aria-label="Chọn nhanh" value="" onChange={e => quickSelect(e.target.value)} disabled={!onFloor.length && !selected.size}>
                  <option value="" disabled>Chọn nhóm phòng</option>
                  <option value="all">Cả tầng này</option><option value="odd">Phòng số lẻ</option>
                  <option value="even">Phòng số chẵn</option><option value="unassigned">Phòng chưa gán loại</option>
                  <option value="none">Bỏ chọn</option>
                </select>
              </label>
              <label>Loại phòng cần gán
                <select aria-label="Loại phòng cần gán" value={activeChosenType} disabled={!types.length} onChange={e => setChosenType(e.target.value)}>
                  {!types.length && <option value="">Thêm loại phòng trước</option>}<TypeOptions types={types}/>
                </select>
              </label>
              <MotionButton type="button" className="hm-btn hm-btn-primary" disabled={!selected.size || !activeChosenType} onClick={assign}>Gán loại</MotionButton>
            </div>}
            {error && <p className="ml-error" role="alert">{error}</p>}
            <p className="ml-status" role="status">{message}</p>
            {rows.length > 0 && <details className="ml-options ml-advanced">
              <summary>Công cụ gán nâng cao</summary>
              <div className="ml-extra">
              {draftFloors.length > 1 && groups.has(activeFloor) &&
                <CopyAssignments key={activeFloor} source={activeFloor} floors={draftFloors} groups={groups} rows={rows}
                  onApply={(next, affected) => commit(next, 'Đã sao chép loại cho ' + affected + ' phòng.')} />}
              <details className="ml-options"><summary>Chọn nhanh bằng danh sách số phòng</summary>
                <label>Danh sách số phòng cần chọn<textarea aria-label="Danh sách số phòng cần chọn" rows={2} value={selectionText} onChange={e => setSelectionText(e.target.value)} placeholder="101, 104, 201"/></label>
                <p>Có thể chọn qua nhiều tầng. Ngăn cách bằng dấu phẩy hoặc xuống dòng.</p>
                <MotionButton type="button" className="hm-btn" onClick={selectNumbers}>Chọn các số này</MotionButton>
              </details>
              <details className="ml-options"><summary>Gán so le tự động</summary>
                <p>Áp dụng theo thứ tự bản nháp cho {selected.size ? selected.size + ' phòng đã chọn' : 'kết quả lọc của tầng đang xem'}.</p>
                <div className="ml-pattern">{activePattern.map((id, index) => <label key={index}>Vị trí {index + 1}
                  <select aria-label={'Vị trí ' + (index + 1)} value={id} onChange={e => setPattern(activePattern.map((value, i) => i === index ? Number(e.target.value) : value))}><TypeOptions types={types}/></select>
                </label>)}</div>
                <div className="ml-actions">
                  <MotionButton type="button" className="hm-btn" disabled={!types.length || activePattern.length >= 10} onClick={() => setPattern([...activePattern, types[0].roomTypeId])}>Thêm vị trí vào mẫu</MotionButton>
                  <MotionButton type="button" className="hm-btn" disabled={activePattern.length <= 1} onClick={() => setPattern(activePattern.slice(0, -1))}>Bớt vị trí cuối</MotionButton>
                  <MotionButton type="button" className="hm-btn" disabled={!activePattern.length || (!selected.size && !current.length)} onClick={alternating}>Áp dụng so le</MotionButton>
                </div>
              </details>
              </div>
            </details>}
            {onFloor.length === 0 ? <p className="ml-empty">{activeFloor ? 'Tầng này chưa có phòng trong bản nháp.' : 'Thêm tầng hoặc phòng để bắt đầu gán loại.'}</p> : <>
              <div className="ml-table-tools">
                <label>Tìm tên phòng<input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Ví dụ 301"/></label>
                <MotionButton type="button" className="hm-btn" aria-pressed={onlyIssues} disabled={!onlyIssues && !floorIssueCount}
                  onClick={() => { setOnlyIssues(value => !value); setPage(1); setSelected(new Set()); }}>
                  Cần xử lý ({floorIssueCount})
                </MotionButton>
                {selected.size > 0 && <MotionButton type="button" className="hm-btn hm-btn-subtle"
                  onClick={() => { commit(rows.filter(row => !selected.has(row.id))); setSelected(new Set()); }}>Bỏ {selected.size} phòng khỏi bản nháp</MotionButton>}
              </div>
              {current.length ? <>
                <table className="ml-table" role="table" aria-label={'Phòng đang thiết lập · ' + activeFloor}>
                  <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">
                    <label className="ml-page-check"><input type="checkbox" ref={pageCheckbox} aria-label="Chọn tất cả phòng trên trang này"
                      checked={pageSelected === visible.length} onChange={e => changeSelection(visible.map(row => row.id), e.target.checked)}/>Chọn</label>
                  </th><th role="columnheader" scope="col">Tên phòng</th><th role="columnheader" scope="col">Loại phòng</th><th role="columnheader" scope="col">Trạng thái</th></tr></thead>
                  <tbody role="rowgroup">{visible.map((row, index) => {
                    const issue = issues.get(row.id);
                    const issueId = 'ml-issue-' + index;
                    const name = row.roomNumber || 'dòng ' + ((currentPage - 1) * PAGE_SIZE + index + 1);
                    return <tr role="row" key={row.id} data-selected={selected.has(row.id) || undefined}
                      onFocusCapture={() => setEditingRoom(row.id)}
                      onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingRoom(null); }}>
                      <td role="cell"><label className="ml-row-check"><input type="checkbox" aria-label={'Chọn phòng ' + name}
                        checked={selected.has(row.id)} onChange={e => changeSelection([row.id], e.target.checked)}/></label></td>
                      <td role="cell"><input aria-label={'Tên phòng ' + name} value={row.roomNumber} maxLength={30}
                        aria-invalid={issue.duplicate || issue.messages.includes('Tên phòng không hợp lệ') || undefined}
                        aria-describedby={issue.messages.length ? issueId : undefined}
                        onChange={e => updateRoom(row.id, 'roomNumber', e.target.value)}/></td>
                      <td role="cell"><select aria-label={'Loại phòng ' + name} value={issue.assigned ? row.roomTypeId : ''}
                        onChange={e => updateRoom(row.id, 'roomTypeId', Number(e.target.value) || null)}>
                        <option value="">Chưa gán loại</option><TypeOptions types={types}/>
                      </select></td>
                      <td role="cell" className="ml-row-status"><span id={issueId} className={issue.messages.length ? 'ml-issue' : 'ml-ok'}>
                        {issue.messages.length ? issue.messages.join(' · ') : 'Đã gán'}</span></td>
                    </tr>;
                  })}</tbody>
                </table>
                <nav className="ml-pagination" aria-label="Trang phòng trong tầng">
                  <MotionButton type="button" className="hm-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</MotionButton>
                  <span>Trang {currentPage}/{maxPage} · {countLabel(current.length)} phòng</span>
                  <MotionButton type="button" className="hm-btn" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Sau</MotionButton>
                </nav>
              </> : <p className="ml-empty">{onlyIssues && !floorIssueCount ? 'Tầng này đã sẵn sàng để tạo.' : 'Không có phòng phù hợp với bộ lọc.'}</p>}
            </>}
          </section>
        </fieldset>
        <footer className="ml-footer">
          <div><strong>{newTypes.length} loại phòng mới · {countLabel(rows.length)} phòng</strong>
            {rows.length > 0 && <p>{issueCount ? countLabel(issueCount) + ' phòng cần xử lý' : 'Tất cả phòng đã sẵn sàng'}.</p>}
          </div>
          <div className="ml-inline-actions">
            {step !== 'types' && <MotionButton type="button" className="hm-btn hm-btn-subtle" disabled={busy}
              onClick={() => goTo(step === 'assign' ? 'generate' : 'types', 'new')}><ArrowLeft size={16}/>Quay lại</MotionButton>}
            {(step === 'assign' || rows.length > 0 || newTypes.length > 0) && <MotionButton type="button"
              className={'hm-btn' + (step === 'assign' ? ' hm-btn-primary' : '')}
              disabled={(!rows.length && !newTypes.length) || busy} onClick={() => { setSaveError(''); setReview(true); }}>
              Kiểm tra trước khi lưu <ArrowRight size={16}/>
            </MotionButton>}
            {step === 'types' && <MotionButton type="button" className="hm-btn hm-btn-primary"
              disabled={busy} onClick={() => goTo('generate', 'new')}>Tiếp tục tạo theo tầng <ArrowRight size={16}/></MotionButton>}
            {step === 'generate' && rows.length > 0 && <MotionButton type="button" className="hm-btn hm-btn-primary"
              disabled={busy} onClick={() => goTo('assign')}>Tiếp tục gán loại <ArrowRight size={16}/></MotionButton>}
          </div>
        </footer>
    </section>
    {typeEditor && <RoomTypeCreateModal property={property} initialDraft={typeEditor.id ? { data: typeEditor.data } : null}
      missingPhotos={typeEditor.missingPhotos} onClose={() => setTypeEditor(null)} onSaveDraft={saveTypeDraft}/>}
    {removeType && <Modal className="ml-review" title="Bỏ loại phòng khỏi bản nháp" onClose={() => setRemoveType(null)}>
      <p>Bỏ “{removeType.data.roomType}”? Phòng đang dùng loại này sẽ trở về trạng thái chưa gán.</p>
      <footer className="ml-review-footer">
        <MotionButton type="button" className="hm-btn" onClick={() => setRemoveType(null)}>Giữ lại</MotionButton>
        <MotionButton type="button" className="hm-btn hm-btn-danger-outline" onClick={deleteTypeDraft}>Bỏ loại phòng</MotionButton>
      </footer>
    </Modal>}
    {review && <Modal className="ml-review" title="Kiểm tra trước khi lưu" onClose={() => { if (!busy) setReview(false); }}>
      <div className="ml-review-body" aria-busy={busy}>
        {newTypes.length > 0 && <ul className="ml-type-list ml-review-types" aria-label="Loại phòng mới">
          {newTypes.map(type => <li key={type.id}>
            <div><strong>{type.data.roomType}</strong><p>{money(type.data.price)} / tháng · {rows.filter(row => row.roomTypeId === type.id).length} phòng</p></div>
            <MotionButton type="button" className="hm-btn hm-btn-subtle" aria-label={'Sửa ' + type.data.roomType} disabled={busy}
              onClick={() => { if (step !== 'types') setStep('types'); setReview(false); setTypeEditor(type); }}>Sửa</MotionButton>
          </li>)}
        </ul>}
        {missingPhotos && <p className="ml-error" role="status">Mở loại phòng để chọn lại ảnh sau khi tải lại trang.</p>}
        {tooManyPhotos && <p className="ml-error" role="status">Mỗi đợt tối đa 40 ảnh và tổng 80 MB. Bớt ảnh trước khi lưu.</p>}
        <p>{countLabel(rows.length)} phòng · {draftFloors.length} tầng · {countLabel(assigned)} phòng đã gán loại</p>
        {issueCount > 0 && <p className="ml-error" role="status">Cần kiểm tra {countLabel(issueCount)} phòng. Chọn tầng để sửa.</p>}
        <ul className="ml-review-list">{draftFloors.map(name => {
          const group = groups.get(name);
          const missing = group.filter(row => !issues.get(row.id).assigned).length;
          const duplicates = group.filter(row => issues.get(row.id).duplicate).length;
          const other = group.filter(row => issues.get(row.id).messages.some(message => !['Trùng tên phòng', 'Chưa gán loại'].includes(message))).length;
          const firstIssue = Math.max(0, group.findIndex(row => issues.get(row.id).messages.length));
          return <li key={name}><button type="button" disabled={busy} onClick={() => reviewFloor(name, firstIssue)}>
            <strong>{name}</strong><span>{group.length} phòng · {group.length - missing} đã gán · {missing} còn thiếu</span>
            {duplicates > 0 && <span className="ml-issue">{duplicates} phòng trùng tên</span>}
            {other > 0 && <span className="ml-issue">{other} phòng có thông tin không hợp lệ</span>}
            <ArrowRight size={16} aria-hidden="true"/>
          </button></li>;
        })}</ul>
        {saveError && <p role="alert" className="ml-error">{saveError}</p>}
        {!canEdit && <p className="ml-error">Nhà trọ cần được phê duyệt và đang hoạt động để tiếp tục.</p>}
        {rows.length > 0 && <p>Phòng mới được tạo ở chế độ riêng tư. Bạn có thể chọn công khai ở bước tiếp theo.</p>}
      </div>
      <footer className="ml-review-footer">
        <MotionButton type="button" className="hm-btn" disabled={busy} onClick={() => setReview(false)}>Quay lại chỉnh sửa</MotionButton>
        <MotionButton type="button" className="hm-btn hm-btn-primary" disabled={busy || !canSave} onClick={save}>
          {busy ? <><LoaderCircle size={16} className="spin"/>Đang tạo phòng…</> : <><Check size={16}/>{confirmationLabel}</>}
        </MotionButton>
      </footer>
    </Modal>}
  </HostManagementShell>;
}
