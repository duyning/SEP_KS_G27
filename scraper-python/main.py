import asyncio
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
import auth


@asynccontextmanager
async def lifespan(app):
    try:
        yield
    finally:
        await auth.cancel_login()


app = FastAPI(title="HL-RCS Facebook collector", lifespan=lifespan)
lock = auth.account_lock

SESSION_PATH = os.getenv("FB_SESSION_FILE", "data/facebook-session.json")


@app.middleware("http")
async def internal_access(request: Request, call_next):
    token = os.getenv("SCRAPER_API_TOKEN", "")
    if not token or not secrets.compare_digest(request.headers.get("X-Scraper-Token", ""), token):
        return JSONResponse(status_code=403, content={"detail": "Internal access only"})
    return await call_next(request)


class ScrapeRequest(BaseModel):
    groupUrl: str

    @field_validator("groupUrl")
    @classmethod
    def valid_group(cls, value):
        if not re.fullmatch(r"https://(?:www\.|m\.)?facebook\.com/groups/[A-Za-z0-9._-]+/?(?:\?[^#]*)?", value):
            raise ValueError("Invalid Facebook group URL")
        return value.split("?")[0].rstrip("/")


VIETNAMESE_MONTHS = {
    "tháng 1": 1, "tháng 01": 1,
    "tháng 2": 2, "tháng 02": 2,
    "tháng 3": 3, "tháng 03": 3,
    "tháng 4": 4, "tháng 04": 4,
    "tháng 5": 5, "tháng 05": 5,
    "tháng 6": 6, "tháng 06": 6,
    "tháng 7": 7, "tháng 07": 7,
    "tháng 8": 8, "tháng 08": 8,
    "tháng 9": 9, "tháng 09": 9,
    "tháng 10": 10,
    "tháng 11": 11,
    "tháng 12": 12,
}

COMMENT_KEYS = {"feedback", "comments", "comment_list_renderer", "display_comments", "ufi"}
SKIP_IMAGE_KEYS = COMMENT_KEYS | {"actors", "actor", "owner", "profile_picture"}


def parse_time(value, now):
    if not value:
        return None
    value = re.sub(r"[\u200b-\u200f\u202a-\u202e\ufeff]", "", str(value)).strip()
    low = value.lower()

    if low in {"just now", "vừa xong", "vừa mới xong"}:
        return now

    if re.fullmatch(r"\d{10,13}", value):
        return datetime.fromtimestamp(int(value) / (1000 if len(value) == 13 else 1), timezone.utc)

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo:
            return parsed.astimezone(timezone.utc)
    except ValueError:
        pass

    match = re.fullmatch(
        r"(\d+)\s*(s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?|d|day|days?|giây|phút|giờ|tiếng|ngày)(?:\s+(?:ago|trước))?",
        low,
    )
    if match:
        count, unit = int(match.group(1)), match.group(2)
        if unit.startswith(("s", "giây")):
            return now - timedelta(seconds=count)
        if unit.startswith(("m", "phút")):
            return now - timedelta(minutes=count)
        if unit.startswith(("h", "giờ", "tiếng")):
            return now - timedelta(hours=count)
        if unit.startswith(("d", "ngày")):
            return now - timedelta(days=count)

    rel_day = re.fullmatch(
        r"(today|yesterday|hôm nay|hôm qua)\s+(?:at|lúc)\s+(\d{1,2}:\d{2}(?:\s*[ap]m)?)",
        low,
    )
    if rel_day:
        day_word, time_part = rel_day.groups()
        is_yesterday = day_word in {"yesterday", "hôm qua"}
        for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
            try:
                t = datetime.strptime(time_part.upper(), fmt).time()
                base_date = now.date() - timedelta(days=1 if is_yesterday else 0)
                return datetime.combine(base_date, t, tzinfo=timezone.utc)
            except ValueError:
                continue

    vi_date = re.fullmatch(
        r"(?:thứ\s+\w+,\s+|chủ nhật,\s+)?(\d{1,2})\s+(tháng\s+\d{1,2})(?:,?\s+(\d{4}))?\s+lúc\s+(\d{1,2}:\d{2})",
        low,
    )
    if vi_date:
        day_s, month_s, year_s, time_s = vi_date.groups()
        month = VIETNAMESE_MONTHS.get(month_s)
        if month:
            year = int(year_s) if year_s else now.year
            hour, minute = map(int, time_s.split(":"))
            try:
                dt = datetime(year, month, int(day_s), hour, minute, tzinfo=timezone.utc)
                if not year_s and dt > now + timedelta(days=1):
                    dt = dt.replace(year=now.year - 1)
                return dt
            except ValueError:
                pass

    cleaned_date = re.sub(r"^[A-Za-z]+,\s+", "", value)
    date_formats = [
        "%B %d, %Y at %I:%M %p",
        "%B %d, %Y at %H:%M",
        "%d %B %Y at %I:%M %p",
        "%d %B %Y at %H:%M",
        "%B %d at %I:%M %p",
        "%B %d at %H:%M",
        "%d %B at %I:%M %p",
        "%d %B at %H:%M",
    ]
    for fmt in date_formats:
        try:
            dt = datetime.strptime(cleaned_date, fmt)
            if "%Y" not in fmt:
                dt = dt.replace(year=now.year)
                if dt.replace(tzinfo=timezone.utc) > now + timedelta(days=1):
                    dt = dt.replace(year=now.year - 1)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None


