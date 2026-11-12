package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.CommunityPostResponse.Image;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.PostMedia;
import org.hlrcs.entity.enums.MediaType;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.PostMediaRepository;
import org.hlrcs.repository.PostRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CommunityImageService {
    public static final int MAX_IMAGES = 6;
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    public static final long MAX_PIXELS = 20_000_000;
    private final PostMediaRepository media;
    private final PostRepository posts;
    private final AuthService auth;

    public List<Image> metadata(Integer postId) {
        return media.findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(postId, MediaType.IMAGE)
                .stream().map(row -> new Image(row.getMediaId(), row.getFileName())).toList();
    }

    @Transactional
    public void replace(Post post, List<Integer> retainedIds, List<MultipartFile> uploads) {
        var existing = metadata(post.getPostId());
        var keep = retainedIds == null ? existing.stream().map(Image::id).toList() : retainedIds;
        var files = uploads == null ? List.<MultipartFile>of() : uploads;
        if (new HashSet<>(keep).size() != keep.size() || keep.stream().anyMatch(id -> existing.stream().noneMatch(row -> row.id().equals(id)))) {
            throw invalid("Ảnh giữ lại không thuộc bài viết này hoặc bị lặp.");
        }
        if (keep.size() + files.size() > MAX_IMAGES) throw invalid("Mỗi bài viết được tối đa 6 ảnh. Vui lòng bỏ bớt ảnh.");
        // Validate every file before replacing anything; the surrounding post transaction is atomic.
        var validated = files.stream().map(file -> validate(file, "images")).toList();
        for (var row : existing) if (!keep.contains(row.id())) media.deleteById(row.id());
        for (var file : validated) media.save(PostMedia.builder().post(post).mediaType(MediaType.IMAGE)
                .mediaUrl("").fileName(file.fileName()).contentType(file.contentType()).fileContent(file.bytes()).build());
        media.flush();
    }

    public record ImageContent(byte[] bytes, String contentType, String fileName) {}

    @Transactional(readOnly = true)
    public ImageContent image(Integer postId, Integer imageId) {
        return content(postId, imageId, MediaType.IMAGE);
    }

    @Transactional(readOnly = true)
    public ImageContent content(Integer postId, Integer mediaId, MediaType type) {
        var post = posts.findById(postId).orElseThrow(this::missing);
        if (post.getStatus() != PostStatus.APPROVED) {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) throw missing();
            var viewer = auth.getCurrentUser();
            if (!post.getAuthor().getUserId().equals(viewer.getUserId()) && viewer.getRole() != UserRole.STAFF && viewer.getRole() != UserRole.ADMIN) throw missing();
        }
        var image = media.findById(mediaId).filter(row -> row.getPost().getPostId().equals(postId)
                && row.getMediaType() == type && row.getFileContent() != null).orElseThrow(this::missing);
        return new ImageContent(image.getFileContent(), image.getContentType(), image.getFileName());
    }

    static ImageContent validate(MultipartFile file, String field) {
        String name = Objects.toString(file.getOriginalFilename(), "ảnh").replaceAll("[\\p{Cntrl}\\\\/]", "_");
        name = name.substring(0, Math.min(name.length(), 200));
        String prefix = "Ảnh “" + name + "”: ";
        if (file.isEmpty()) throw new FieldValidationException(field, prefix + "Tệp rỗng, vui lòng chọn ảnh khác.");
        if (file.getSize() > MAX_BYTES) throw new FieldValidationException(field, prefix + "Vượt quá 5 MB/ảnh.");
        String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mime = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
        boolean jpeg = (extension.equals("jpg") || extension.equals("jpeg")) && mime.equals("image/jpeg");
        boolean png = extension.equals("png") && mime.equals("image/png");
        if (!jpeg && !png) throw new FieldValidationException(field, prefix + "Chỉ nhận JPG/JPEG (.jpg, .jpeg) hoặc PNG (.png). Không nhận WEBP, GIF, HEIC, SVG, PDF, video hay tệp đổi đuôi giả.");
        try {
            byte[] bytes = file.getBytes();
            try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw new FieldValidationException(field, prefix + "Nội dung không phải ảnh JPG/PNG hợp lệ hoặc ảnh đã bị hỏng.");
                var reader = readers.next();
                try {
                    reader.setInput(stream, true, true);
                    String actual = reader.getFormatName();
                    if (!(jpeg && actual.equalsIgnoreCase("JPEG") || png && actual.equalsIgnoreCase("PNG"))) {
                        throw new FieldValidationException(field, prefix + "Định dạng thực tế không khớp với đuôi tệp và loại ảnh.");
                    }
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 1 || height < 1 || width > 10000 || height > 10000 || (long) width * height > MAX_PIXELS) {
                        throw new FieldValidationException(field, prefix + "Tối đa 20 megapixel, mỗi chiều không quá 10.000 px.");
                    }
                    if (reader.read(0) == null) throw new FieldValidationException(field, prefix + "Không đọc được nội dung ảnh.");
                } finally { reader.dispose(); }
            }
            return new ImageContent(bytes, mime, name);
        } catch (IOException | IllegalArgumentException error) {
            throw new FieldValidationException(field, prefix + "Không đọc được ảnh; tệp bị hỏng hoặc không đúng định dạng JPG/PNG.");
        }
    }

    private FieldValidationException invalid(String message) { return new FieldValidationException("images", message); }
    private ResourceNotFoundException missing() { return new ResourceNotFoundException("Không tìm thấy tệp đính kèm bài viết."); }
}
