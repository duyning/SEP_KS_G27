"""One local Facebook account, with interactive login and reusable storage state."""
import asyncio
import json
import os
from pathlib import Path

from fastapi import HTTPException
from playwright.async_api import async_playwright

account_lock = asyncio.Lock()
login_task = None
login_status = {"status": "idle", "message": "Chưa mở trang đăng nhập."}


def load_state(path):
    try:
        state = json.loads(Path(path).read_text(encoding="utf-8"))
        if isinstance(state, dict) and isinstance(state.get("cookies"), list) and isinstance(state.get("origins", []), list):
            return state
    except (ValueError, OSError):
        pass
    return None


async def signed_in(page, context):
    if any(part in page.url for part in ("/login", "/checkpoint", "/challenge", "/two_step_verification", "/recover")):
        return False
    if await page.locator('input[name="email"], input[name="pass"], iframe[src*="captcha"]').count():
        return False
    return any(c["name"] == "c_user" and c.get("value") for c in await context.cookies("https://www.facebook.com"))


async def save_state(context, path):
    path = Path(path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    try:
        await context.storage_state(path=str(temporary))
        os.chmod(temporary, 0o600)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


async def interactive_login(path):
    global login_status
    try:
        async with account_lock:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)
                try:
                    context = await browser.new_context(storage_state=load_state(path), locale="en-US")
                    page = await context.new_page()
                    await page.goto("https://www.facebook.com/login/", wait_until="domcontentloaded", timeout=30000)
                    login_status = {"status": "waiting", "message": "Đăng nhập và hoàn tất xác minh trong cửa sổ Facebook vừa mở. Phiên sẽ được lưu tự động."}
                    async def wait_for_login():
                        while True:
                            if page.is_closed():
                                raise RuntimeError("closed")
                            try:
                                ready = await signed_in(page, context)
                            except Exception:
                                # DOM can be replaced while the user submits the login form.
                                ready = False
                            if ready:
                                # Validate cookies against Facebook instead of accepting a local cookie alone.
                                probe = await context.new_page()
                                try:
                                    await probe.goto("https://www.facebook.com/me", wait_until="domcontentloaded", timeout=30000)
                                    if await signed_in(probe, context):
                                        await save_state(context, path)
                                        return
                                finally:
                                    await probe.close()
                            await asyncio.sleep(1)
                    await asyncio.wait_for(wait_for_login(), timeout=300)
                finally:
                    await browser.close()
        login_status = {"status": "authenticated", "message": "Đã đăng nhập và lưu phiên. Đang tiếp tục thu thập bài viết."}
    except asyncio.CancelledError:
        login_status = {"status": "cancelled", "message": "Đã hủy đăng nhập."}
        raise
    except asyncio.TimeoutError:
        login_status = {"status": "expired", "message": "Hết 5 phút chờ đăng nhập. Vui lòng thử lại."}
    except Exception:
        login_status = {"status": "failed", "message": "Không thể hoàn tất đăng nhập. Kiểm tra Chromium đã cài đặt và cửa sổ Facebook chưa bị đóng."}


def start_login(path):
    global login_task, login_status
    if login_task and not login_task.done():
        return login_status
    if account_lock.locked():
        raise HTTPException(409, "Account busy")
    login_status = {"status": "opening", "message": "Đang mở trang đăng nhập Facebook…"}
    login_task = asyncio.create_task(interactive_login(path))
    return login_status


async def cancel_login():
    global login_status
    if login_task and not login_task.done():
        login_task.cancel()
        try:
            await login_task
        except asyncio.CancelledError:
            pass
        login_status = {"status": "cancelled", "message": "Đã hủy đăng nhập."}
    return login_status


def login_pending():
    return login_task is not None and not login_task.done()