def extract_post_identity(raw_url: str, fallback_group: str):
    if not raw_url:
        return None, None
    parsed = urlparse(raw_url)
    if parsed.hostname not in {"www.facebook.com", "facebook.com", "m.facebook.com"}:
        return None, None
    if "comment_id=" in parsed.query:
        return None, None

    match = re.search(r"/groups/([^/]+)/(?:posts|permalink)/(\d+)", parsed.path)
    if match:
        return match.group(1), match.group(2)

    qs = parse_qs(parsed.query)
    for key in ("multi_permalinks", "story_fbid"):
        if key in qs and qs[key] and qs[key][0].isdigit():
            group_match = re.search(r"/groups/([^/]+)", parsed.path)
            group_slug = group_match.group(1) if group_match else fallback_group
            return group_slug, qs[key][0]

    return None, None


def _find_first(obj, key, predicate=None):
    if isinstance(obj, dict):
        if key in obj and (predicate is None or predicate(obj[key])):
            return obj[key]
        for k, v in obj.items():
            if k in COMMENT_KEYS:
                continue
            found = _find_first(v, key, predicate)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _find_first(item, key, predicate)
            if found is not None:
                return found
    return None


def _extract_media_uri(media: dict):
    if not isinstance(media, dict):
        return None
    for key in (
        "photo_image",
        "viewer_image",
        "large_share_image",
        "flexible_height_share_image",
        "image",
    ):
        img_obj = media.get(key)
        if isinstance(img_obj, dict):
            uri = img_obj.get("uri")
            if isinstance(uri, str) and uri.startswith("http"):
                return uri
    renderer = media.get("comet_photo_attachment_resolution_renderer")
    if isinstance(renderer, dict) and isinstance(renderer.get("image"), dict):
        uri = renderer["image"].get("uri")
        if isinstance(uri, str) and uri.startswith("http"):
            return uri
    return None


def merge_images(*groups):
    """Keep every distinct photo; prefer the first rendition for the same CDN path."""
    found = {}
    for group in groups:
        for url in group:
            if not isinstance(url, str) or not url.startswith("https://"):
                continue
            parsed = urlparse(url)
            # Signed URLs for the same image can differ between GraphQL and DOM.
            key = parsed.path if parsed.path not in ("", "/") else url
            found.setdefault(key, url)
    return list(found.values())


