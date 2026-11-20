package org.hlrcs.service;

import org.hlrcs.dto.CollectedPostDtos.*;
import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class FacebookScraperClient {
    private final RestClient client;
    private final String token;
    private final AtomicBoolean collecting = new AtomicBoolean();

    public FacebookScraperClient(@Value("${scraper.python.url:http://127.0.0.1:8091}") String url,
                                @Value("${scraper.api-token:}") String token) {
        this.token = token;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5)); factory.setReadTimeout(Duration.ofSeconds(210));
        client = RestClient.builder().baseUrl(url).requestFactory(factory).defaultHeader("X-Scraper-Token", token).build();
    }

    public AuthStatus auth(String action) {
        ready();
        try {
            var result = "status".equals(action) ? client.get().uri("/auth/status").retrieve().body(AuthStatus.class)
                    : client.post().uri("/auth/" + action).body(Map.of()).retrieve().body(AuthStatus.class);
            if (result == null) throw new AppException("Scraper trả về trạng thái rỗng.", HttpStatus.BAD_GATEWAY);
            return result;
        } catch (RestClientException ex) { throw failure(ex); }
    }

    public ScrapeResult scrape(String groupUrl) {
        ready();
        if (!collecting.compareAndSet(false, true)) throw new AppException("Đang có lượt thu thập khác. Vui lòng chờ.", HttpStatus.CONFLICT);
        try {
            var result = client.post().uri("/scrape").body(Map.of("groupUrl", groupUrl)).retrieve().body(ScrapeResult.class);
            if (result == null || result.posts() == null || result.posts().size() > 500)
                throw new AppException("Kết quả scraper không hợp lệ hoặc vượt 500 bài.", HttpStatus.BAD_GATEWAY);
            return result;
        } catch (RestClientException ex) { throw failure(ex); }
        finally { collecting.set(false); }
    }

    private void ready() {
        if (token.isBlank()) throw new AppException("Chưa cấu hình SCRAPER_API_TOKEN cho backend và Python.", HttpStatus.SERVICE_UNAVAILABLE);
    }
    private AppException failure(RestClientException ex) {
        // A worker's Facebook 401 must not log the platform account out.
        int code = ex instanceof RestClientResponseException response ? response.getStatusCode().value() : 502;
        String message = switch (code) {
            case 401 -> "Phiên Facebook hết hạn. Mở đăng nhập Facebook rồi thu thập lại.";
            case 403 -> "Không có quyền xem nhóm hoặc Facebook yêu cầu xác minh. Kiểm tra phiên trên máy chạy Python.";
            case 409 -> "Phiên Facebook đang được sử dụng. Vui lòng chờ.";
            case 422 -> "Đường dẫn nhóm không hợp lệ.";
            case 504 -> "Hết thời gian đọc Facebook. Vui lòng thử lại.";
            default -> "Không kết nối hoặc đọc được scraper Python. Kiểm tra dịch vụ rồi thử lại.";
        };
        return new AppException(message, code == 409 ? HttpStatus.CONFLICT : HttpStatus.BAD_GATEWAY);
    }
}
