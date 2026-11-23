package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractRequest;
import org.hlrcs.dto.request.RoomUtilityRequest;
import org.hlrcs.entity.Property;
import org.hlrcs.entity.RentalContract;
import org.hlrcs.entity.Room;
import org.hlrcs.entity.RoomTenancy;
import org.hlrcs.entity.RoomUtilityReading;
import org.hlrcs.entity.RoomUtilityReading.WaterMode;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomUtilityService {
    private final AuthService auth;
    private final UserRepository users;
    private final PropertyRepository properties;
    private final RoomRepository rooms;
    private final RoomTenancyRepository tenancies;
    private final RentalContractRepository contracts;
    private final RoomUtilityReadingRepository readings;
    private final RoomTenancyService tenancyService;
    private final ObjectMapper json;

    public record Ledger(String month, String currentMonth, boolean editable, List<Row> rows) {}
    public record Row(Integer roomId, String roomNumber, String floor, String tenancyKey, String tenantName,
                      LocalDate periodStart, LocalDate periodEnd, LocalDate latestReadOn, boolean handover, String issue,
                      LocalDate previousReadOn, BigDecimal suggestedElectricityStart, BigDecimal suggestedWaterStart,
                      int suggestedOccupants, List<Stay> stays, BigDecimal defaultElectricityRate, BigDecimal defaultWaterRate,
                      WaterMode defaultWaterMode, Saved saved) {}
    public record Stay(LocalDate joinedOn, LocalDate leftOn) {}
    public record Saved(Long revision, LocalDate readOn, BigDecimal electricityStart, BigDecimal electricityEnd,
                        BigDecimal electricityRate, String electricityAmount, WaterMode waterMode,
                        BigDecimal waterStart, BigDecimal waterEnd, BigDecimal waterRate,
                        Integer occupantCount, String waterAmount) {}

    private record Target(Room room, RoomTenancyService.Tenancy lease, Long tenancyId, LocalDate from,
                          LocalDate until, LocalDate limit, boolean handover, String issue) {}
    private record Scope(Property property, YearMonth month, LocalDate today, List<Target> targets,
                         Map<Long, RentalContract> contractById, Map<Long, LocalDate> closedDates,
                         List<RoomUtilityReading> readings) {}
    private record Baseline(RoomUtilityReading prior, BigDecimal electricityStart, BigDecimal electricityEnd,
                            BigDecimal waterStart, BigDecimal waterEnd) {}

    record BillingPeriod(Room room, RoomTenancyService.Tenancy lease, Long tenancyId, RentalContract contract,
                         String issue, RoomUtilityReading finalReading) {}

    List<BillingPeriod> billingPeriods(Integer propertyId, YearMonth period, Integer ownerId) {
        var scope = scope(propertyId, period, ownerId);
        return scope.targets().stream().filter(target -> target.lease() != null).map(target -> {
            var lease = target.lease();
            return new BillingPeriod(target.room(), lease, target.tenancyId(),
                    scope.contractById().get(lease.contractId()), target.issue(), stored(scope, target));
        }).toList();
    }

    @Transactional(readOnly = true)
    public Ledger list(Integer propertyId, String month) {
        return ledger(scope(propertyId, month(month), auth.getCurrentUser().getUserId()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Ledger save(RoomUtilityRequest request) {
        var ownerId = auth.getCurrentUser().getUserId();
        var month = month(request.month());
        if (month.isAfter(YearMonth.from(RoomTenancyService.today()))) {
            throw new BadRequestException("Tháng tương lai chỉ dùng để xem trước chỉ số đầu kỳ.");
        }
        users.findForRegistrationUpdate(ownerId).orElseThrow();
        var scope = scope(request.propertyId(), month, ownerId);
        if (!editable(scope.property())) {
            throw new AppException("Nhà trọ cần đang hoạt động để ghi điện nước.", HttpStatus.CONFLICT);
        }
        var targets = scope.targets().stream().filter(target -> target.lease() != null)
                .collect(Collectors.toMap(target -> target.lease().key(), Function.identity()));
        var touched = new HashSet<String>();
        var changes = new ArrayList<RoomUtilityReading>();
        var labels = new HashMap<Integer, String>();
        var requestedRooms = request.entries().stream().map(RoomUtilityRequest.Entry::roomId).collect(Collectors.toSet());
        var dependencies = new HashMap<RoomUtilityReading, Baseline>();
        for (var existing : scope.readings()) {
            if (!requestedRooms.contains(existing.getRoomId())) continue;
            var prior = previous(scope, existing.getRoomId(), existing.getTenancyId(), existing.getPeriodStart(), existing);
            if (prior != null) dependencies.put(existing, new Baseline(prior, existing.getElectricityStart(), prior.getElectricityEnd(),
                    existing.getWaterStart(), prior.getWaterEnd()));
        }
        for (var entry : request.entries()) {
            if (!touched.add(entry.tenancyKey())) throw new BadRequestException("Danh sách ghi chỉ số bị trùng đợt thuê.");
            var target = targets.get(entry.tenancyKey());
            if (target == null || !target.room().getRoomId().equals(entry.roomId())) {
                throw new AppException("Phòng hoặc đợt thuê đã thay đổi. Vui lòng tải lại danh sách.", HttpStatus.CONFLICT);
            }
            var number = target.room().getRoomNumber();
            labels.put(entry.roomId(), number);
            if (target.issue() != null) throw invalid(number, target.issue());
            var row = stored(scope, target);
            if (!Objects.equals(row == null ? null : row.getRevision(), entry.revision())) {
                throw new AppException("Phòng " + number + " đã được cập nhật. Vui lòng tải lại chỉ số.", HttpStatus.CONFLICT);
            }
            if (row == null) {
                var tenancyId = target.tenancyId();
                if (tenancyId == null) {
                    var contract = scope.contractById().get(target.lease().contractId());
                    tenancyId = tenancyService.importContract(target.room(), contract).getId();
                    if (target.lease().closedDate() != null) scope.closedDates().put(tenancyId, target.lease().closedDate());
                }
                row = new RoomUtilityReading();
                row.setTenancyId(tenancyId);
                row.setRoomId(entry.roomId());
                row.setOwnerId(ownerId);
                row.setBillingMonth(month.atDay(1));
                scope.readings().add(row);
            }
            fill(row, target, entry);
            changes.add(row);
        }
        for (var dependency : dependencies.entrySet()) {
            var row = dependency.getKey();
            var baseline = dependency.getValue();
            var prior = baseline.prior();
            boolean used = sameReading(baseline.electricityStart(), baseline.electricityEnd()) ||
                    baseline.waterStart() != null && sameReading(baseline.waterStart(), baseline.waterEnd());
            if (used && changes.contains(prior) && previous(scope, row.getRoomId(), row.getTenancyId(), row.getPeriodStart(), row) != prior) {
                throw invalid(labels.get(prior.getRoomId()), "Ngày ghi này đang làm mốc cho kỳ tiếp theo. Giữ ngày ghi đã chốt.");
            }
        }
        validateContinuity(scope, changes, labels, dependencies);
        readings.saveAllAndFlush(changes);
        return ledger(scope(request.propertyId(), month, ownerId));
    }

    private Scope scope(Integer propertyId, YearMonth month, Integer ownerId) {
        var property = properties.findById(propertyId)
                .filter(value -> value.getOwner().getUserId().equals(ownerId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà trọ của bạn."));
        var today = RoomTenancyService.today();
        var inventory = rooms.findByProperty_PropertyIdAndProperty_Owner_UserIdOrderByRoomNumberAsc(propertyId, ownerId);
        if (inventory.isEmpty()) return new Scope(property, month, today, List.of(), Map.of(), new HashMap<>(), new ArrayList<>());
        var ids = inventory.stream().map(Room::getRoomId).toList();
        var savedByRoom = tenancies.findByOwnerIdAndRoomIdIn(ownerId, ids).stream()
                .collect(Collectors.groupingBy(RoomTenancy::getRoomId));
        var foundContracts = contracts.findByOwnerIdAndRoomIdIn(ownerId, ids);
        var contractById = foundContracts.stream().collect(Collectors.toMap(RentalContract::getId, Function.identity()));
        var contractsByRoom = foundContracts.stream().collect(Collectors.groupingBy(RentalContract::getRoomId,
                Collectors.toMap(RentalContract::getId, Function.identity())));
        var first = month.minusMonths(1).atDay(1);
        var last = month.plusMonths(1).atDay(1);
        var stored = new ArrayList<>(readings.findByOwnerIdAndRoomIdInAndBillingMonthBetween(ownerId, ids, first, last));
        var closedDates = new HashMap<Long, LocalDate>();
        var targets = new ArrayList<Target>();
        for (var room : inventory) {
            var saved = savedByRoom.getOrDefault(room.getRoomId(), List.of());
            saved.stream().filter(value -> value.getClosedDate() != null)
                    .forEach(value -> closedDates.put(value.getId(), value.getClosedDate()));
            var leases = tenancyService.versions(saved, contractsByRoom.getOrDefault(room.getRoomId(), Map.of())).stream()
                    .filter(lease -> lease.closedDate() == null || !lease.closedDate().isBefore(lease.startDate()))
                    .sorted(Comparator.comparing(RoomTenancyService.Tenancy::startDate)
                            .thenComparing(lease -> lease.closedDate() == null ? LocalDate.MAX : lease.closedDate()))
                    .toList();
            targets.addAll(targets(room, leases, month, today));
        }
        var tenancyIds = targets.stream().map(Target::tenancyId).filter(Objects::nonNull).distinct().toList();
        if (!tenancyIds.isEmpty()) stored.addAll(readings.findOutsideWindow(tenancyIds, first, last));
        return new Scope(property, month, today, targets, contractById, closedDates, stored);
    }

    private List<Target> targets(Room room, List<RoomTenancyService.Tenancy> leases, YearMonth month, LocalDate today) {
        var result = new ArrayList<Target>();
        var first = month.atDay(1);
        var last = month.atEndOfMonth();
        boolean preview = month.isAfter(YearMonth.from(today));
        var inMonth = leases.stream().filter(lease -> !lease.startDate().isAfter(last)
                && (lease.closedDate() == null || !lease.closedDate().isBefore(first))).toList();
        for (var lease : inMonth) {
            var closed = lease.closedDate();
            var from = later(first, lease.startDate());
            var until = closed == null ? last : earlier(last, closed);
            var limit = preview ? until : earlier(until, today);
            boolean overlapping = inMonth.stream().anyMatch(other -> other != lease && overlaps(lease, other, from, until));
            String issue = overlapping ? "Các đợt thuê bị chồng ngày. Kiểm tra lại hồ sơ phòng."
                    : limit.isBefore(from) ? "Đợt thuê chưa bắt đầu." : null;
            Long tenancyId = lease.key().startsWith("t-") ? Long.valueOf(lease.key().substring(2)) : null;
            result.add(new Target(room, lease, tenancyId, from, until, limit, closed != null && closed.equals(until), issue));
        }
        if ("OCCUPIED".equals(room.getStatus()) && leases.stream().noneMatch(lease -> lease.closedDate() == null)
                && (room.getLeaseStartDate() == null ? YearMonth.from(today).equals(month) : !room.getLeaseStartDate().isAfter(last))) {
            result.add(new Target(room, null, null, null, null, null, false, "Bổ sung hồ sơ đợt thuê để ghi chỉ số."));
        }
        return result;
    }

    private boolean overlaps(RoomTenancyService.Tenancy lease, RoomTenancyService.Tenancy other, LocalDate from, LocalDate until) {
        var start = later(from, other.startDate());
        var end = other.closedDate() == null ? until : earlier(until, other.closedDate());
        if (!start.equals(end)) return start.isBefore(end);
        return !Objects.equals(lease.closedDate(), other.startDate()) && !Objects.equals(other.closedDate(), lease.startDate());
    }

    private Ledger ledger(Scope scope) {
        var currentMonth = YearMonth.from(scope.today());
        return new Ledger(scope.month().toString(), currentMonth.toString(),
                !scope.month().isAfter(currentMonth) && editable(scope.property()),
                scope.targets().stream().map(target -> row(scope, target)).toList());
    }

    private Row row(Scope scope, Target target) {
        var room = target.room();
        var lease = target.lease();
        if (lease == null) return new Row(room.getRoomId(), room.getRoomNumber(), room.getFloor(), null, null,
                null, null, null, false, target.issue(), null, null, null, 0, List.of(), null, null, null, null);
        var stored = stored(scope, target);
        var prior = previous(scope, room.getRoomId(), target.tenancyId(), target.from(), stored);
        var contract = scope.contractById().get(lease.contractId());
        var config = contract == null ? null : json.readValue(contract.getDetailsJson(), RentalContractRequest.class);
        var name = lease.occupants().stream().filter(RoomTenancyService.Occupant::primaryTenant)
                .map(RoomTenancyService.Occupant::name).findFirst().orElse(null);
        var stays = lease.occupants().stream().map(person -> new Stay(person.joinedOn(), person.leftOn())).toList();
        var mode = waterMode(config);
        return new Row(room.getRoomId(), room.getRoomNumber(), room.getFloor(), lease.key(), name,
                target.from(), target.until(), target.limit(), target.handover(), target.issue(), prior == null ? null : prior.getReadOn(),
                prior == null ? null : prior.getElectricityEnd(), prior == null ? null : prior.getWaterEnd(),
                occupants(target, target.limit()), stays,
                config == null || config.electricityPrice() == null ? room.getRoomType().getElectricityPrice() : config.electricityPrice(),
                config == null || config.waterPrice() == null ? room.getRoomType().getWaterPrice() : config.waterPrice(),
                mode, stored == null ? null : new Saved(stored.getRevision(), stored.getReadOn(), stored.getElectricityStart(),
                        stored.getElectricityEnd(), stored.getElectricityRate(), stored.getElectricityAmount().toPlainString(),
                        stored.getWaterMode(), stored.getWaterStart(), stored.getWaterEnd(),
                        stored.getWaterRate(), stored.getOccupantCount(), stored.getWaterAmount().toPlainString()));
    }

    private RoomUtilityReading stored(Scope scope, Target target) {
        return target.tenancyId() == null ? null : scope.readings().stream()
                .filter(row -> row.getTenancyId().equals(target.tenancyId()) && row.getBillingMonth().equals(scope.month().atDay(1)))
                .findFirst().orElse(null);
    }

    private RoomUtilityReading previous(Scope scope, Integer roomId, Long tenancyId, LocalDate from, RoomUtilityReading current) {
        return scope.readings().stream().filter(row -> row != current && row.getRoomId().equals(roomId))
                .filter(row -> {
                    boolean sameLease = row.getTenancyId().equals(tenancyId);
                    var readOn = row.getReadOn();
                    return sameLease ? readOn.isBefore(from) :
                            readOn.equals(scope.closedDates().get(row.getTenancyId())) &&
                                    (readOn.equals(from) || readOn.equals(from.minusDays(1))) &&
                                    (row.getPeriodStart().isBefore(from) || tenancyId == null || row.getTenancyId() < tenancyId);
                })
                .max(Comparator.comparing(RoomUtilityReading::getReadOn).thenComparing(RoomUtilityReading::getTenancyId)).orElse(null);
    }

    private void validateContinuity(Scope scope, List<RoomUtilityReading> changes, Map<Integer, String> labels,
                                    Map<RoomUtilityReading, Baseline> dependencies) {
        for (var row : scope.readings()) {
            var label = labels.get(row.getRoomId());
            if (label == null) continue;
            var prior = previous(scope, row.getRoomId(), row.getTenancyId(), row.getPeriodStart(), row);
            if (prior == null || !changes.contains(row) && !changes.contains(prior)) continue;
            var original = dependencies.get(row);
            boolean unchanged = original != null && original.prior() == prior;
            boolean electricityMatches = sameReading(row.getElectricityStart(), prior.getElectricityEnd()) ||
                    unchanged && sameReading(row.getElectricityStart(), original.electricityStart()) &&
                            sameReading(prior.getElectricityEnd(), original.electricityEnd());
            boolean waterMatches = row.getWaterStart() == null || prior.getWaterEnd() == null ||
                    sameReading(row.getWaterStart(), prior.getWaterEnd()) ||
                    unchanged && sameReading(row.getWaterStart(), original.waterStart()) && sameReading(prior.getWaterEnd(), original.waterEnd());
            if (!electricityMatches || !waterMatches) {
                throw invalid(label, "Chỉ số đầu phải khớp chỉ số đã chốt ở mốc liền trước. Kiểm tra các kỳ hoặc đợt thuê liên quan.");
            }
        }
    }

    private boolean sameReading(BigDecimal first, BigDecimal second) {
        return first != null && second != null && first.compareTo(second) == 0;
    }

    private void fill(RoomUtilityReading row, Target target, RoomUtilityRequest.Entry entry) {
        var number = target.room().getRoomNumber();
        if (entry.readOn().isBefore(target.from()) || entry.readOn().isAfter(target.limit())) {
            throw invalid(number, "Ngày ghi chỉ số phải nằm trong kỳ đang ghi.");
        }
        row.setPeriodStart(target.from());
        row.setReadOn(entry.readOn());
        row.setElectricityStart(entry.electricityStart());
        row.setElectricityEnd(entry.electricityEnd());
        row.setElectricityRate(entry.electricityRate());
        row.setElectricityAmount(amount(usage(entry.electricityStart(), entry.electricityEnd(), number, "điện"), entry.electricityRate()));
        row.setWaterMode(entry.waterMode());
        row.setWaterRate(entry.waterRate());
        boolean meter = entry.waterMode() == WaterMode.METER;
        row.setWaterStart(meter ? entry.waterStart() : null);
        row.setWaterEnd(meter ? entry.waterEnd() : null);
        row.setOccupantCount(entry.waterMode() == WaterMode.PER_PERSON
                ? Objects.requireNonNullElseGet(entry.occupantCount(), () -> occupants(target, entry.readOn())) : null);
        var waterQuantity = switch (entry.waterMode()) {
            case METER -> usage(entry.waterStart(), entry.waterEnd(), number, "nước");
            case PER_PERSON -> BigDecimal.valueOf(row.getOccupantCount());
            case FIXED -> BigDecimal.ONE;
        };
        row.setWaterAmount(amount(waterQuantity, entry.waterRate()));
    }

    private int occupants(Target target, LocalDate until) {
        return (int) target.lease().occupants().stream()
                .filter(person -> !person.joinedOn().isAfter(until) && (person.leftOn() == null || !person.leftOn().isBefore(target.from())))
                .count();
    }

    private BigDecimal usage(BigDecimal start, BigDecimal end, String room, String meter) {
        if (start == null || end == null) throw invalid(room, "Nhập đủ chỉ số đầu và cuối của đồng hồ " + meter + ".");
        if (end.compareTo(start) < 0) throw invalid(room, "Chỉ số " + meter + " mới nhỏ hơn chỉ số đầu kỳ.");
        return end.subtract(start);
    }

    private BigDecimal amount(BigDecimal quantity, BigDecimal rate) {
        return quantity.multiply(rate).setScale(0, RoundingMode.HALF_UP);
    }

    private WaterMode waterMode(RentalContractRequest contract) {
        if (contract == null || contract.waterUnit() == null) return WaterMode.METER;
        return switch (contract.waterUnit().strip().toLowerCase(Locale.ROOT)) {
            case "người", "người/tháng" -> WaterMode.PER_PERSON;
            case "tháng", "phòng", "phòng/tháng", "cố định" -> WaterMode.FIXED;
            default -> WaterMode.METER;
        };
    }

    private boolean editable(Property property) {
        return "ACTIVE".equals(property.getStatus()) &&
                (property.getRegistration() == null || property.getRegistration().getStatus() == RegistrationStatus.APPROVED);
    }

    private YearMonth month(String value) {
        try {
            var month = YearMonth.parse(value);
            if (month.getYear() >= 1900 && month.getYear() <= 9998) return month;
        } catch (DateTimeParseException ignored) {
            // Return the same validation error for malformed and out-of-range months.
        }
        throw new BadRequestException("Chọn một tháng hợp lệ từ năm 1900 đến năm 9998.");
    }

    private LocalDate earlier(LocalDate first, LocalDate second) { return first.isBefore(second) ? first : second; }
    private LocalDate later(LocalDate first, LocalDate second) { return first.isAfter(second) ? first : second; }
    private BadRequestException invalid(String room, String reason) { return new BadRequestException("Phòng " + room + " · " + reason); }
}
