package org.hlrcs.service;
import org.hlrcs.exception.FieldValidationException;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class CommunityFormattingUnitTest extends CommunityUnitSupport {
    static String doc(String children){return "{\"type\":\"doc\",\"content\":["+children+"]}";}
    static String paragraph(String children){return "{\"type\":\"paragraph\",\"content\":["+children+"]}";}
    static String text(String value){return "{\"type\":\"text\",\"text\":\""+value+"\"}";}
    @TestFactory List<DynamicTest> formattingCases(){
        for(String font:List.of("default","serif","mono"))for(String size:List.of("small","normal","large"))for(String marks:List.of("","b","i","u","biu"))add("CommunityPostFormatting.validate","Normal","legacy="+font+":"+size+":"+marks,"Accept supported font/size/marks; default normal empty marks =>null",()->{
            String value=font+":"+size+":"+marks;assertEquals(value.equals("default:normal:")?null:value,CommunityPostFormatting.validate(JSON,value,"content"));
        });
        add("CommunityPostFormatting.validate","Boundary","empty format","null default",()->assertNull(CommunityPostFormatting.validate(JSON,"","content")));
        for(String c:List.of("bad-json","json-null","wrong-root","wrong-content","not-object","empty-text","numeric-text","marks-object","too-many-marks","bad-mark","bad-size","unknown-node","missing-children","children-object","empty-doc","list-first-child","disallowed-child","too-deep"))add("CommunityPostFormatting.readText","Abnormal",c,"Invalid rich text rejected with contentFormat field error",()->{
            String node=text("hello");String format=doc(paragraph(node));switch(c){case "bad-json"->format="{";case "json-null"->format="null";case "wrong-root"->format=paragraph(node);case "wrong-content"->{}case "not-object"->format=doc("null");case "empty-text"->format=doc(paragraph(text("")));case "numeric-text"->format=doc(paragraph("{\"type\":\"text\",\"text\":1}"));case "marks-object"->format=doc(paragraph("{\"type\":\"text\",\"text\":\"hello\",\"marks\":{}}"));case "too-many-marks"->format=doc(paragraph("{\"type\":\"text\",\"text\":\"hello\",\"marks\":[{},{},{},{},{}]}"));case "bad-mark"->format=doc(paragraph("{\"type\":\"text\",\"text\":\"hello\",\"marks\":[{\"type\":\"link\"}]}"));case "bad-size"->format=doc(paragraph("{\"type\":\"text\",\"text\":\"hello\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"fontSize\":\"99px\"}}]}"));case "unknown-node"->format=doc("{\"type\":\"unknown\"}");case "missing-children"->format="{\"type\":\"doc\"}";case "children-object"->format="{\"type\":\"doc\",\"content\":{}}";case "empty-doc"->format=doc("");case "list-first-child"->format=doc("{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"bulletList\",\"content\":[]}]}]}");case "disallowed-child"->format=doc(text("hello"));case "too-deep"->{String nested=paragraph(text("hello"));for(int i=0;i<14;i++)nested="{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":["+paragraph(text("hello"))+","+nested+"]}]}";format=doc(nested);}}
            String value=format;assertThrows(FieldValidationException.class,()->CommunityPostFormatting.validate(JSON,value,c.equals("wrong-content")?"different":"hello"));
        });
        for(String mark:List.of("bold","italic","underline","13px","18px","none","empty-marks"))add("CommunityPostFormatting.readText","Normal","text mark="+mark,"Read text with whitelisted formatting",()->{
            String marks=mark.equals("none")?"":",\"marks\":"+(mark.equals("empty-marks")?"[]":mark.endsWith("px")?"[{\"type\":\"textStyle\",\"attrs\":{\"fontSize\":\""+mark+"\"}}]":"[{\"type\":\""+mark+"\"}]");String format=doc(paragraph("{\"type\":\"text\",\"text\":\"hello\""+marks+"}"));assertEquals(format,CommunityPostFormatting.validate(JSON,format,"hello"));
        });
        for(String c:List.of("empty-paragraph","missing-paragraph-content","hard-break","bullet-list","ordered-list"))add("CommunityPostFormatting.readText","Normal",c,"Correct plain text extraction including line breaks/lists/empty paragraphs",()->{
            String format,plain;if(c.equals("empty-paragraph")){format=doc(paragraph(""));plain="";}else if(c.equals("missing-paragraph-content")){format=doc("{\"type\":\"paragraph\"}");plain="";}else if(c.equals("hard-break")){format=doc(paragraph(text("hello")+",{\"type\":\"hardBreak\"},"+text("world")));plain="hello\nworld";}else{format=doc("{\"type\":\""+(c.equals("bullet-list")?"bulletList":"orderedList")+"\",\"content\":[{\"type\":\"listItem\",\"content\":["+paragraph(text("hello"))+"]}]}");plain="hello";}
            assertEquals(format,CommunityPostFormatting.validate(JSON,format,plain));
        });
        return cases;
    }
}