def _collect_images_from_node(obj, urls=None):
    """Trích xuất toàn bộ ảnh từ bài đơn ảnh, album nhiều ảnh (all_subattachments) và bài chia sẻ."""
    if urls is None:
        urls = []
    if isinstance(obj, dict):
        media = obj.get("media")
        if isinstance(media, dict):
            uri = _extract_media_uri(media)
            if uri and uri not in urls:
                urls.append(uri)
        if obj.get("__typename") == "Photo":
            uri = _extract_media_uri(obj)
            if uri and uri not in urls:
                urls.append(uri)

        for k, v in obj.items():
            if k in SKIP_IMAGE_KEYS:
                continue
            _collect_images_from_node(v, urls)
    elif isinstance(obj, list):
        for item in obj:
            _collect_images_from_node(item, urls)
    return urls


def _extract_stories_from_json(payload, group_slug: str):
    stories = []

    def walk(node):
        if isinstance(node, dict):
            post_id = node.get("post_id")
            if isinstance(post_id, str) and post_id.isdigit() and (
                "comet_sections" in node or "attachments" in node or "message" in node
            ):
                ts = _find_first(
                    node,
                    "creation_time",
                    lambda x: isinstance(x, int) and x > 1_500_000_000,
                )
                search_scope = node.get("comet_sections", node)
                msg_obj = _find_first(
                    search_scope,
                    "message",
                    lambda x: isinstance(x, dict) and isinstance(x.get("text"), str),
                )
                if not msg_obj:
                    msg_obj = _find_first(
                        node,
                        "message",
                        lambda x: isinstance(x, dict) and isinstance(x.get("text"), str),
                    )
                caption = (msg_obj.get("text") if msg_obj else "") or ""

                actors = _find_first(
                    search_scope,
                    "actors",
                    lambda x: isinstance(x, list) and len(x) > 0,
                )
                author = (
                    actors[0].get("name")
                    if (actors and isinstance(actors[0], dict) and actors[0].get("name"))
                    else "Facebook member"
                )

                # Tìm ảnh trên toàn bộ node bài viết (bao gồm attachments ngoài comet_sections và attached_story)
                images = _collect_images_from_node(node)

                stories.append({
                    "id": post_id,
                    "url": f"https://www.facebook.com/groups/{group_slug}/posts/{post_id}/",
                    "caption": caption.strip(),
                    "images": images,
                    "author": author,
                    "created_ts": ts,
                })
                return

            for k, v in node.items():
                if k in COMMENT_KEYS:
                    continue
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return stories


