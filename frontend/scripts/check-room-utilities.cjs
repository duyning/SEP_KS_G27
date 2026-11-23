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
    const saves = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'utility-fixture'));
    await page.route('https://**', r => r.abort());

    const properties = [
      { propertyId: 12, name: 'Nhà trọ Hòa Lạc Xanh', address: 'Thạch Hòa, Thạch Thất', status: 'ACTIVE' },
      { propertyId: 19, name: 'Khu trọ Tân Xã', address: 'Tân Xã, Thạch Thất', status: 'ACTIVE' },
    ];
    const roomTypes = [
      { roomTypeId: 34, propertyId: 12, roomType: 'Studio', price: 2500000, areaSqm: 25, capacity: 2, amenities: [], totalRooms: 4, vacantRooms: 0 },
    ];
    const rooms = [
      { roomId: 101, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '101', floor: 'Tầng 1', status: 'OCCUPIED', price: 2500000, deposit: 2500000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-01', leaseEndDate: '2027-11-01' },
      { roomId: 102, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '102', floor: 'Tầng 1', status: 'OCCUPIED', price: 2500000, deposit: 2500000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-15', leaseEndDate: '2027-11-15' },
      { roomId: 201, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '201', floor: 'Tầng 2', status: 'OCCUPIED', price: 2600000, deposit: 2600000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-08-01', leaseEndDate: '2027-08-01' },
      { roomId: 202, propertyId: 12, roomTypeId: 34, roomType: 'Studio', roomNumber: '202', floor: 'Tầng 2', status: 'OCCUPIED', price: 2600000, deposit: 2600000, customPrice: null, amenities: [], confirmedAt: '2026-11-18T10:00:00', leaseStartDate: '2026-11-01', leaseEndDate: '2027-11-01' },
    ];

    let ledgerRows = [];
    const resetLedger = () => {
      ledgerRows = [
        {
          roomId: 101, roomNumber: '101', floor: 'Tầng 1', tenancyKey: 't-101', tenantName: 'Nguyễn Minh Quân',
          periodStart: '2026-11-01', periodEnd: '2026-11-30', latestReadOn: '2026-11-30',
          handover: false, issue: null, previousReadOn: '2026-10-31',
          suggestedElectricityStart: 120, suggestedWaterStart: 15, suggestedOccupants: 2,
          stays: [{ joinedOn: '2026-09-01', leftOn: null }, { joinedOn: '2026-09-01', leftOn: null }],
          defaultElectricityRate: 3500, defaultWaterRate: 15000, defaultWaterMode: 'METER', saved: null,
        },
        {
          roomId: 102, roomNumber: '102', floor: 'Tầng 1', tenancyKey: 't-102-old', tenantName: 'Trần Văn Cũ',
          periodStart: '2026-11-01', periodEnd: '2026-11-14', latestReadOn: '2026-11-14',
          handover: true, issue: null, previousReadOn: '2026-10-31',
          suggestedElectricityStart: 300, suggestedWaterStart: 40, suggestedOccupants: 1,
          stays: [{ joinedOn: '2026-06-01', leftOn: '2026-11-14' }],
          defaultElectricityRate: 3500, defaultWaterRate: 15000, defaultWaterMode: 'METER', saved: null,
        },
        {
          roomId: 102, roomNumber: '102', floor: 'Tầng 1', tenancyKey: 't-102-new', tenantName: 'Lê Thị Mới',
          periodStart: '2026-11-15', periodEnd: '2026-11-30', latestReadOn: '2026-11-30',
          handover: false, issue: null, previousReadOn: null,
          suggestedElectricityStart: null, suggestedWaterStart: null, suggestedOccupants: 2,
          stays: [
            { joinedOn: '2026-11-15', leftOn: null },
            { joinedOn: '2026-11-20', leftOn: null },
          ],
          defaultElectricityRate: 3500, defaultWaterRate: 90000, defaultWaterMode: 'PER_PERSON', saved: null,
        },
        {
          roomId: 201, roomNumber: '201', floor: 'Tầng 2', tenancyKey: 't-201', tenantName: 'Phạm Hoàng Nam',
          periodStart: '2026-11-01', periodEnd: '2026-11-30', latestReadOn: '2026-11-30',
          handover: false, issue: null, previousReadOn: '2026-10-31',
          suggestedElectricityStart: 410, suggestedWaterStart: null, suggestedOccupants: 1,
          stays: [{ joinedOn: '2026-08-01', leftOn: null }],
          defaultElectricityRate: 3500, defaultWaterRate: 100000, defaultWaterMode: 'FIXED',
          saved: {
            revision: 1, readOn: '2026-11-30', electricityStart: 410, electricityEnd: 510,
            electricityRate: 3500, electricityAmount: '350000', waterMode: 'FIXED',
            waterStart: null, waterEnd: null, waterRate: 100000, occupantCount: null, waterAmount: '100000',
          },
        },
        {
          roomId: 202, roomNumber: '202', floor: 'Tầng 2', tenancyKey: null, tenantName: null,
          periodStart: null, periodEnd: null, latestReadOn: null,
          handover: false, issue: 'Bổ sung hồ sơ đợt thuê để ghi chỉ số.', previousReadOn: null,
          suggestedElectricityStart: null, suggestedWaterStart: null, suggestedOccupants: 0,
          stays: [], defaultElectricityRate: null, defaultWaterRate: null, defaultWaterMode: null, saved: null,
        },
      ];
    };

    await page.route(base + '/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });

      if (p === '/api/auth/me') {
        return ok({ userId: 1, fullName: 'Chủ trọ kiểm thử', phoneNumber: '0901234567', email: 'host@example.test', role: 'ROOM_HOST' });
      }
      if (p === '/api/host/rooms') {
        return ok({ properties, roomTypes, rooms, pendingRegistrationCount: 0 });
      }
      if (p === '/api/host/room-utilities' && req.method() === 'GET') {
        const month = url.searchParams.get('month') || '2026-11';
        if (month === '2026-12') return ok({ month, currentMonth: '2026-11', editable: false, rows: [{
          ...ledgerRows[0], periodStart: '2026-12-01', periodEnd: '2026-12-31', latestReadOn: '2026-12-31',
          suggestedElectricityStart: 150, suggestedWaterStart: 4, previousReadOn: '2026-11-21',
        }] });
        return ok({ month, currentMonth: '2026-11', editable: true, rows: ledgerRows });
      }
      if (p === '/api/host/room-utilities' && req.method() === 'POST') {
        const body = JSON.parse(req.postData());
        saves.push(body);
        ledgerRows = ledgerRows.map(row => {
          const entry = body.entries.find(e => e.tenancyKey === row.tenancyKey);
          if (!entry) return row;
          const eDelta = Number(entry.electricityEnd) - Number(entry.electricityStart);
          const eAmt = Math.round(eDelta * Number(entry.electricityRate));
          let wAmt = Number(entry.waterRate);
          if (entry.waterMode === 'METER') {
            wAmt = Math.round((Number(entry.waterEnd) - Number(entry.waterStart)) * Number(entry.waterRate));
          } else if (entry.waterMode === 'PER_PERSON') {
            wAmt = Math.round((entry.occupantCount ?? row.suggestedOccupants) * Number(entry.waterRate));
          }
          return {
            ...row,
            saved: {
              revision: (row.saved?.revision ?? 0) + 1,
              readOn: entry.readOn,
              electricityStart: Number(entry.electricityStart),
              electricityEnd: Number(entry.electricityEnd),
              electricityRate: Number(entry.electricityRate),
              electricityAmount: String(eAmt),
              waterMode: entry.waterMode,
              waterStart: entry.waterStart == null ? null : Number(entry.waterStart),
              waterEnd: entry.waterEnd == null ? null : Number(entry.waterEnd),
              waterRate: Number(entry.waterRate),
              occupantCount: entry.occupantCount,
              waterAmount: String(wAmt),
            },
          };
        });
        return ok({ month: body.month, currentMonth: '2026-11', editable: true, rows: ledgerRows });
      }
      return ok({ items: [], unreadCount: 0, totalElements: 0 });
    });

    const out = path.resolve(__dirname, '../../target/room-utilities-ui');
    fs.mkdirSync(out, { recursive: true });

    for (const width of [1440, 1366, 1024, 768, 375, 1920]) {
      resetLedger();
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/host/rooms?propertyId=12&utilities=1&month=2026-11`);
      await page.getByRole('heading', { name: 'Ghi điện nước', exact: true }).waitFor();

      if (width === 1440) {
        const picker = page.getByLabel('Tháng ghi', { exact: true });
        await picker.fill('2026-12');
        await page.getByText('Xem trước tháng tương lai.', { exact: true }).waitFor();
        const preview = page.locator('[data-row-key="t-101"]');
        assert.equal(await preview.locator('input[name="electricityStart"]').inputValue(), '150');
        assert.equal(await preview.locator('input[name="waterStart"]').inputValue(), '4');
        assert.equal(await page.locator('.hu-save-btn').isDisabled(), true);
        await picker.fill('2026-11');
        await page.getByText('Xem trước tháng tương lai.', { exact: true }).waitFor({ state: 'detached' });
      }

      const managementTabs = page.getByRole('tablist', { name: 'Điều hướng quản lý nhà trọ' });
      assert.equal(await managementTabs.count(), 0);
      assert.equal(await page.getByRole('navigation', { name: 'Điều hướng phân cấp' }).count(), 0);
      await page.locator('.hu-stats-strip').getByText('Tổng cần ghi').waitFor();

      // Verify missing tenancy warning card for Room 202
      const card202 = page.locator('[data-row-key="room-202"]');
      await card202.getByText('Bổ sung hồ sơ đợt thuê để ghi chỉ số.').waitFor();
      await card202.getByRole('button', { name: /Bổ sung hồ sơ đợt thuê/ }).waitFor();

      // Verify Room 101 real-time calculation & Enter navigation
      const card101 = page.locator('[data-row-key="t-101"]');
      const eEnd101 = card101.locator('input[name="electricityEnd"]');
      await eEnd101.fill('220'); // 100 kWh * 3500 = 350.000 đ
      await card101.getByText('100 kWh').waitFor();
      await eEnd101.press('Enter'); // Moves to electricityRate
      const focusedName = await page.evaluate(() => document.activeElement?.getAttribute('name'));
      assert.equal(focusedName, 'electricityRate', 'Enter must advance focus to next utility input');

      // Water end missing -> total must display '—', NOT '0 đ'
      assert.equal(await card101.locator('.hu-total-row strong').innerText(), '—');
      await card101.locator('input[name="waterEnd"]').fill('21'); // 6 m3 * 15000 = 90.000 đ -> Total 440.000 đ
      await card101.locator('input[name="readOn"]').fill('2026-11-21');
      await card101.getByText('440.000 đ').waitFor();

      // Non-destructive local filtering: filter to Tầng 2 then back to all -> 101 edit preserved!
      await page.locator('.hu-filter-card select').nth(1).selectOption('Tầng 2');
      await page.locator('[data-row-key="t-101"]').waitFor({ state: 'detached' });
      await page.locator('.hu-clear-filters-btn').click();
      await card101.waitFor();
      assert.equal(await card101.locator('input[name="electricityEnd"]').inputValue(), '220');

      // A decreasing handover reading leaves only one valid row to close.
      const card102Old = page.locator('[data-row-key="t-102-old"]');
      await card102Old.locator('input[name="electricityEnd"]').fill('250'); // < 300 -> error!
      await card102Old.getByText('Chỉ số mới thấp hơn chỉ số đầu.').waitFor();

      const saveBtn = page.locator('.hu-save-btn');
      assert.equal(await saveBtn.isDisabled(), false);
      await saveBtn.getByText('Lưu và chốt (1)').waitFor();

      if ([1440, 1366, 768, 375].includes(width)) {
        await page.screenshot({ path: path.join(out, `utilities-${width}.png`), fullPage: false });
      }

      // Check zero horizontal overflow on all widths!
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 2, `Horizontal overflow ${overflow}px detected at width ${width}px`);

      // Click Save -> ONLY P.101 is sent; P.102 invalid edit stays preserved!
      const savesBefore = saves.length;
      await saveBtn.click();
      await page.locator('.hu-banner.is-success').getByText(/Đã chốt 1 bản ghi/).waitFor();
      await card101.getByText('Đã chốt kỳ', { exact: true }).waitFor();
      await card101.getByText(/Đã chốt theo số đo ngày 21\/11\/2026/).waitFor();
      const stats = page.locator('.hu-stats-strip .hu-stat-item');
      assert.equal(await stats.filter({ hasText: /^Đã chốt/ }).locator('strong').innerText(), '2');
      assert.equal(await stats.filter({ hasText: /^Chưa ghi/ }).locator('strong').innerText(), '2');
      assert.equal(saves.length, savesBefore + 1);
      assert.deepEqual(saves.at(-1).entries.map(e => e.tenancyKey), ['t-101']);
      assert.equal(await card102Old.locator('input[name="electricityEnd"]').inputValue(), '250');

      // Fix Room 102 handover -> verify carried meter start appears on Room 102 new tenancy!
      await card102Old.locator('input[name="electricityEnd"]').fill('340');
      await card102Old.locator('input[name="waterEnd"]').fill('45');
      const card102New = page.locator('[data-row-key="t-102-new"]');
      await card102New.getByText(/Mốc đầu nối tiếp từ bàn giao 14\/11\/2026/).waitFor();
      assert.equal(await card102New.locator('input[name="electricityStart"]').inputValue(), '340');

      // Test unsaved-changes confirmation modal when clicking back
      const backButton = page.getByRole('button', { name: 'Danh sách phòng', exact: true });
      await backButton.press('Enter');
      const confirmModal = page.getByRole('dialog');
      await confirmModal.getByText('Bạn có thay đổi chưa lưu').waitFor();
      await confirmModal.getByRole('button', { name: 'Ở lại trang', exact: true }).click();
      await confirmModal.waitFor({ state: 'detached' });
      assert.equal(await card102Old.locator('input[name="electricityEnd"]').inputValue(), '340');

      if (width === 1440) {
        await backButton.press('Enter');
        await confirmModal.getByRole('button', { name: 'Bỏ thay đổi & tiếp tục', exact: true }).click();
        await page.waitForURL(`${base}/host/rooms?propertyId=12`);
        await managementTabs.waitFor({ state: 'visible' });
      }
    }

    assert.deepEqual(errors, [], `Console/page errors found: ${errors.join('; ')}`);
    console.log('PASS Ghi điện nước: focused layout, keyboard return to room list, readings, filters, save, and unsaved guard at 6 widths (375–1920).');
  } catch (error) {
    const p = browser.contexts()[0]?.pages()[0];
    if (p) {
      await p.screenshot({ path: path.resolve(__dirname, '../../target/room-utilities-ui/failed.png'), fullPage: true });
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
