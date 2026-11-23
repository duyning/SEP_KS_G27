package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record RoomStatusRequest(
        @NotNull @Positive Integer propertyId,
        @NotNull @Size(min=1,max=200) List<@NotNull @Positive Integer> roomIds,
        @NotBlank @Pattern(regexp="VACANT|OCCUPIED") String status,
        LocalDate leaseStartDate,
        LocalDate leaseEndDate,
        @Size(max=200) List<@jakarta.validation.Valid @NotNull RentalContractRequest> contracts) {
    public RoomStatusRequest(Integer propertyId,List<Integer> roomIds,String status,LocalDate leaseStartDate,LocalDate leaseEndDate){this(propertyId,roomIds,status,leaseStartDate,leaseEndDate,null);}
}
