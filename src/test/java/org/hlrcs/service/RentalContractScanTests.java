package org.hlrcs.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.hlrcs.entity.User;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RentalContractScanTests {
    final ObjectMapper json = new ObjectMapper();

    private byte[] geminiPageResponse(String finish, String pageId, String pageStatus, String text, List<Map<String, Object>> spans) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pageId", pageId);
        payload.put("pageStatus", pageStatus);
        payload.put("text", text);
        payload.put("uncertainSpans", spans);
        return json.writeValueAsBytes(Map.of(
                "candidates", List.of(Map.of(
                        "finishReason", finish,
                        "content", Map.of("parts", List.of(Map.of("text", json.writeValueAsString(payload))))))));
    }

    private byte[] createPng(int w, int h, Color bg) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(bg);
        g.fillRect(0, 0, w, h);
        g.setColor(Color.BLACK);
        g.drawRect(2, 2, Math.max(1, w - 5), Math.max(1, h - 5));
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private byte[] createMultiPageTestPdf() throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Page 1: Reliable text layer with critical numbers, leading zeros, dates, room code, table & trailing periods.
            PDPage p1 = new PDPage(PDRectangle.A4);
            doc.addPage(p1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, p1)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.setLeading(16f);
                cs.newLineAtOffset(50, 760);
                cs.showText("HOP DONG THUE PHONG P.102 - MA SO 0008.");
                cs.newLine();
                cs.showText("Ngay lap: 01/12/2026.");
                cs.newLine();
                cs.showText("Tien thue: 2.200.000 VND | Coc: 2,200,000 VND.");
                cs.newLine();
                cs.showText("STT | Hang muc | Don gia | Don vi");
                cs.newLine();
                cs.showText("01  | Dien     | 3.800   | kWh.");
                cs.newLine();
                cs.showText("02  | Nuoc     | 100.000 | nguoi.");
                cs.endText();
            }

            // Page 2: Genuine blank page.
            doc.addPage(new PDPage(PDRectangle.A4));

            // Page 3: Raster image + tiny sparse header text (must NOT be treated as complete PDF text layer -> must OCR!).
            PDPage p3 = new PDPage(PDRectangle.A4);
            doc.addPage(p3);
            BufferedImage scanImg = new BufferedImage(320, 420, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = scanImg.createGraphics();
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, 320, 420);
            g.setColor(Color.DARK_GRAY);
            g.fillRect(20, 20, 280, 30);
            g.dispose();
            var pdImg = LosslessFactory.createFromImage(doc, scanImg);
            try (PDPageContentStream cs = new PDPageContentStream(doc, p3)) {
                cs.drawImage(pdImg, 40, 200, 320, 420);
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(50, 780);
                cs.showText("Trang 3");
                cs.endText();
            }

            doc.save(out);
            return out.toByteArray();
        }
    }

    @Test
    void preservesExactCharactersVietnameseDiacriticsTablesAndUncertainMarkersWithoutNormalizing() {
        String golden = String.join("\n",
                "ĐIỀU KHOẢN THỎA THUẬN — Phòng P.102 (Mã 0008).",
                "Ngày hiệu lực: 01/12/2026.",
                "Tiền thuê: 2.200.000 đ/tháng | Tiền cọc: 2,200,000 đ.",
                "Bảng phí: Điện | 3.800 đ/kWh | Nước | 100.000 đ/người.",
                "Ghi chú viết tay: Bàn giao 02 chìa khóa và ⟦KHÔNG ĐỌC RÕ:U1⟧ bộ điều khiển.");

        byte[] reply = geminiPageResponse("STOP", "F1-P1", "readable", golden,
                List.of(Map.of("code", "U1", "line", 5, "reason", "Chữ viết tay bị mờ")));

        var parsed = RentalContractScanService.parsePageOcrResponse(reply, "F1-P1", json);
        // Exact character-for-character equality:
        assertEquals(golden, parsed.text());
        assertTrue(parsed.text().contains("2.200.000"));
        assertTrue(parsed.text().contains("2,200,000"));
        assertTrue(parsed.text().contains("0008"));
        assertTrue(parsed.text().contains("01/12/2026"));
        assertTrue(parsed.text().contains("P.102"));
        assertTrue(parsed.text().endsWith("bộ điều khiển."));
        // Uncertain span automatically upgrades readable -> needs_review:
        assertEquals("needs_review", parsed.pageStatus());
        assertEquals(1, parsed.uncertainSpans().size());
        assertEquals("U1", parsed.uncertainSpans().get(0).code());
        assertEquals(5, parsed.uncertainSpans().get(0).line());

        // Sensitive reminders detect money, date, room, IDs without mutating text:
        var reminders = RentalContractScanService.detectSensitiveReminders(parsed.text());
        assertTrue(reminders.stream().anyMatch(r -> r.value().contains("2.200.000")));
        assertTrue(reminders.stream().anyMatch(r -> r.value().contains("2,200,000")));
        assertTrue(reminders.stream().anyMatch(r -> r.value().equals("01/12/2026")));
        assertTrue(reminders.stream().anyMatch(r -> r.value().contains("P.102")));
        assertTrue(reminders.stream().anyMatch(r -> r.value().equals("0008")));

        // Truncated (MAX_TOKENS), mismatched pageId, and oversized responses are rejected:
        assertThrows(AppException.class, () -> RentalContractScanService.parsePageOcrResponse(
                geminiPageResponse("MAX_TOKENS", "F1-P1", "readable", golden, List.of()), "F1-P1", json));
        assertThrows(AppException.class, () -> RentalContractScanService.parsePageOcrResponse(
                geminiPageResponse("STOP", "F1-P2", "readable", golden, List.of()), "F1-P1", json));
        assertThrows(AppException.class, () -> RentalContractScanService.parsePageOcrResponse(
                new byte[250_001], "F1-P1", json));
    }

    @Test
    void multiPagePdfExtractsTrustworthyTextDetectsBlankAndRoutesSparseImagePageToGeminiOcr() throws Exception {
        byte[] pdfBytes = createMultiPageTestPdf();
        var pdf = new MockMultipartFile("files", "hop-dong-3-trang.pdf", "application/pdf", pdfBytes);

        var owned = mock(RentalContractService.class);
        var auth = mock(AuthService.class);
        var http = mock(HttpClient.class);
        var user = new User();
        user.setUserId(42);
        when(auth.getCurrentUser()).thenReturn(user);

        String ocrTextPage3 = "Trang 3 — Điều khoản bổ sung phòng P.102: Tiền cọc 2.200.000 đ (hoặc 2,200,000 đ) ngày 01/12/2026, mã 0008.";
        @SuppressWarnings("unchecked")
        HttpResponse<byte[]> reply = mock(HttpResponse.class);
        when(reply.statusCode()).thenReturn(200);
        when(reply.body()).thenReturn(geminiPageResponse("STOP", "F1-P3", "readable", ocrTextPage3, List.of()));
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(reply);

        var service = new RentalContractScanService(owned, auth, json, "private-key-only", "gemini-test", http);
        var result = service.scan(1, true, List.of(pdf));

        assertEquals(1, result.totalFiles());
        assertEquals(3, result.totalPages());
        assertEquals(3, result.processedPages());

        // Page 1: PDF_TEXT extracted directly without calling Gemini
        var p1 = result.pages().get(0);
        assertEquals("F1-P1", p1.pageId());
        assertEquals("PDF_TEXT", p1.extractionMethod());
        assertEquals("readable", p1.pageStatus());
        assertTrue(p1.text().contains("2.200.000"));
        assertTrue(p1.text().contains("2,200,000"));
        assertTrue(p1.text().contains("0008."));
        assertTrue(p1.text().contains("01/12/2026."));
        assertTrue(p1.text().contains("P.102"));
        assertNotNull(p1.previewDataUrl());

        // Page 2: Genuine blank page, NOT sent to Gemini
        var p2 = result.pages().get(1);
        assertEquals("F1-P2", p2.pageId());
        assertEquals("PDF_TEXT", p2.extractionMethod());
        assertEquals("blank", p2.pageStatus());
        assertEquals("", p2.text());

        // Page 3: Raster image + sparse "Trang 3" text MUST go to Gemini OCR!
        var p3 = result.pages().get(2);
        assertEquals("F1-P3", p3.pageId());
        assertEquals("GEMINI_OCR", p3.extractionMethod());
        assertEquals("readable", p3.pageStatus());
        assertEquals(ocrTextPage3, p3.text());

        // Gemini was called EXACTLY ONCE (only for Page 3!) with exact verbatim OCR prompt & key only in header:
        var captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(1)).send(captor.capture(), any());
        assertEquals("generativelanguage.googleapis.com", captor.getValue().uri().getHost());
        assertFalse(captor.getValue().uri().toString().contains("private-key-only"));
        assertTrue(RentalContractScanService.OCR_PROMPT.contains("⟦KHÔNG ĐỌC RÕ:U1⟧"));
        assertTrue(RentalContractScanService.OCR_PROMPT.contains("`2.200.000` khác `2,200,000`"));
    }

    @Test
    void enforcesFileLimitsConsentOwnershipAndDetectsMissingDuplicateOrUnreadablePages() throws Exception {
        var owned = mock(RentalContractService.class);
        var auth = mock(AuthService.class);
        var http = mock(HttpClient.class);
        var user = new User();
        user.setUserId(7);
        when(auth.getCurrentUser()).thenReturn(user);
        var service = new RentalContractScanService(owned, auth, json, "secret-key", "gemini-test", http);
        var png = new MockMultipartFile("files", "p1.png", "image/png", createPng(40, 40, Color.WHITE));

        // Consent & ownership & file limit enforcement (never silently drops 6th file)
        assertThrows(BadRequestException.class, () -> service.scan(1, false, List.of(png)));
        assertThrows(BadRequestException.class, () -> service.scan(1, true, List.of(png, png, png, png, png, png)));
        assertThrows(BadRequestException.class, () -> RentalContractScanService.validateSingleFile(
                new MockMultipartFile("files", "a.html", "text/html", "<html>".getBytes())));
        assertThrows(BadRequestException.class, () -> RentalContractScanService.validateSingleFile(
                new MockMultipartFile("files", "big.png", "image/png", new byte[5 * 1024 * 1024 + 1])));
        doThrow(new ResourceNotFoundException("not yours")).when(owned).owned(99);
        assertThrows(ResourceNotFoundException.class, () -> service.scan(99, true, List.of(png)));
        verifyNoInteractions(http);

        // Backend verifyPageSet catches missing, duplicate, and misordered pages:
        var okPage1 = new RentalContractScanService.PageResult("F1-P1", "F1", 0, "a.png", 1, 1, 2, "GEMINI_OCR", "readable", "ok", List.of(), List.of(), "", null);
        var okPage2 = new RentalContractScanService.PageResult("F1-P2", "F1", 0, "a.png", 2, 2, 2, "GEMINI_OCR", "readable", "ok", List.of(), List.of(), "", null);
        assertDoesNotThrow(() -> RentalContractScanService.verifyPageSet(List.of("F1-P1", "F1-P2"), List.of(okPage1, okPage2)));
        assertThrows(AppException.class, () -> RentalContractScanService.verifyPageSet(List.of("F1-P1", "F1-P2"), List.of(okPage1)));
        assertThrows(AppException.class, () -> RentalContractScanService.verifyPageSet(List.of("F1-P1", "F1-P2"), List.of(okPage1, okPage1)));
        assertThrows(AppException.class, () -> RentalContractScanService.verifyPageSet(List.of("F1-P1", "F1-P2"), List.of(okPage2, okPage1)));

        // Unreadable / provider-error page returns safe message (no key/provider payload leak) and distinguishes unreadable from blank:
        @SuppressWarnings("unchecked")
        HttpResponse<byte[]> badReply = mock(HttpResponse.class);
        when(badReply.statusCode()).thenReturn(500);
        when(badReply.body()).thenReturn("PRIVATE_PROVIDER_PAYLOAD secret-key".getBytes());
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(badReply);
        var batch = service.scan(1, true, List.of(png));
        assertEquals(1, batch.pages().size());
        assertEquals("unreadable", batch.pages().get(0).pageStatus());
        assertNotNull(batch.pages().get(0).error());
        assertFalse(batch.pages().get(0).error().contains("PRIVATE_PROVIDER_PAYLOAD"));
        assertFalse(batch.pages().get(0).error().contains("secret-key"));
    }

    @Test
    void singlePageRescanWorksIndependentlyForReplacementOrRetry() throws Exception {
        var owned = mock(RentalContractService.class);
        var auth = mock(AuthService.class);
        var http = mock(HttpClient.class);
        var user = new User();
        user.setUserId(88);
        when(auth.getCurrentUser()).thenReturn(user);

        String rescanned = "Phòng P.102 — Giá 2.200.000 đ — Mã 0008 — Ngày 01/12/2026.";
        @SuppressWarnings("unchecked")
        HttpResponse<byte[]> reply = mock(HttpResponse.class);
        when(reply.statusCode()).thenReturn(200);
        when(reply.body()).thenReturn(geminiPageResponse("STOP", "F1-P2", "readable", rescanned, List.of()));
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(reply);

        var service = new RentalContractScanService(owned, auth, json, "test-key", "gemini-test", http);
        var replacement = new MockMultipartFile("file", "trang-2-ro.png", "image/png", createPng(60, 60, Color.LIGHT_GRAY));
        var page = service.scanPage(1, true, "F1-P2", 2, 3, 0, 1, replacement);

        assertEquals("F1-P2", page.pageId());
        assertEquals(2, page.pageNumber());
        assertEquals(3, page.totalPages());
        assertEquals("readable", page.pageStatus());
        assertEquals(rescanned, page.text());
        assertNull(page.error());
    }
}