async def collect(req):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    upper_bound = now + timedelta(minutes=5)
    group_slug = req.groupUrl.rstrip("/").split("/")[-1]

    path = Path(SESSION_PATH).resolve()
    state = auth.load_state(path)
    if state is None:
        raise HTTPException(401, "Login required")

    reused = False
    posts = {}
    seen_all_ids = set()
    old_post_ids = set()
    pending_tasks = set()

    def register_story(item: dict):
        pid = item.get("id")
        ts = item.get("created_ts")
        if not pid or not ts:
            return
        seen_all_ids.add(pid)
        pub_dt = datetime.fromtimestamp(ts, timezone.utc)

        if cutoff <= pub_dt <= upper_bound:
            old_post_ids.discard(pid)
            caption = (item.get("caption") or "").strip()
            images = item.get("images") or []
            if not caption and not images:
                return

            existing = posts.get(pid)
            images = merge_images(existing["images"] if existing else [], images)
            if existing and len(existing["caption"]) > len(caption):
                caption = existing["caption"]
            if (
                existing is None
                or len(caption) > len(existing["caption"])
                or len(images) > len(existing["images"])
            ):
                posts[pid] = {
                    "id": pid,
                    "url": item["url"],
                    "caption": caption,
                    "images": images,
                    "author": item.get("author") or "Facebook member",
                    "text": caption,
                    "publishedAt": pub_dt.isoformat(),
                }
        elif pub_dt < cutoff and pid not in posts:
            old_post_ids.add(pid)

    def parse_json_blob(raw_text: str):
        for line in raw_text.splitlines():
            line = line.strip()
            if not line or ("post_id" not in line and "creation_time" not in line):
                continue
            if line.startswith("for (;;);"):
                line = line[len("for (;;);"):]
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            for story in _extract_stories_from_json(data, group_slug):
                register_story(story)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=os.getenv("HEADLESS", "true").lower() != "false")
        try:
            context = await browser.new_context(
                storage_state=state,
                locale="en-US",
                timezone_id="UTC",
            )
            page = await context.new_page()
            page.set_default_timeout(12000)

            async def handle_response(response):
                if "/api/graphql/" not in response.url or response.request.method != "POST":
                    return
                try:
                    raw_text = await response.text()
                    parse_json_blob(raw_text)
                except Exception:
                    pass

            def on_response(response):
                task = asyncio.create_task(handle_response(response))
                pending_tasks.add(task)
                task.add_done_callback(pending_tasks.discard)

            page.on("response", on_response)

            await page.goto("https://www.facebook.com/me", wait_until="domcontentloaded")
            reused = await auth.signed_in(page, context)
            if not reused:
                raise HTTPException(401, "Session expired")

            await page.goto(req.groupUrl + "?sorting_setting=CHRONOLOGICAL", wait_until="domcontentloaded")
            if not await auth.signed_in(page, context):
                raise HTTPException(401, "Session expired")
            await auth.save_state(context, path)

            try:
                await page.locator('[role="feed"] [role="article"]').first.wait_for(timeout=20000)
            except PlaywrightTimeout:
                raise HTTPException(403, "Group is inaccessible, empty, or its layout is unsupported")

            await asyncio.sleep(1.2)

            ssr_blobs = await page.evaluate('''() =>
                [...document.querySelectorAll('script[type="application/json"]')]
                    .map(s => s.textContent || '')
                    .filter(t => t.includes('post_id') && t.includes('creation_time'))
            ''')
            for blob in ssr_blobs:
                parse_json_blob(blob)

            # Quét DOM sau mỗi lượt cuộn để lấy thêm ảnh của các bài nhiều ảnh (tránh bị virtualized feed ẩn mất)
            dom_images_by_pid = {}
            dom_fallback_rows = {}

            async def scan_dom_articles():
                rows = await page.locator('[role="feed"] [role="article"]').evaluate_all('''articles => {
                    const isCommentNode = (el) => !!(
                        el.closest('ul') ||
                        el.closest('[aria-label*="Comment" i]') ||
                        el.closest('[aria-label*="Bình luận" i]')
                    );
                    return articles.map(a => {
                        const links = [...a.querySelectorAll('a[href]')].filter(e => !isCommentNode(e));
                        const postLink = links.find(e =>
                            (/\\/(posts|permalink)\\/\\d+/.test(e.href) || /[?&](multi_permalinks|story_fbid)=\\d+/.test(e.href)) &&
                            !e.href.includes('comment_id=')
                        );
                        const timeEl = a.querySelector('time, abbr[data-utime]');
                        const stamp = timeEl?.getAttribute('datetime') || timeEl?.getAttribute('data-utime') || postLink?.getAttribute('aria-label') || postLink?.innerText || '';
                        const msgNodes = [...a.querySelectorAll('[data-ad-preview="message"], [data-ad-comet-preview="message"]')].filter(el => !isCommentNode(el));
                        const caption = msgNodes.map(el => el.innerText.trim()).filter(Boolean).join('\\n\\n');

                        // Lấy tất cả ảnh bài đăng hiển thị trên card (kể cả lưới nhiều ảnh)
                        const imageSet = new Set();
                        for (const img of a.querySelectorAll('img[src]')) {
                            if (isCommentNode(img)) continue;
                            if (img.closest('h2, h3, h4, svg')) continue;
                            const src = img.src || '';
                            if (!src.startsWith('http')) continue;
                            if (src.includes('emoji.php') || src.includes('rsrc.php') || src.includes('static.xx.fbcdn.net')) continue;

                            const inPhotoLink = !!img.closest('a[href*="/photo"], a[href*="pcb."]');
                            const rect = img.getBoundingClientRect();
                            const w = Math.max(img.naturalWidth || 0, img.width || 0, rect.width || 0);
                            const h = Math.max(img.naturalHeight || 0, img.height || 0, rect.height || 0);
                            if (inPhotoLink || (w >= 120 && h >= 120)) {
                                imageSet.add(src);
                            }
                        }

                        return {
                            url: postLink?.href || '',
                            author: a.querySelector('h2, h3, h4, strong')?.innerText?.trim() || 'Facebook member',
                            caption,
                            images: [...imageSet],
                            stamp
                        };
                    });
                }''')

                for row in rows:
                    slug, pid = extract_post_identity(row.get("url") or "", group_slug)
                    if not pid:
                        continue
                    imgs = row.get("images") or []
                    dom_images_by_pid[pid] = merge_images(dom_images_by_pid.get(pid, []), imgs)
                    if pid not in dom_fallback_rows:
                        dom_fallback_rows[pid] = (slug, row)

            await scan_dom_articles()

            for _ in range(18):
                if len(old_post_ids) >= 5 and len(posts) > 0:
                    break
                await page.mouse.wheel(0, 1800)
                await asyncio.sleep(1.2)
                await scan_dom_articles()

            if pending_tasks:
                await asyncio.gather(*pending_tasks, return_exceptions=True)

            # Merge partial GraphQL and DOM galleries rather than choosing only one.
            for pid, post_obj in posts.items():
                post_obj["images"] = merge_images(post_obj["images"], dom_images_by_pid.get(pid, []))

            # Dự phòng hoàn toàn từ DOM nếu có bài chưa xuất hiện trong GraphQL
            unknown = set()
            for pid, (slug, row) in dom_fallback_rows.items():
                if pid in posts or pid in seen_all_ids:
                    continue
                stamp = parse_time(row.get("stamp"), now)
                if stamp is None:
                    unknown.add(pid)
                    continue
                if cutoff <= stamp <= upper_bound:
                    caption = (row.get("caption") or "").strip()
                    images = dom_images_by_pid.get(pid) or row.get("images") or []
                    if caption or images:
                        posts[pid] = {
                            "id": pid,
                            "url": f"https://www.facebook.com/groups/{slug}/posts/{pid}/",
                            "caption": caption,
                            "images": images,
                            "author": row.get("author") or "Facebook member",
                            "text": caption,
                            "publishedAt": stamp.isoformat(),
                        }

            warnings = [
                "Đã trích xuất trực tiếp từ luồng dữ liệu GraphQL/SSR và lọc các bài đăng dưới 24 giờ."
            ]
            if unknown:
                warnings.append(f"Bỏ qua {len(unknown)} bài dự phòng không xác định chắc chắn thời gian đăng.")

            sorted_posts = sorted(posts.values(), key=lambda x: x["publishedAt"], reverse=True)
            return {
                "posts": sorted_posts,
                "warnings": warnings,
                "sessionReused": reused,
            }
        finally:
            await browser.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login")
async def login():
    return auth.start_login(SESSION_PATH)


@app.get("/auth/status")
async def login_status():
    return auth.login_status


@app.post("/auth/cancel")
async def cancel_login():
    return await auth.cancel_login()


@app.post("/scrape")
async def scrape(req: ScrapeRequest):
    if lock.locked() or auth.login_pending():
        raise HTTPException(409, "Scraper busy")
    async with lock:
        try:
            return await asyncio.wait_for(collect(req), timeout=180)
        except HTTPException:
            raise
        except (asyncio.TimeoutError, PlaywrightTimeout):
            raise HTTPException(504, "Facebook timed out") from None
        except Exception as exc:
            raise HTTPException(502, "Scraping failed") from None
