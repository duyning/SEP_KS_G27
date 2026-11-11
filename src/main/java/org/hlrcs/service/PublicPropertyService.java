package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;

/** Only approved, published listings. Identity documents and owner account data stay private. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class PublicPropertyService {
    // Campus center from OpenStreetMap way 800878327 (FPT University, Hòa Lạc).
    private static final double FPT_LATITUDE = 21.01354;
    private static final double FPT_LONGITUDE = 105.52522;
    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private final PropertyRepository properties;
    private final PropertyDocumentRepository documents;
    private final RoomTypeRepository types;
    private final RoomRepository rooms;
    private final RoomTypeImageRepository images;
    private final ObjectMapper json;
    public record Type(Integer roomTypeId,String name,BigDecimal price,Float area,Integer capacity,
                       BigDecimal electricityPrice,BigDecimal waterPrice,List<String> amenities,int totalRooms,int vacantRooms,java.time.Instant availabilityConfirmedAt,String availabilityConfirmationStatus,boolean availabilityStale) {}
    public record Listing(Integer propertyId,String name,String address,String commune,String propertyType,
                          String description,List<String> photos,List<String> amenities,
                          List<String> rules,List<Type> roomTypes,BigDecimal minPrice,int totalRooms,int vacantRooms,
                          Double distanceToFptMeters) {}
    public record Image(byte[] bytes,String contentType) {}

    private PropertyRegistrationRequest submission(Property property) {
        if(property.getRegistration()==null||property.getRegistration().getRegistrationDetails()==null)return null;
        try{return json.readValue(property.getRegistration().getRegistrationDetails(),PropertyRegistrationRequest.class);}
        catch(Exception ignored){return null;}
    }
    private boolean published(Property property) {
        if(property.isReverificationRequired()||!"ACTIVE".equals(property.getStatus())||property.getRegistration()==null||property.getRegistration().getStatus()!=RegistrationStatus.APPROVED)return false;
        var form=submission(property);
        return form!=null&&Boolean.TRUE.equals(form.termsAccepted());
    }
    private List<String> amenities(RoomType type) {
        if(type.getAmenitiesJson()==null)return List.of();
        try{return Arrays.asList(json.readValue(type.getAmenitiesJson(),String[].class));}
        catch(Exception ignored){return List.of();}
    }
    public List<Listing> list() {
        return properties.findByStatusOrderByPropertyIdDesc("ACTIVE").stream().filter(this::published).map(property->{
            var form=submission(property);var photos=new ArrayList<String>();
            documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(property.getRegistration().getRegistrationId()).stream()
                .filter(file->Objects.toString(file.getDocumentType(),"").matches("PHOTO_\\d+"))
                .forEach(file->photos.add("/api/public/properties/photos/"+file.getDocumentId()));
            var values=new ArrayList<Type>();var prices=new ArrayList<BigDecimal>();
            for(var type:types.findByProperty_PropertyId(property.getPropertyId())) {
                var actual=rooms.findByRoomType_RoomTypeIdOrderByRoomNumberAsc(type.getRoomTypeId());
                int vacant=(int)actual.stream().filter(room->"VACANT".equals(room.getStatus())).count();
                var freshness = AvailabilityFreshness.status(type.getAvailabilityConfirmedAt());
                values.add(new Type(type.getRoomTypeId(),type.getRoomType(),type.getPrice(),type.getAreaSqm(),type.getCapacity(),type.getElectricityPrice(),type.getWaterPrice(),amenities(type),actual.size(),vacant,type.getAvailabilityConfirmedAt(),freshness,"STALE".equals(freshness)));
                actual.stream().filter(room->"VACANT".equals(room.getStatus())).map(room->room.getCustomPrice()!=null?room.getCustomPrice():type.getPrice()).filter(Objects::nonNull).forEach(prices::add);
                images.findByRoomType_RoomTypeIdOrderByImageIdAsc(type.getRoomTypeId()).forEach(image->photos.add("/api/public/properties/room-images/"+image.getImageId()));
            }
            if(prices.isEmpty())values.stream().map(Type::price).filter(Objects::nonNull).forEach(prices::add);
            return new Listing(property.getPropertyId(),property.getName(),property.getAddress(),form.commune(),form.propertyType(),
                property.getDescription(),photos,form.amenities()==null?List.of():form.amenities(),form.selectedRules()==null?List.of():form.selectedRules(),values,prices.stream().min(BigDecimal::compareTo).orElse(null),
                values.stream().mapToInt(Type::totalRooms).sum(),values.stream().mapToInt(Type::vacantRooms).sum(),
                distanceToFptMeters(form));
        }).toList();
    }
    private static Double distanceToFptMeters(PropertyRegistrationRequest form) {
        if (form.latitude() == null || form.longitude() == null) return null;
        try {
            double latitude = Double.parseDouble(form.latitude());
            double longitude = Double.parseDouble(form.longitude());
            if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

            double latitudeDelta = Math.toRadians(latitude - FPT_LATITUDE);
            double longitudeDelta = Math.toRadians(longitude - FPT_LONGITUDE);
            double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                    + Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(FPT_LATITUDE))
                    * Math.pow(Math.sin(longitudeDelta / 2), 2);
            return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
    public Image photo(Integer id) {
        var file=documents.findById(id).orElseThrow(this::missing);
        // Never expose ownership, ID cards, fire-safety documents, or unapproved uploads.
        if(file.getArchivedAt()!=null||!Objects.toString(file.getDocumentType(),"").matches("PHOTO_\\d+"))throw missing();
        var registrationId=file.getRegistration().getRegistrationId();
        if(properties.findByStatusOrderByPropertyIdDesc("ACTIVE").stream().noneMatch(p->published(p)&&p.getRegistration().getRegistrationId().equals(registrationId)))throw missing();
        return image(file.getFileContent(),file.getContentType());
    }
    public Image roomImage(Integer id) {
        var file=images.findById(id).orElseThrow(this::missing);
        if(!published(file.getRoomType().getProperty()))throw missing();
        return image(file.getFileContent(),file.getContentType());
    }
    private Image image(byte[] bytes,String contentType) {
        if(bytes==null||!Set.of("image/jpeg","image/png","image/webp").contains(Objects.toString(contentType,"")))throw missing();
        return new Image(bytes,contentType);
    }
    private ResourceNotFoundException missing(){return new ResourceNotFoundException("Không tìm thấy hình ảnh công khai.");}
}
