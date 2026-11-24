const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const rooms = Array.from({ length: 6 }, (_, index) => ({
  propertyId: index + 1,
  roomTypeId: index + 11,
  propertyName: `Nhà trọ kiểm thử ${index + 1}`,
  roomTypeName: 'Studio',
  price: 2200000,
  areaSqm: 25,
  availableRooms: 2,
  verificationStatus: 'APPROVED',
}));
const posts = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1, type: 'ROOMMATE', title: `Bài viết kiểm thử ${index + 1}`,
  content: 'Phòng có điều hòa', authorName: 'Người đăng', status: 'APPROVED', price: null,
}));

async function check() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height, deviceScaleFactor = 1] of [[375, 800], [768, 800], [1024, 800], [1440, 800], [720, 450, 2]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor, reducedMotion: 'reduce' });
      await page.route(`${base}/api/**`, route => {
        const url = new URL(route.request().url());
        const ok = data => route.fulfill({ json: { success: true, data } });
        if (url.pathname === '/api/properties/search') {
          return ok({ items: rooms, page: Number(url.searchParams.get('page')), size: 6, totalElements: 12, totalPages: 2 });
        }
        if (url.pathname.endsWith('/details')) {
          return ok({ summary: rooms[0], gallery: [], propertyAmenities: [], amenities: [], selectedRules: [], similar: [],
            reviews: { ratingCounts: [0, 0, 0, 0, 0], totalReviews: 0, latest: [] } });
        }
        if (url.pathname === '/api/community/posts/feed') {
          return ok({ items: posts, hasMore: false, nextCursor: null,
            counts: { ALL: posts.length, ROOMMATE: posts.length, ROOM_TRANSFER: 0, SECOND_HAND: 0 } });
        }
        return ok([]);
      });

      const search = page.getByRole('heading', { name: 'Khám phá nhà trọ & Căn hộ tại Hòa Lạc' });
      const pagination = page.getByRole('navigation', { name: 'Phân trang kết quả' });
      const scrollY = () => page.evaluate(() => window.scrollY);
      const scrollDown = async () => {
        await page.evaluate(() => window.scrollTo({ top: 750, behavior: 'instant' }));
        assert.ok(await scrollY() > 300, 'Fixture page must be tall enough to scroll');
      };
      const navigate = async name => {
        const mobileMenu = page.getByRole('button', { name: 'Mở thực đơn', exact: true });
        if (await mobileMenu.isVisible()) await mobileMenu.click();
        await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name, exact: true }).click();
      };

      await page.goto(`${base}/search`);
      await pagination.waitFor();
      await page.getByRole('link', { name: 'Trang chủ NestHub', exact: true }).click();
      await page.locator('#home-results-heading').waitFor();
      await scrollDown();

      await navigate('Tìm phòng');
      await search.waitFor();
      await pagination.waitFor();
      assert.equal(await scrollY(), 0, `Search should open at the top at ${width}px`);

      await pagination.getByRole('button', { name: 'Trang 2', exact: true }).click();
      await page.waitForURL(/\/search\?page=2$/);
      await pagination.getByRole('button', { name: 'Trang 2', exact: true }).waitFor();
      assert.ok(await scrollY() > 0, 'Pagination should not reset the search page to the top');

      await page.getByRole('link', { name: 'Gọi chủ trọ', exact: true }).first().click();
      await page.waitForURL(/#host-contact$/);
      await page.locator('#host-contact').waitFor();
      await page.waitForFunction(() => {
        const contact = document.getElementById('host-contact');
        return window.scrollY > 0 && contact.getBoundingClientRect().top < window.innerHeight;
      });

      await page.goBack();
      await search.waitFor();
      await pagination.waitFor();
      assert.equal(await scrollY(), 0, 'Returning to the search screen should open it at the top');
      assert.equal(new URL(page.url()).searchParams.get('page'), '2');

      if (width === 1440) {
        await navigate('Cộng đồng');
        const firstPost = page.locator('.community-feed-card').first();
        await firstPost.waitFor();
        await scrollDown();
        await navigate('Tìm phòng');
        await search.waitFor();
        await navigate('Cộng đồng');
        await firstPost.waitFor();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await scrollY(), 0, 'A cached community feed should reopen at the top');
      }

      await page.close();
      console.log(`PASS route entry, Back, pagination and contact anchor at ${width}x${height} (${deviceScaleFactor}x)`);
    }
  } finally {
    await browser.close();
  }
}

check().catch(error => { console.error(error); process.exitCode = 1; });
