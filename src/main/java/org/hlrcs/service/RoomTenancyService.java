package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractRequest;
import org.hlrcs.dto.request.RoomTenancyRequest;
import org.hlrcs.entity.RentalContract;
import org.hlrcs.entity.Room;
import org.hlrcs.entity.RoomTenancy;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.RentalContractRepository;
import org.hlrcs.repository.RoomTenancyRepository;
import org.hlrcs.repository.RoomUtilityReadingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RoomTenancyService {
    private final RoomTenancyRepository tenancies;
    private final RoomUtilityReadingRepository utilityReadings;
    private final RentalContractRepository contracts;
    private final ObjectMapper json;

    public record Profile(LocalDate today, Tenancy current, List<Tenancy> history) {}
    public record Tenancy(String key, LocalDate startDate, LocalDate endDate, LocalDate closedDate,
                          BigDecimal monthlyRent, BigDecimal deposit, Long contractId,
                          boolean landlordSigned, boolean tenantSigned, List<Occupant> occupants) {}
    public record Occupant(Long id, String name, String phone, LocalDate joinedOn, LocalDate leftOn, boolean primaryTenant) {}

    static LocalDate today() {
        return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    Profile profile(Room room) {
        var contractById = contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(room.getRoomId(), ownerId(room))
                .stream().collect(Collectors.toMap(RentalContract::getId, Function.identity()));
        var saved = tenancies.findByRoomIdAndOwnerIdOrderByIdDesc(room.getRoomId(), ownerId(room));
        var versions = versions(saved, contractById);
        var current = versions.stream().filter(lease -> lease.closedDate() == null).findFirst().orElse(null);
        var history = versions.stream().filter(lease -> lease.closedDate() != null)
                .sorted(Comparator.comparing(Tenancy::closedDate).thenComparing(Tenancy::startDate).reversed()).toList();
        return new Profile(today(), current, history);
    }

    List<Tenancy> versions(List<RoomTenancy> saved, Map<Long, RentalContract> contractById) {
        var attached = saved.stream().map(RoomTenancy::getContractId).filter(Objects::nonNull).collect(Collectors.toSet());
        return Stream.concat(
                saved.stream().map(tenancy -> view(tenancy,
                        tenancy.getContractId() == null ? null : contractById.get(tenancy.getContractId()))),
                contractById.values().stream().filter(contract -> !attached.contains(contract.getId())).map(this::fromContract)
        ).toList();
    }

    // Room and contract writers hold the same owner lock before changing a tenancy.
    void start(Room room, RoomTenancyRequest request) {
        requireNoCurrent(room);
        var lease = newTenancy(room);
        lease.addOccupant(checkedName(request.name()), checkedPhone(request.phone()), room.getLeaseStartDate(), true);
        tenancies.saveAndFlush(lease);
    }

    void requireNoCurrent(Room room) {
        if (current(room) != null || !contracts.findByRoomIdAndOwnerIdAndStatus(
                room.getRoomId(), ownerId(room), "ACTIVE").isEmpty()) {
            throw new AppException("Phòng đã có hồ sơ đợt thuê. Vui lòng tải lại thông tin phòng.", HttpStatus.CONFLICT);
        }
    }

    void attach(Room room, RentalContract contract, RentalContractRequest details) {
        var lease = current(room);
        if (lease == null) {
            lease = newTenancy(room);
            lease.addOccupant(details.tenantName().trim(), details.tenantPhone().trim(), lease.getStartDate(), true);
        } else {
            var primary = lease.getOccupants().get(0);
            if (!primary.getName().equalsIgnoreCase(details.tenantName().trim()) ||
                    !phoneDigits(primary.getPhone()).equals(phoneDigits(details.tenantPhone()))) {
                throw new AppException("Tên hoặc số điện thoại người thuê trong hợp đồng chưa khớp với hồ sơ đợt thuê.", HttpStatus.CONFLICT);
            }
        }
        lease.setContractId(contract.getId());
        lease.setMonthlyRent(details.rent());
        lease.setDeposit(details.deposit());
        if (lease.getId() == null) tenancies.save(lease);
        tenancies.flush();
    }

    void syncDates(Room room) {
        var lease = current(room);
        if (lease == null) return;
        if (lease.getStartDate().equals(room.getLeaseStartDate()) && lease.getEndDate().equals(room.getLeaseEndDate())) return;
        boolean invalid = lease.getOccupants().stream().filter(person -> !person.isPrimaryTenant())
                .anyMatch(person -> person.getJoinedOn().isAfter(room.getLeaseEndDate())
                        || person.getJoinedOn().isBefore(room.getLeaseStartDate()));
        if (invalid) throw new BadRequestException("Kỳ thuê mới phải bao gồm các mốc vào và rời phòng đã ghi nhận.");
        if (!lease.getStartDate().equals(room.getLeaseStartDate()) &&
                utilityReadings.existsByTenancyId(lease.getId())) {
            throw new BadRequestException("Đợt thuê đã có chỉ số điện nước. Không thể đổi ngày bắt đầu thuê.");
        }
        lease.setStartDate(room.getLeaseStartDate());
        lease.setEndDate(room.getLeaseEndDate());
        lease.getOccupants().get(0).setJoinedOn(lease.getStartDate());
    }

    void close(Room room, LocalDate date) {
        var lease = current(room);
        if (lease == null) {
            var legacy = lockLegacyContract(room);
            if (legacy == null) return;
            lease = importContract(room, legacy);
        }
        if (lease.getOccupants().stream().anyMatch(person -> person.getLeftOn() != null && person.getLeftOn().isAfter(date))) {
            throw new BadRequestException("Ngày trả phòng phải từ ngày rời phòng đã ghi nhận gần nhất.");
        }
        if (utilityReadings.existsByTenancyIdAndReadOnAfter(lease.getId(), date)) {
            throw new BadRequestException("Ngày trả phòng sớm hơn chỉ số điện nước đã ghi. Kiểm tra lại ngày trả phòng hoặc chỉnh ngày ghi chỉ số.");
        }
        lease.setActiveRoomId(null);
        lease.setClosedDate(date);
        for (var person : lease.getOccupants()) {
            if (person.getLeftOn() == null && !person.getJoinedOn().isAfter(date)) person.setLeftOn(date);
        }
        tenancies.flush();
    }

    void checkClose(Room room, String key, LocalDate date) {
        var lease = resolveCurrent(room, key);
        var today = today();
        var earliest = lease.getStartDate().isAfter(today) ? today : lease.getStartDate();
        if (date.isAfter(today) || date.isBefore(earliest)) {
            throw new BadRequestException("Chọn ngày trả phòng từ ngày bắt đầu thuê đến hôm nay.");
        }
    }

    void addOccupant(Room room, String key, RoomTenancyRequest.Occupant request) {
        var lease = resolveCurrent(room, key);
        var date = request.joinedOn();
        if (date.isBefore(lease.getStartDate()) || date.isAfter(lease.getEndDate())) {
            throw new BadRequestException("Ngày vào ở phải nằm trong kỳ thuê.");
        }
        var name = checkedName(request.name());
        var phone = request.phone() == null ? null : checkedPhone(request.phone());
        boolean exists = lease.getOccupants().stream().anyMatch(person -> person.getLeftOn() == null
                && person.getName().equalsIgnoreCase(name) && Objects.equals(phoneDigits(person.getPhone()), phoneDigits(phone)));
        if (exists) throw new AppException("Người này đã có trong danh sách đang ở.", HttpStatus.CONFLICT);
        lease.addOccupant(name, phone, date, false);
        tenancies.flush();
    }

    void markLeft(Room room, String key, Long occupantId, LocalDate date) {
        var lease = resolveCurrent(room, key);
        var person = lease.getOccupants().stream().filter(occupant -> occupantId.equals(occupant.getId()) && !occupant.isPrimaryTenant())
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người ở cùng."));
        if (person.getLeftOn() != null) throw new AppException("Người này đã được ghi nhận rời phòng.", HttpStatus.CONFLICT);
        if (date.isBefore(person.getJoinedOn()) || date.isAfter(today())) {
            throw new BadRequestException("Chọn ngày rời phòng từ ngày vào ở đến hôm nay.");
        }
        person.setLeftOn(date);
    }

    private RoomTenancy resolveCurrent(Room room, String key) {
        var lease = current(room);
        if (lease != null && tenancyKey(lease).equals(key)) return lease;
        var contract = lease == null ? lockLegacyContract(room) : null;
        if (contract != null && contractKey(contract).equals(key)) return importContract(room, contract);
        throw new AppException("Đợt thuê hiện tại đã thay đổi. Vui lòng tải lại hồ sơ.", HttpStatus.CONFLICT);
    }

    RoomTenancy importContract(Room room, RentalContract contract) {
        var details = details(contract);
        var lease = newTenancy(room);
        lease.setStartDate(contract.getStartDate());
        lease.setEndDate(contract.getEndDate());
        lease.setContractId(contract.getId());
        lease.setMonthlyRent(details.rent());
        lease.setDeposit(details.deposit());
        lease.addOccupant(details.tenantName(), details.tenantPhone(), lease.getStartDate(), true);
        if (contract.getClosedAt() != null) {
            lease.setActiveRoomId(null);
            lease.setClosedDate(contract.getClosedAt().toLocalDate());
            lease.getOccupants().get(0).setLeftOn(lease.getClosedDate());
        }
        return tenancies.save(lease);
    }

    private RoomTenancy newTenancy(Room room) {
        var lease = new RoomTenancy();
        lease.setRoomId(room.getRoomId());
        lease.setOwnerId(ownerId(room));
        lease.setActiveRoomId(room.getRoomId());
        lease.setStartDate(room.getLeaseStartDate());
        lease.setEndDate(room.getLeaseEndDate());
        lease.setMonthlyRent(room.getCustomPrice() == null ? room.getRoomType().getPrice() : room.getCustomPrice());
        lease.setDeposit(room.getRoomType().getDeposit());
        return lease;
    }

    private RoomTenancy current(Room room) {
        return tenancies.findByActiveRoomIdAndOwnerId(room.getRoomId(), ownerId(room)).orElse(null);
    }

    private RentalContract lockLegacyContract(Room room) {
        return contracts.lockActiveForRoom(room.getRoomId(), ownerId(room)).stream().findFirst().orElse(null);
    }

    private Integer ownerId(Room room) {
        return room.getProperty().getOwner().getUserId();
    }

    private RentalContractRequest details(RentalContract contract) {
        return json.readValue(contract.getDetailsJson(), RentalContractRequest.class);
    }

    private Tenancy view(RoomTenancy lease, RentalContract contract) {
        return new Tenancy(tenancyKey(lease), lease.getStartDate(), lease.getEndDate(), lease.getClosedDate(),
                lease.getMonthlyRent(), lease.getDeposit(), lease.getContractId(), signedByOwner(contract), signedByTenant(contract),
                lease.getOccupants().stream().map(person -> new Occupant(person.getId(), person.getName(), person.getPhone(),
                        person.getJoinedOn(), person.getLeftOn(), person.isPrimaryTenant())).toList());
    }

    private Tenancy fromContract(RentalContract contract) {
        var details = details(contract);
        var closed = contract.getClosedAt() == null ? null : contract.getClosedAt().toLocalDate();
        return new Tenancy(contractKey(contract), contract.getStartDate(), contract.getEndDate(), closed,
                details.rent(), details.deposit(), contract.getId(), signedByOwner(contract), signedByTenant(contract),
                List.of(new Occupant(null, details.tenantName(), details.tenantPhone(), contract.getStartDate(), closed, true)));
    }

    private boolean signedByOwner(RentalContract contract) {
        return contract != null && contract.getOwnerSignatureJson() != null;
    }

    private boolean signedByTenant(RentalContract contract) {
        return contract != null && contract.getTenantSignatureJson() != null;
    }

    private String tenancyKey(RoomTenancy tenancy) { return "t-" + tenancy.getId(); }
    private String contractKey(RentalContract contract) { return "c-" + contract.getId(); }

    private String checkedName(String value) {
        var name = value.trim();
        if (name.length() < 2) throw new BadRequestException("Nhập họ tên có ít nhất 2 ký tự.");
        return name;
    }

    private String checkedPhone(String value) {
        if (phoneDigits(value).length() < 8) throw new BadRequestException("Nhập số điện thoại hợp lệ.");
        return value.trim();
    }

    private String phoneDigits(String value) {
        var digits = value == null ? "" : value.replaceAll("\\D", "");
        return digits.startsWith("84") && digits.length() == 11 ? "0" + digits.substring(2) : digits;
    }
}
