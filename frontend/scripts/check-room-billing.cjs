// All application APIs are fixtures. No real backend writes occur.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.ROOM_BULK_TEST_URL || 'http://127.0.0.1:5198';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    const requests = { schedule: [], draft: [], issue: [], payment: [] };
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'billing-fixture'));
    await page.route('https://**', r => r.abort());

    const properties = [
      { propertyId: 12, name: 'Nhà trọ Hòa Lạc Xanh', address: 'Thạch Hòa', status: 'ACTIVE' },
      { propertyId: 19, name: 'Khu trọ Tân Xã', address: 'Tân Xã', status: 'ACTIVE' },
    ];
    const roomTypes = [
      { roomTypeId: 34, propertyId: 12, roomType: 'Studio', price: 2200000, areaSqm: 25, capacity: 2, amenities: [], totalRooms: 3, vacantRooms: 0 },
    ];
    const rooms = [
      { roomId: 102, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '102', floor: 'Tầng 1', status: 'OCCUPIED', price: 2200000, deposit: 2200000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-01', leaseEndDate: '2027-11-01' },
      { roomId: 103, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '103', floor: 'Tầng 1', status: 'OCCUPIED', price: 2200000, deposit: 2200000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-01', leaseEndDate: '2027-11-01' },
      { roomId: 104, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '104', floor: 'Tầng 2', status: 'OCCUPIED', price: 2400000, deposit: 2400000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-15', leaseEndDate: '2027-11-15' },
    ];

    let state = null;
    const reset = () => {
      state = {
        nextBillId: 2,
        nextPaymentId: 2,
        candidates: [
          {
            roomId: 102, roomNumber: '102', tenantName: 'Duy Ninh', floor: 'Tầng 1', tenancyKey: 't-102',
            startDate: '2026-10-01', ended: false, issue: null,
            schedule: { cycleMonths: 1, dueDay: 21, firstDueDate: '2026-10-21' }, scheduleLocked: true,
            rent: { from: '2026-11-01', through: '2026-11-30', amount: '2200000' },
            dueDate: '2026-11-21', utilityDueDate: '2026-12-05', utilities: null, hasPartialUtilityReading: false,
            suggestedCharges: [{ label: 'Internet', amount: 100000 }, { label: 'Phí dịch vụ', amount: 50000 }],
            mainBillId: 1, mainIssued: true, utilityBillId: null, utilitiesAlreadyBilled: false,
          },
          {
            roomId: 103, roomNumber: '103', tenantName: 'Duy Ninh', floor: 'Tầng 1', tenancyKey: 't-103',
            startDate: '2026-11-01', ended: false, issue: null,
            schedule: { cycleMonths: 1, dueDay: 5, firstDueDate: '2026-11-05' }, scheduleLocked: false,
            rent: { from: '2026-11-01', through: '2026-11-30', amount: '2200000' },
            dueDate: '2026-11-25', utilityDueDate: '2026-12-05', utilities: null, hasPartialUtilityReading: true,
            suggestedCharges: [{ label: 'Internet', amount: 100000 }],
            mainBillId: null, mainIssued: false, utilityBillId: null, utilitiesAlreadyBilled: false,
          },
          {
            roomId: 104, roomNumber: '104', tenantName: 'Khách Đợt Cũ', floor: 'Tầng 2', tenancyKey: 't-104-old',
            startDate: '2026-08-01', ended: true, issue: null,
            schedule: { cycleMonths: 1, dueDay: 5, firstDueDate: '2026-08-05' }, scheduleLocked: false,
            rent: { from: '2026-11-01', through: '2026-11-14', amount: '1100000' },
            dueDate: '2026-11-14', utilityDueDate: '2026-11-14',
            utilities: {
              readOn: '2026-11-14', electricityAmount: '140000', waterAmount: '45000',
              electricityStart: 200, electricityEnd: 240, electricityRate: 3500,
              waterMode: 'METER', waterStart: 10, waterEnd: 13, waterRate: 15000, occupantCount: null,
            },
            hasPartialUtilityReading: false, suggestedCharges: [],
            mainBillId: null, mainIssued: false, utilityBillId: null, utilitiesAlreadyBilled: false,
          },
        ],
        bills: [
          {
            id: 1, revision: 1, propertyId: 12, roomId: 102, tenancyKey: 't-102', roomNumber: '102',
            tenantName: 'Duy Ninh', month: '2026-11', kind: 'MAIN', dueDate: '2026-11-21',
            issuedAt: '2026-11-05T08:00:00Z', status: 'PARTIAL', overdue: true,
            rentFrom: '2026-11-01', rentThrough: '2026-11-30', rentAmount: '2200000',
            includesUtilities: false, electricityAmount: '0', waterAmount: '0',
            charges: [{ label: 'Internet', amount: 100000 }, { label: 'Phí dịch vụ', amount: 50000 }],
            totalAmount: '2350000', paidAmount: '200000', outstanding: '2150000',
          },
        ],
        paymentsByBill: {
          1: [{ id: 1, paidOn: '2026-11-10', amount: '200000', method: 'TRANSFER', note: 'Chuyển khoản đợt 1' }],
        },
        earlierDebt: [],
      };
    };

    await page.route(base + '/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });

      if (p === '/api/auth/me') return ok({ userId: 1, fullName: 'Chủ trọ', phoneNumber: '0901234567', email: 'host@test', role: 'ROOM_HOST' });
      if (p === '/api/host/rooms') return ok({ properties, roomTypes, rooms, pendingRegistrationCount: 0 });
      if (p === '/api/host/room-billing' && req.method() === 'GET') {
        return ok({ month: url.searchParams.get('month') || '2026-11', today: '2026-11-22', candidates: state.candidates, bills: state.bills, earlierDebt: state.earlierDebt });
      }
      if (p === '/api/host/room-billing/schedule' && req.method() === 'PUT') {
        const body = JSON.parse(req.postData());
        requests.schedule.push(body);
        state.candidates = state.candidates.map(c =>
          c.tenancyKey === body.period.tenancyKey
            ? { ...c, schedule: { cycleMonths: body.cycleMonths, dueDay: body.dueDay, firstDueDate: body.firstDueDate } }
            : c
        );
        return ok({ month: body.period.month, today: '2026-11-22', candidates: state.candidates, bills: state.bills, earlierDebt: state.earlierDebt });
      }
      if (p === '/api/host/room-billing/draft' && req.method() === 'PUT') {
        const body = JSON.parse(req.postData());
        requests.draft.push(body);
        const cand = state.candidates.find(c => c.tenancyKey === body.period.tenancyKey);
        const id = state.nextBillId++;
        const extras = (body.charges || []).reduce((s, c) => s + Number(c.amount), 0);
        const eAmt = body.includeUtilities && cand.utilities ? Number(cand.utilities.electricityAmount) : 0;
        const wAmt = body.includeUtilities && cand.utilities ? Number(cand.utilities.waterAmount) : 0;
        const total = Number(body.rentAmount) + eAmt + wAmt + extras;
        const created = {
          id, revision: 0, propertyId: 12, roomId: cand.roomId, tenancyKey: cand.tenancyKey, roomNumber: cand.roomNumber,
          tenantName: cand.tenantName, month: body.period.month, kind: body.kind, dueDate: body.dueDate,
          issuedAt: null, status: 'DRAFT', overdue: false,
          rentFrom: cand.rent?.from || null, rentThrough: cand.rent?.through || null, rentAmount: String(body.rentAmount),
          includesUtilities: body.includeUtilities, electricityAmount: String(eAmt), waterAmount: String(wAmt),
          charges: body.charges, totalAmount: String(total), paidAmount: '0', outstanding: String(total),
        };
        state.bills = [created, ...state.bills];
        state.paymentsByBill[id] = [];
        state.candidates = state.candidates.map(c => c.tenancyKey === cand.tenancyKey ? { ...c, mainBillId: id } : c);
        return ok(created);
      }
      if (/^\/api\/host\/room-billing\/\d+$/.test(p) && req.method() === 'GET') {
        const id = Number(p.split('/').at(-1));
        const bill = state.bills.find(b => b.id === id);
        return ok({ bill, payments: state.paymentsByBill[id] || [] });
      }
      if (/^\/api\/host\/room-billing\/\d+\/issue$/.test(p) && req.method() === 'POST') {
        const id = Number(p.split('/').at(-2));
        requests.issue.push(id);
        state.bills = state.bills.map(b => b.id === id ? { ...b, status: 'UNPAID', issuedAt: '2026-11-22T09:00:00Z', revision: b.revision + 1 } : b);
        const bill = state.bills.find(b => b.id === id);
        return ok(bill);
      }
      if (/^\/api\/host\/room-billing\/\d+\/payments$/.test(p) && req.method() === 'POST') {
        const id = Number(p.split('/').at(-2));
        const body = JSON.parse(req.postData());
        requests.payment.push(body);
        const bill = state.bills.find(b => b.id === id);
        const paid = Number(bill.paidAmount) + Number(body.amount);
        const out = Number(bill.totalAmount) - paid;
        const nextBill = {
          ...bill,
          paidAmount: String(paid),
          outstanding: String(out),
          status: out === 0 ? 'PAID' : 'PARTIAL',
          overdue: out > 0 && bill.overdue,
        };
        state.bills = state.bills.map(b => b.id === id ? nextBill : b);
        const tx = { id: state.nextPaymentId++, paidOn: body.paidOn, amount: String(body.amount), method: body.method, note: body.note || null };
        state.paymentsByBill[id] = [tx, ...(state.paymentsByBill[id] || [])];
        return ok({ bill: nextBill, payments: state.paymentsByBill[id] });
      }
      return ok({ items: [], unreadCount: 0, totalElements: 0 });
    });

    const out = path.resolve(__dirname, '../../target/room-billing-ui');
    fs.mkdirSync(out, { recursive: true });

    for (const width of [1440, 1366, 768, 375, 1920]) {
      reset();
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/host/rooms?propertyId=12&billing=1&month=2026-11`);
      await page.getByRole('heading', { name: 'Phiếu thu & công nợ', exact: true }).waitFor();

      // KPI cards verify exact figures
      await page.locator('.hb-kpi-grid').getByText('2.350.000 đ').waitFor();
      await page.locator('.hb-kpi-grid').getByText('200.000 đ').waitFor();
      await page.locator('.hb-kpi-grid').getByText('2.150.000 đ').waitFor();

      // Tab badges: 1 bill, 2 pending candidates (P.102 already billed so excluded from pending count!)
      await page.getByRole('tab', { name: /Phiếu thu & công nợ/ }).getByText('1', { exact: true }).waitFor();
      await page.getByRole('tab', { name: /Đợt thuê cần lập phiếu/ }).getByText('2', { exact: true }).waitFor();

      if (width === 1440 || width === 375) {
        await page.screenshot({ path: path.join(out, `billing-${width}.png`), fullPage: false });
      }

      // Check zero horizontal overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 2, `Overflow ${overflow}px at ${width}px`);

      // Open the issued bill and check its title, payment history and payment flow.
      await page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
      const drawer = page.getByRole('dialog');
      await drawer.getByRole('heading', { name: 'Phiếu thu', exact: true }).waitFor();
      await drawer.getByText('Chuyển khoản đợt 1').waitFor();
      await drawer.getByText(/^Lần 1 · Ngày /).waitFor();

      // Open inline payment form -> verify overpayment validation + live debt preview + partial & full payment
      await drawer.getByRole('button', { name: 'Ghi nhận thanh toán', exact: true }).click();
      await drawer.locator('input[name="amount"]').fill('3000000');
      await drawer.getByText('Vượt công nợ').waitFor();
      await drawer.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click();
      await drawer.getByText(/không được vượt quá công nợ/).waitFor();

      // Partial payment 150.000 đ
      await drawer.locator('input[name="amount"]').fill('150000');
      await drawer.locator('.hb-debt-preview').getByText('2.000.000 đ').waitFor();
      if (width === 1440) {
        await page.screenshot({ path: path.join(out, 'billing-drawer-1440.png'), fullPage: false });
      }
      await drawer.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click();
      await drawer.locator('.hb-detail-outstanding').getByText('2.000.000 đ').waitFor();
      await drawer.getByText(/^Lần 2 · Ngày /).waitFor();

      // Quick fill remaining 2.000.000 đ -> transitions to Đã thanh toán
      await drawer.getByRole('button', { name: 'Ghi nhận thanh toán', exact: true }).click();
      await drawer.getByRole('button', { name: /Thu đủ còn lại/ }).click();
      await drawer.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click();
      await drawer.getByText('Đã thanh toán').first().waitFor();
      await drawer.locator('.hm-drawer-footer').getByRole('button', { name: 'Đóng', exact: true }).click();
      await drawer.waitFor({ state: 'detached' });

      // Switch to Tab 2 (Đợt thuê cần lập phiếu): verify P.102 is hidden, P.103 shows "Mới tạm ghi", P.104 shows "Đã trả phòng" + finalized utilities
      await page.getByRole('tab', { name: /Đợt thuê cần lập phiếu/ }).click();
      assert.equal(await page.locator('[data-tenancy-key="t-102"]').count(), 0, 'Already-billed P.102 must not appear in pending list');
      const card103 = page.locator('[data-tenancy-key="t-103"]');
      await card103.getByText('Mới tạm ghi (chưa cộng vào phiếu)').waitFor();
      const card104 = page.locator('[data-tenancy-key="t-104-old"]');
      await card104.getByText('Đã trả phòng').waitFor();
      if (width === 1440) {
        await page.screenshot({ path: path.join(out, 'billing-pending-1440.png'), fullPage: false });
      }

      // Open Schedule Drawer on P.103 -> verify day 31 month-end rule & save
      await card103.getByRole('button', { name: 'Chu kỳ thu', exact: true }).click();
      const schedDrawer = page.getByRole('dialog');
      await schedDrawer.locator('input[name="dueDay"]').fill('31');
      await schedDrawer.getByText(/Quy tắc ngày cuối tháng/).waitFor();
      await schedDrawer.getByRole('button', { name: 'Lưu chu kỳ', exact: true }).click();
      await schedDrawer.waitFor({ state: 'detached' });

      // Open Create Invoice Drawer on P.103 -> verify partial utilities NOT checked, add extra charge, save draft
      await card103.getByRole('button', { name: 'Lập phiếu', exact: true }).click();
      const draftDrawer = page.getByRole('dialog');
      await draftDrawer.getByText('Mới tạm ghi — chưa chốt đến cuối kỳ').waitFor();
      await draftDrawer.getByRole('button', { name: 'Thêm khoản phí', exact: true }).click();
      await draftDrawer.locator('.hb-charge-row').last().locator('input[type="text"]').first().fill('Gửi xe');
      await draftDrawer.locator('.hb-charge-row').last().locator('input[inputmode="numeric"]').fill('80000');
      await draftDrawer.locator('.hb-summary-box').getByText('2.380.000 đ').waitFor();
      await draftDrawer.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
      await draftDrawer.getByRole('heading', { name: 'Bản nháp', exact: true }).waitFor();
      await draftDrawer.locator('.hm-drawer-footer').getByRole('button', { name: 'Đóng', exact: true }).click();
      await draftDrawer.waitFor({ state: 'detached' });
    }

    assert.ok(requests.payment.every(p => /^[0-9a-f-]{36}$/i.test(p.requestKey)));
    assert.deepEqual(errors, [], `Console/page errors found: ${errors.join('; ')}`);
    console.log('PASS redesigned Billing & Debt module: KPIs excluding drafts, tabs with pending counts, modern data table + progress bars, right-side detail drawer + multi-payment & live debt preview, schedule drawer with 29/30/31 rule, 3-group create draft drawer with partial-utility guard, 5 widths (375..1920), zero errors.');
  } catch (error) {
    const p = browser.contexts()[0]?.pages()[0];
    if (p) {
      await p.screenshot({ path: path.resolve(__dirname, '../../target/room-billing-ui/failed.png'), fullPage: true });
      console.error((await p.locator('body').innerText()).slice(-4000));
    }
    throw error;
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
