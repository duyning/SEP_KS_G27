"""Offline contract tests; never opens Facebook or a browser."""
import unittest
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
import main


class ScraperTests(unittest.IsolatedAsyncioTestCase):
    def test_album_collects_all_attachments_without_comment_or_avatar_images(self):
        def photo(name):
            return {"__typename": "Photo", "image": {"uri": f"https://scontent.xx.fbcdn.net/{name}.jpg"}}
        payload = {"all_subattachments": {"nodes": [{"media": photo("one")}, {"media": photo("two")}]},
                   "attachments": [{"media": photo("three")}],
                   "subattachments": {"edges": [{"node": {"media": photo("four")}}]},
                   "comments": {"media": photo("comment")}, "actors": [{"media": photo("avatar")}]}
        images = main._collect_images_from_node(payload)
        self.assertEqual(set(images), {f"https://scontent.xx.fbcdn.net/{name}.jpg" for name in ("one", "two", "three", "four")})

    def test_partial_gallery_results_are_merged_without_duplicate_renditions(self):
        self.assertEqual(main.merge_images(["https://scontent.xx.fbcdn.net/a.jpg?token=one"],
                                          ["https://scontent.xx.fbcdn.net/a.jpg?token=two", "https://scontent.xx.fbcdn.net/b.jpg"]),
                         ["https://scontent.xx.fbcdn.net/a.jpg?token=one", "https://scontent.xx.fbcdn.net/b.jpg"])

    def test_only_facebook_group_urls_are_accepted(self):
        for value in ("http://localhost/", "https://facebook.com@localhost/groups/a", "https://evil.example/groups/a"):
            with self.assertRaises(ValidationError):
                main.ScrapeRequest(groupUrl=value)
        req = main.ScrapeRequest(groupUrl="https://www.facebook.com/groups/hoalac/?ref=test")
        self.assertEqual(req.groupUrl, "https://www.facebook.com/groups/hoalac")

    def test_relative_time_and_post_identity(self):
        now = datetime.now(timezone.utc)
        self.assertEqual(main.parse_time("30 phút", now), now - timedelta(minutes=30))
        self.assertEqual(main.extract_post_identity("https://www.facebook.com/groups/hoalac/posts/123/", "hoalac"), ("hoalac", "123"))
        self.assertEqual(main.extract_post_identity("https://evil.example/groups/hoalac/posts/123/", "hoalac"), (None, None))

    async def test_internal_token_is_required_even_for_auth(self):
        handler = AsyncMock(return_value="ok")
        with patch.dict(main.os.environ, {"SCRAPER_API_TOKEN": "test-secret"}):
            response = await main.internal_access(SimpleNamespace(headers={}), handler)
            self.assertEqual(response.status_code, 403)
            handler.assert_not_awaited()
            self.assertEqual(await main.internal_access(SimpleNamespace(headers={"X-Scraper-Token": "test-secret"}), handler), "ok")

    async def test_demo_and_arbitrary_session_path_do_not_bypass_real_collection(self):
        req = main.ScrapeRequest(groupUrl="https://www.facebook.com/groups/hoalac", demo=True, sessionPath="arbitrary.json")
        self.assertFalse(hasattr(req, "sessionPath"))
        with patch.object(main, "collect", new=AsyncMock(return_value={"posts": []})) as collect:
            self.assertEqual(await main.scrape(req), {"posts": []})
            collect.assert_awaited_once()

    async def test_busy_session_is_rejected(self):
        async with main.lock:
            with self.assertRaises(main.HTTPException) as error:
                await main.scrape(main.ScrapeRequest(groupUrl="https://www.facebook.com/groups/hoalac"))
            self.assertEqual(error.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
