package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.jcodec.containers.mp4.demuxer.MP4Demuxer;
import org.jcodec.api.FrameGrab;
import org.jcodec.common.*;
import org.jcodec.common.model.*;
import javax.imageio.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityBoundaryUnitTest extends CommunityUnitSupport {
    @TestFactory List<DynamicTest> boundaryCases(){
        add("CommunityAutoModeration.processNext","Abnormal","Mode switches OFF after initial check, before decision lock","Recheck inside lock stops claim",()->{var f=new CommunityAutoModerationUnitTest.F(CommunityAutoModeration.Mode.AUTO,true);when(f.scanner.configured()).thenAnswer(i->{ReflectionTestUtils.setField(f.s,"mode",CommunityAutoModeration.Mode.OFF);return true;});f.s.processNext();verifyNoInteractions(f.jobs);});
        add("CommunityPostFormatting.validate","Abnormal","JSON parser returns Java null","FieldValidationException",()->{var mapper=mock(tools.jackson.databind.ObjectMapper.class);when(mapper.readTree("{}")).thenReturn((tools.jackson.databind.JsonNode)null);assertThrows(FieldValidationException.class,()->CommunityPostFormatting.validate(mapper,"{}",""));});
        for(String node:List.of("null","{\"type\":\"unknown\"}"))add("CommunityPostFormatting.readText","Abnormal","direct defensive parser input="+node,"Reject non-object and unknown node",()->assertThrows(FieldValidationException.class,()->ReflectionTestUtils.invokeMethod(CommunityPostFormatting.class,"readText",JSON.readTree(node),0)));
        for(String condition:List.of("zero-width","zero-height","null-decoded-image"))add("CommunityImageService.validate","Boundary","Image reader reports "+condition,"Reject malformed decoder metadata or null decoded pixels",()->{
            var reader=mock(ImageReader.class);when(reader.getFormatName()).thenReturn("PNG");when(reader.getWidth(0)).thenReturn(condition.equals("zero-width")?0:1);when(reader.getHeight(0)).thenReturn(condition.equals("zero-height")?0:1);
            try(var io=mockStatic(ImageIO.class,CALLS_REAL_METHODS)){io.when(()->ImageIO.getImageReaders(any(Object.class))).thenAnswer(i->List.of(reader).iterator());assertThrows(FieldValidationException.class,()->CommunityImageService.validate(new MockMultipartFile("x","a.png","image/png",new byte[]{1}),"images"));verify(reader).dispose();}
        });
        for(String condition:List.of("no-video-track","multi-video-track","wrong-video-codec","wrong-audio-codec","audio-nan","audio-zero","audio-negative","audio-over","audio-limit","video-nan","video-zero","video-negative","video-over","video-limit","movie-infinite","movie-zero","movie-over","movie-limit","width-zero","height-zero","too-many-pixels","no-frames","mismatched-frames","too-many-frames","decode-null","valid-with-audio"))add("CommunityVideoService.validate","Boundary","Demuxer/decoder scenario="+condition,"Validate codec, audio/video/movie duration, resolution, complete samples and decodable first frame",()->{
            byte[] bytes=CommunityMediaUnitTest.video(32,32,1);var demuxer=mock(MP4Demuxer.class,RETURNS_DEEP_STUBS);var track=demuxer.getVideoTrack();var meta=track.getMeta();var audio=mock(DemuxerTrack.class,RETURNS_DEEP_STUBS);
            when(demuxer.getVideoTracks()).thenReturn(condition.equals("no-video-track")?List.of():condition.equals("multi-video-track")?List.of(track,track):List.of(track));
            when(meta.getCodec()).thenReturn(condition.equals("wrong-video-codec")?Codec.MPEG4:Codec.H264);when(meta.getTotalDuration()).thenReturn(condition.equals("video-nan")?Double.NaN:condition.equals("video-zero")?0:condition.equals("video-negative")?-1:condition.equals("video-over")?181:condition.equals("video-limit")?180:1);
            when(demuxer.getAudioTracks()).thenReturn(List.of(audio));when(audio.getMeta().getCodec()).thenReturn(condition.equals("wrong-audio-codec")?Codec.MP3:Codec.AAC);
            when(audio.getMeta().getTotalDuration()).thenReturn(condition.equals("audio-nan")?Double.NaN:condition.equals("audio-zero")?0:condition.equals("audio-negative")?-1:condition.equals("audio-over")?181:condition.equals("audio-limit")?180:1);
            when(demuxer.getMovie().getTimescale()).thenReturn(condition.equals("movie-infinite")?0:1);when(demuxer.getMovie().getDuration()).thenReturn(condition.equals("movie-zero")?0L:condition.equals("movie-over")?181L:condition.equals("movie-limit")?180L:1L);
            when(meta.getVideoCodecMeta().getSize()).thenReturn(new Size(condition.equals("width-zero")?0:condition.equals("too-many-pixels")?1920:32,condition.equals("height-zero")?0:condition.equals("too-many-pixels")?1920:32));
            var packet=mock(Packet.class);if(condition.equals("no-frames"))when(track.nextFrame()).thenReturn(null);else if(condition.equals("too-many-frames"))when(track.nextFrame()).thenReturn(packet);else when(track.nextFrame()).thenReturn(packet,(Packet)null);
            when(meta.getTotalFrames()).thenReturn(condition.equals("mismatched-frames")?2:1);var grab=mock(FrameGrab.class);when(grab.getNativeFrame()).thenReturn(condition.equals("decode-null")?null:Picture.create(32,32,ColorSpace.RGB));
            var repo=mock(PostMediaRepository.class);var service=new CommunityVideoService(repo);
            try(var mp4=mockStatic(MP4Demuxer.class);var fg=mockStatic(FrameGrab.class)){mp4.when(()->MP4Demuxer.createMP4Demuxer(any())).thenReturn(demuxer);fg.when(()->FrameGrab.createFrameGrab(any())).thenReturn(grab);
                var file=new MockMultipartFile("videos","a.mp4","video/mp4",bytes);if(Set.of("audio-limit","video-limit","movie-limit","valid-with-audio").contains(condition)){service.replace(post(),List.of(),List.of(file));verify(repo).save(any());}else{assertThrows(FieldValidationException.class,()->service.replace(post(),List.of(),List.of(file)));verify(repo,never()).save(any());}
            }
        });
        return cases;
    }
}
