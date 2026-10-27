package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.CommunityPostResponse.Image;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.PostMedia;
import org.hlrcs.entity.enums.MediaType;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.repository.PostMediaRepository;
import org.jcodec.api.FrameGrab;
import org.jcodec.api.JCodecException;
import org.jcodec.common.Codec;
import org.jcodec.common.io.ByteBufferSeekableByteChannel;
import org.jcodec.containers.mp4.demuxer.MP4Demuxer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CommunityVideoService {
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public static final double MAX_SECONDS = 180;
    private final PostMediaRepository media;

    public List<Image> metadata(Integer postId) {
        return media.findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(postId, MediaType.VIDEO)
                .stream().map(row -> new Image(row.getMediaId(), row.getFileName())).toList();
    }

    @Transactional
    public void replace(Post post, List<Integer> retainedIds, List<MultipartFile> uploads) {
        var existing = metadata(post.getPostId());
        var keep = retainedIds == null ? existing.stream().map(Image::id).toList() : retainedIds;
        var files = uploads == null ? List.<MultipartFile>of() : uploads;
        if (new HashSet<>(keep).size() != keep.size() || keep.stream().anyMatch(id -> existing.stream().noneMatch(row -> row.id().equals(id)))) {
            throw invalid("Video giữ lại không thuộc bài viết này hoặc bị lặp.");
        }
        if (keep.size() + files.size() > 1) throw invalid("Mỗi bài viết được tối đa 1 video. Vui lòng bỏ video hiện tại trước khi thay video mới.");
        var validated = files.stream().map(this::validate).toList();
        for (var row : existing) if (!keep.contains(row.id())) media.deleteById(row.id());
        for (var file : validated) media.save(PostMedia.builder().post(post).mediaType(MediaType.VIDEO).mediaUrl("")
                .fileName(file.fileName()).contentType("video/mp4").fileContent(file.bytes()).build());
        media.flush();
    }

    private CommunityImageService.ImageContent validate(MultipartFile file) {
        String name = Objects.toString(file.getOriginalFilename(), "video").replaceAll("[\\p{Cntrl}\\\\/]", "_");
        name = name.substring(0, Math.min(name.length(), 200));
        String prefix = "Video “" + name + "”: ";
        if (file.isEmpty()) throw invalid(prefix + "Tệp rỗng, vui lòng chọn video khác.");
        if (file.getSize() > MAX_BYTES) throw invalid(prefix + "Vượt quá 50 MB/video.");
        if (!name.toLowerCase(Locale.ROOT).endsWith(".mp4") || !"video/mp4".equalsIgnoreCase(file.getContentType())) {
            throw invalid(prefix + "Chỉ nhận MP4 (.mp4), video H.264/AVC và âm thanh AAC (nếu có). Không nhận MOV, AVI, MKV, WEBM, HEVC/H.265 hoặc tệp đổi đuôi giả.");
        }
        try {
            byte[] bytes = file.getBytes();
            validateContainer(bytes);
            try (var channel = ByteBufferSeekableByteChannel.readFromByteBuffer(ByteBuffer.wrap(bytes));
                 var demuxer = MP4Demuxer.createMP4Demuxer(channel)) {
                if (demuxer.getVideoTracks().size() != 1) throw invalid(prefix + "Cần đúng một luồng video H.264/AVC trong tệp MP4.");
                var meta = demuxer.getVideoTrack().getMeta();
                if (meta.getCodec() != Codec.H264) throw invalid(prefix + "Video phải mã hóa H.264/AVC; không hỗ trợ HEVC/H.265 hay codec khác.");
                for (var audio : demuxer.getAudioTracks()) {
                    if (audio.getMeta().getCodec() != Codec.AAC) throw invalid(prefix + "Âm thanh phải là AAC hoặc không có âm thanh.");
                    double audioDuration = audio.getMeta().getTotalDuration();
                    if (!Double.isFinite(audioDuration) || audioDuration <= 0 || audioDuration > MAX_SECONDS) throw invalid(prefix + "Âm thanh không được dài quá 3 phút.");
                }
                double duration = meta.getTotalDuration();
                if (!Double.isFinite(duration) || duration <= 0 || duration > MAX_SECONDS) throw invalid(prefix + "Video phải dài hơn 0 giây và không quá 3 phút.");
                double movieDuration = demuxer.getMovie().getDuration() / (double) demuxer.getMovie().getTimescale();
                if (!Double.isFinite(movieDuration) || movieDuration <= 0 || movieDuration > MAX_SECONDS) throw invalid(prefix + "Tổng thời lượng tệp MP4 không được quá 3 phút.");
                var size = meta.getVideoCodecMeta().getSize();
                if (size.getWidth() < 1 || size.getHeight() < 1 || Math.max(size.getWidth(), size.getHeight()) > 1920
                        || (long) size.getWidth() * size.getHeight() > 1920L * 1080) throw invalid(prefix + "Độ phân giải tối đa Full HD (1920×1080 hoặc 1080×1920).");
                // Read every video sample to reject truncated media, not just a renamed file/header.
                int frames = 0;
                while (demuxer.getVideoTrack().nextFrame() != null) {
                    if (++frames > 21600) throw invalid(prefix + "Video có quá nhiều khung hình; hãy xuất MP4 tối đa 120 fps trong 3 phút.");
                }
                if (frames == 0 || frames != meta.getTotalFrames()) throw invalid(prefix + "Dữ liệu video bị thiếu hoặc hỏng.");
            }
            try (var channel = ByteBufferSeekableByteChannel.readFromByteBuffer(ByteBuffer.wrap(bytes))) {
                if (FrameGrab.createFrameGrab(channel).getNativeFrame() == null) throw invalid(prefix + "Không giải mã được video H.264/AVC.");
            }
            return new CommunityImageService.ImageContent(bytes, "video/mp4", name);
        } catch (FieldValidationException error) { throw error; }
        catch (IOException | JCodecException | RuntimeException error) {
            throw invalid(prefix + "Không đọc được video; tệp MP4 bị hỏng, thiếu dữ liệu hoặc không đúng H.264/AVC.");
        }
    }

    private void validateContainer(byte[] bytes) {
        boolean ftyp = false, moov = false, mdat = false;
        var buffer = ByteBuffer.wrap(bytes);
        while (buffer.remaining() >= 8) {
            int start = buffer.position();
            long length = Integer.toUnsignedLong(buffer.getInt());
            String type = new String(bytes, start + 4, 4, StandardCharsets.US_ASCII);
            buffer.getInt();
            int header = 8;
            if (length == 1) { if (buffer.remaining() < 8) throw new IllegalArgumentException(); length = buffer.getLong(); header = 16; }
            if (length == 0) length = bytes.length - start;
            if (length < header || length > bytes.length - start) throw new IllegalArgumentException();
            if (type.equals("ftyp")) {
                if (length < header + 8 || !Set.of("isom", "iso2", "mp41", "mp42", "avc1").contains(new String(bytes, start + header, 4, StandardCharsets.US_ASCII))) throw new IllegalArgumentException();
                ftyp = true;
            }
            moov |= type.equals("moov");
            mdat |= type.equals("mdat") && length > header;
            buffer.position(start + (int) length);
        }
        if (buffer.hasRemaining() || !ftyp || !moov || !mdat) throw new IllegalArgumentException();
    }

    private FieldValidationException invalid(String message) { return new FieldValidationException("videos", message); }
}
