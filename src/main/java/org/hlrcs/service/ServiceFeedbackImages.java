package org.hlrcs.service;

import org.hlrcs.entity.ServiceImage;
import org.hlrcs.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Shared limits for review photos and private complaint evidence. */
public final class ServiceFeedbackImages {
    private ServiceFeedbackImages() {}
    public static List<ServiceImage> read(List<MultipartFile> files) throws IOException {
        var images = new ArrayList<ServiceImage>();
        if (files == null) return images;
        if (files.size() > 5) throw new BadRequestException("Chọn tối đa 5 ảnh, mỗi ảnh tối đa 5 MB.");
        for (var file : files) {
            if (file.isEmpty() || file.getSize() > 5L * 1024 * 1024) throw new BadRequestException("Ảnh phải có nội dung, tối đa 5 MB.");
            byte[] bytes = file.getBytes();
            String mime = Objects.toString(file.getContentType(), "");
            boolean valid = switch (mime) {
                case "image/jpeg" -> bytes.length > 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
                case "image/png" -> bytes.length > 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137,80,78,71,13,10,26,10});
                case "image/webp" -> bytes.length > 12 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
                default -> false;
            };
            if (!valid) throw new BadRequestException("Ảnh chỉ nhận JPG, PNG, WEBP đúng định dạng.");
            images.add(new ServiceImage(bytes, mime));
        }
        return images;
    }
    public static String text(String value, int min) {
        String content = value == null ? "" : value.trim();
        if (content.length() < min || content.length() > 3000) throw new BadRequestException("Nội dung phải có từ " + min + " đến 3000 ký tự.");
        return content;
    }
}
