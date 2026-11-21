package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractRequest;
import org.hlrcs.dto.request.RoomBillingRequest;
import org.hlrcs.entity.RoomBill;
import org.hlrcs.entity.RoomBill.Kind;
import org.hlrcs.entity.RoomBillPayment;
import org.hlrcs.entity.RoomTenancy;
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
import java.time.*;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomBillingService {
    private static final Pattern CYCLE = Pattern.compile("(?:mỗi\\s+)?([1-9]|1[0-2])\\s*tháng(?:\\s*(?:/\\s*lần|một lần|1 lần|lần))?\\.?");
    private final AuthService auth;
    private final UserRepository users;
    private final RoomTenancyRepository tenancies;
    private final RoomBillRepository bills;
    private final RoomBillPaymentRepository payments;
    private final RoomUtilityService utilities;
    private final RoomTenancyService tenancyService;
    private final ObjectMapper json;

    public record Schedule(int cycleMonths, int dueDay, LocalDate firstDueDate) {}
    public record ProposedRent(LocalDate from, LocalDate through, String amount) {}
    public record UtilityCharge(LocalDate readOn, String electricityAmount, String waterAmount,
                                BigDecimal electricityStart, BigDecimal electricityEnd, BigDecimal electricityRate,
                                String waterMode, BigDecimal waterStart, BigDecimal waterEnd, BigDecimal waterRate,
                                Integer occupantCount) {}
    public record Candidate(Integer roomId, String roomNumber, String tenantName, String floor, String tenancyKey,
                            LocalDate startDate, boolean ended, String issue, Schedule schedule, boolean scheduleLocked,
                            ProposedRent rent, LocalDate dueDate, LocalDate utilityDueDate, UtilityCharge utilities,
                            List<RoomBillingRequest.Charge> suggestedCharges,
                            Long mainBillId, boolean mainIssued, Long utilityBillId, boolean utilitiesAlreadyBilled) {}
    public record Ledger(String month, LocalDate today, List<Candidate> candidates, List<Bill> bills, List<Bill> earlierDebt) {}
    public record Bill(Long id, Long revision, Integer propertyId, Integer roomId, String tenancyKey, String roomNumber,
                       String tenantName, String month, Kind kind, LocalDate dueDate, Instant issuedAt, String status,
                       boolean overdue, LocalDate rentFrom, LocalDate rentThrough, String rentAmount,
                       boolean includesUtilities, String electricityAmount, String waterAmount,
                       List<RoomBillingRequest.Charge> charges, String totalAmount, String paidAmount, String outstanding) {}
    public record Payment(Long id, LocalDate paidOn, String amount, RoomBillPayment.Method method, String note) {}
    public record Detail(Bill bill, List<Payment> payments) {}
    private record Rent(LocalDate from, LocalDate through, BigDecimal amount) {}

    @Transactional(readOnly = true)
    public Ledger list(Integer propertyId, String value) {
        return ledger(propertyId, month(value), auth.getCurrentUser().getUserId());
    }

    @Transactional(readOnly = true)
    public Detail detail(Long id) {
        return detail(owned(id, auth.getCurrentUser().getUserId()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Ledger setSchedule(RoomBillingRequest.Schedule request) {
        var owner = lockOwner();
        var period = request.period();
        var month = month(period.month());
        var source = source(period, month, owner);
        var tenancy = materialize(source);
        validDate(request.firstDueDate());
        if (scheduleLocked(tenancy.getId())) throw conflict("Chu kỳ đã được sử dụng trên phiếu phát hành.");
        setSchedule(tenancy, new Schedule(request.cycleMonths(), request.dueDay(), request.firstDueDate()));
        return ledger(period.propertyId(), month, owner);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Bill draft(RoomBillingRequest.Draft request) {
        var owner = lockOwner();
        var period = request.period();
        var month = month(period.month());
        var source = source(period, month, owner);
        var tenancy = materialize(source);
        validDate(request.dueDate());
        var plan = schedule(tenancy, terms(source), source.lease().startDate());
        var rent = rent(source, plan, month);
        var bill = bills.findByTenancyIdAndBillingMonthAndKind(tenancy.getId(), month.atDay(1), request.kind()).orElse(null);
        if (bill != null && bill.getIssuedAt() != null) throw conflict("Phiếu đã phát hành.");
        if (!Objects.equals(bill == null ? null : bill.getRevision(), request.revision())) {
            throw conflict("Bản nháp vừa được thay đổi. Tải lại dữ liệu để kiểm tra.");
        }
        if (request.kind() == Kind.UTILITIES) {
            var main = bills.findByTenancyIdAndBillingMonthAndKind(tenancy.getId(), month.atDay(1), Kind.MAIN).orElse(null);
            if (main == null || main.getIssuedAt() == null || main.getUtilityReadingId() != null ||
                    !request.includeUtilities() || request.rentAmount().signum() != 0 || !request.charges().isEmpty()) {
                throw new BadRequestException("Phiếu điện nước bổ sung chỉ dùng khi phiếu chính đã phát hành trước lúc chốt điện nước.");
            }
        }
        if (request.rentAmount().signum() > 0 && (rent == null || request.kind() != Kind.MAIN)) {
            throw new BadRequestException("Kỳ này chưa đến lượt thu tiền phòng theo chu kỳ đã chọn.");
        }
        var reading = request.includeUtilities() ? source.finalReading() : null;
        if (request.includeUtilities() && reading == null) {
            throw new BadRequestException("Điện nước của đợt thuê chưa được lưu và chốt.");
        }
        if (bill == null) {
            bill = new RoomBill();
            bill.setOwnerId(owner);
            bill.setPropertyId(period.propertyId());
            bill.setRoomId(period.roomId());
            bill.setTenancyId(tenancy.getId());
            bill.setRoomNumber(source.room().getRoomNumber());
            bill.setTenantName(tenantName(source));
            bill.setBillingMonth(month.atDay(1));
            bill.setKind(request.kind());
        }
        bill.setDueDate(request.dueDate());
        bill.setRentFrom(rent == null || request.rentAmount().signum() == 0 ? null : rent.from());
        bill.setRentThrough(rent == null || request.rentAmount().signum() == 0 ? null : rent.through());
        bill.setRentAmount(request.rentAmount());
        bill.setUtilityReadingId(reading == null ? null : reading.getId());
        bill.setUtilityRevision(reading == null ? null : reading.getRevision());
        bill.setElectricityAmount(reading == null ? BigDecimal.ZERO : reading.getElectricityAmount());
        bill.setWaterAmount(reading == null ? BigDecimal.ZERO : reading.getWaterAmount());
        var charges = request.charges().stream().map(charge -> new RoomBillingRequest.Charge(charge.label().trim(), charge.amount())).toList();
        bill.setChargesJson(json.writeValueAsString(charges));
        var extras = charges.stream().map(RoomBillingRequest.Charge::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        bill.setTotalAmount(bill.getRentAmount().add(bill.getElectricityAmount()).add(bill.getWaterAmount()).add(extras));
        if (bill.getTotalAmount().signum() <= 0) throw new BadRequestException("Phiếu cần có ít nhất một khoản phải thu lớn hơn 0.");
        return view(bills.saveAndFlush(bill), RoomTenancyService.today());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Bill issue(Long id, RoomBillingRequest.Issue request) {
        var owner = lockOwner();
        var bill = owned(id, owner);
        if (bill.getIssuedAt() != null) return view(bill, RoomTenancyService.today());
        if (!bill.getRevision().equals(request.revision())) throw conflict("Bản nháp đã thay đổi. Vui lòng kiểm tra lại.");
        var month = YearMonth.from(bill.getBillingMonth());
        var key = "t-" + bill.getTenancyId();
        var source = source(new RoomBillingRequest.Period(bill.getPropertyId(), bill.getRoomId(), key, month.toString()), month, owner);
        var tenancy = materialize(source);
        var plan = schedule(tenancy, terms(source), source.lease().startDate());
        if (bill.getKind() == Kind.MAIN && plan == null && source.lease().monthlyRent() != null && source.lease().monthlyRent().signum() > 0) {
            throw new BadRequestException("Thiết lập chu kỳ tiền phòng cho đợt thuê trước khi phát hành phiếu chính.");
        }
        if (bill.getRentAmount().signum() > 0) {
            var rent = rent(source, plan, month);
            if (rent == null || !rent.from().equals(bill.getRentFrom()) || !rent.through().equals(bill.getRentThrough())) {
                throw conflict("Kỳ tiền phòng đã thay đổi. Hãy kiểm tra và lưu lại bản nháp.");
            }
            if (bills.existsByTenancyIdAndIssuedAtIsNotNullAndRentAmountGreaterThanAndRentFromLessThanEqualAndRentThroughGreaterThanEqual(
                    tenancy.getId(), BigDecimal.ZERO, rent.through(), rent.from())) {
                throw conflict("Khoảng tiền phòng này đã được ghi trên một phiếu phát hành.");
            }
            setSchedule(tenancy, plan);
        }
        if (bill.getUtilityReadingId() != null) {
            var reading = source.finalReading();
            if (reading == null || !reading.getId().equals(bill.getUtilityReadingId()) ||
                    !reading.getRevision().equals(bill.getUtilityRevision())) {
                throw conflict("Chỉ số điện nước đã thay đổi. Hãy kiểm tra và lưu lại bản nháp để cập nhật số tiền.");
            }
        }
        bill.setIssuedAt(Instant.now());
        bills.flush();
        return view(bill, RoomTenancyService.today());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail pay(Long id, RoomBillingRequest.Payment request) {
        var bill = owned(id, lockOwner());
        if (bill.getIssuedAt() == null) throw conflict("Phát hành phiếu trước khi ghi nhận thanh toán.");
        var note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        var existing = payments.findByBillIdAndRequestKey(id, request.requestKey()).orElse(null);
        if (existing != null) {
            if (existing.getAmount().compareTo(request.amount()) != 0 || !existing.getPaidOn().equals(request.paidOn()) ||
                    existing.getMethod() != request.method() || !Objects.equals(existing.getNote(), note)) {
                throw conflict("Lần ghi nhận này đã được lưu với thông tin khác. Kiểm tra lịch sử thanh toán.");
            }
            return detail(bill);
        }
        validDate(request.paidOn());
        if (request.paidOn().isAfter(RoomTenancyService.today())) throw new BadRequestException("Ngày thu tiền không thể ở tương lai.");
        if (request.amount().compareTo(outstanding(bill)) > 0) throw new BadRequestException("Số tiền thu vượt quá số tiền còn thiếu của phiếu.");
        var payment = new RoomBillPayment();
        payment.setBillId(id);
        payment.setRequestKey(request.requestKey());
        payment.setAmount(request.amount());
        payment.setPaidOn(request.paidOn());
        payment.setMethod(request.method());
        payment.setNote(note);
        payment.setRecordedAt(Instant.now());
        payments.save(payment);
        bill.setPaidAmount(bill.getPaidAmount().add(request.amount()));
        bills.flush();
        return detail(bill);
    }

    private Ledger ledger(Integer propertyId, YearMonth month, Integer owner) {
        var periods = utilities.billingPeriods(propertyId, month, owner);
        var byTenancy = tenancies.findAllById(periods.stream().map(RoomUtilityService.BillingPeriod::tenancyId)
                .filter(Objects::nonNull).distinct().toList()).stream().collect(Collectors.toMap(RoomTenancy::getId, Function.identity()));
        var stored = bills.findByOwnerIdAndPropertyIdAndBillingMonthOrderByRoomNumberAscIdDesc(owner, propertyId, month.atDay(1));
        var byPeriod = stored.stream().collect(Collectors.groupingBy(RoomBill::getTenancyId, Collectors.toMap(RoomBill::getKind, Function.identity())));
        var earlier = bills.findEarlierDebt(owner, propertyId, month.atDay(1));
        var locked = byTenancy.isEmpty() ? Set.<Long>of() : new HashSet<>(bills.findLockedScheduleIds(byTenancy.keySet()));
        var today = RoomTenancyService.today();
        var candidates = periods.stream().map(period -> {
            var tenancy = byTenancy.get(period.tenancyId());
            var terms = terms(period);
            var plan = schedule(tenancy, terms, period.lease().startDate());
            var rent = rent(period, plan, month);
            var matches = period.tenancyId() == null ? Map.<Kind, RoomBill>of() : byPeriod.getOrDefault(period.tenancyId(), Map.of());
            var main = matches.get(Kind.MAIN);
            var supplemental = matches.get(Kind.UTILITIES);
            var reading = period.finalReading();
            var lease = period.lease();
            var utility = reading == null ? null : new UtilityCharge(
                    reading.getReadOn(), amount(reading.getElectricityAmount()), amount(reading.getWaterAmount()),
                    reading.getElectricityStart(), reading.getElectricityEnd(), reading.getElectricityRate(),
                    reading.getWaterMode() == null ? null : reading.getWaterMode().name(),
                    reading.getWaterStart(), reading.getWaterEnd(), reading.getWaterRate(), reading.getOccupantCount());
            return new Candidate(period.room().getRoomId(), period.room().getRoomNumber(), tenantName(period), period.room().getFloor(),
                    lease.key(), lease.startDate(), lease.closedDate() != null, period.issue(), plan,
                    period.tenancyId() != null && locked.contains(period.tenancyId()),
                    rent == null ? null : new ProposedRent(rent.from(), rent.through(), amount(rent.amount())),
                    defaultDue(month, plan, lease.startDate(), rent != null), defaultDue(month, plan, lease.startDate(), false),
                    utility, charges(period, terms),
                    main == null ? null : main.getId(), main != null && main.getIssuedAt() != null,
                    supplemental == null ? null : supplemental.getId(),
                    main != null && main.getUtilityReadingId() != null || supplemental != null && supplemental.getUtilityReadingId() != null);
        }).toList();
        return new Ledger(month.toString(), today, candidates, stored.stream().map(bill -> view(bill, today)).toList(),
                earlier.stream().map(bill -> view(bill, today)).toList());
    }

    private RoomUtilityService.BillingPeriod source(RoomBillingRequest.Period period, YearMonth month, Integer owner) {
        var source = utilities.billingPeriods(period.propertyId(), month, owner).stream()
                .filter(item -> item.room().getRoomId().equals(period.roomId()) && item.lease().key().equals(period.tenancyKey()))
                .findFirst().orElseThrow(() -> conflict("Đợt thuê đã thay đổi. Vui lòng tải lại danh sách."));
        if (source.issue() != null) throw new BadRequestException(source.issue());
        return source;
    }

    private RoomTenancy materialize(RoomUtilityService.BillingPeriod source) {
        return source.tenancyId() == null ? tenancyService.importContract(source.room(), source.contract())
                : tenancies.findById(source.tenancyId()).orElseThrow();
    }

    private RentalContractRequest terms(RoomUtilityService.BillingPeriod source) {
        return source.contract() == null ? null : json.readValue(source.contract().getDetailsJson(), RentalContractRequest.class);
    }

    private List<RoomBillingRequest.Charge> charges(RoomUtilityService.BillingPeriod source, RentalContractRequest terms) {
        var type = source.room().getRoomType();
        var internet = currency(terms == null || terms.internetPrice() == null ? type.getInternetPrice() : terms.internetPrice());
        var service = currency(terms == null || terms.servicePrice() == null ? type.getServicePrice() : terms.servicePrice());
        var charges = new ArrayList<RoomBillingRequest.Charge>();
        if (internet.signum() > 0) charges.add(new RoomBillingRequest.Charge("Internet", internet));
        if (service.signum() > 0) charges.add(new RoomBillingRequest.Charge("Phí dịch vụ", service));
        return charges;
    }

    private Schedule schedule(RoomTenancy tenancy, RentalContractRequest details, LocalDate start) {
        if (tenancy != null && tenancy.getRentCycleMonths() != null) {
            return new Schedule(tenancy.getRentCycleMonths(), tenancy.getRentDueDay(), tenancy.getFirstRentDueDate());
        }
        if (details == null) return null;
        var cycle = cycle(details.paymentCycle());
        var day = details.paymentDay();
        if (cycle == null || day == null || day < 1 || day > 31) return null;
        var first = due(YearMonth.from(start), day);
        if (first.isBefore(start)) first = start;
        if (details.firstPaymentDate() != null && !details.firstPaymentDate().isBlank()) {
            try {
                first = LocalDate.parse(details.firstPaymentDate());
            } catch (DateTimeParseException ignored) {
                return null;
            }
            if (first.getYear() < 1900 || first.getYear() > 9998) return null;
        }
        return new Schedule(cycle, day, first);
    }

    static Integer cycle(String value) {
        if (value == null || value.isBlank()) return 1;
        var text = value.strip().toLowerCase(Locale.ROOT);
        if (Set.of("hàng tháng", "hằng tháng", "mỗi tháng", "theo tháng").contains(text)) return 1;
        var matcher = CYCLE.matcher(text);
        return matcher.matches() ? Integer.valueOf(matcher.group(1)) : null;
    }

    private boolean scheduleLocked(Long tenancyId) {
        return tenancyId != null && bills.existsByTenancyIdAndIssuedAtIsNotNullAndRentAmountGreaterThan(tenancyId, BigDecimal.ZERO);
    }

    private void setSchedule(RoomTenancy tenancy, Schedule plan) {
        tenancy.setRentCycleMonths(plan.cycleMonths());
        tenancy.setRentDueDay(plan.dueDay());
        tenancy.setFirstRentDueDate(plan.firstDueDate());
    }

    private Rent rent(RoomUtilityService.BillingPeriod period, Schedule plan, YearMonth month) {
        if (plan == null) return null;
        var lease = period.lease();
        long offset = ChronoUnit.MONTHS.between(YearMonth.from(lease.startDate()), month);
        if (offset < 0 || offset % plan.cycleMonths() != 0) return null;
        var from = lease.startDate().plusMonths(offset);
        var last = lease.closedDate() == null || lease.closedDate().isAfter(lease.endDate()) ? lease.endDate() : lease.closedDate();
        if (last.isBefore(from)) return null;
        var limit = lease.startDate().plusMonths(offset + plan.cycleMonths()).minusDays(1);
        var through = limit.isAfter(last) ? last : limit;
        long months = 0;
        while (months < plan.cycleMonths() && !lease.startDate().plusMonths(offset + months).isAfter(through)) months++;
        var price = currency(lease.monthlyRent());
        return new Rent(from, through, price.multiply(BigDecimal.valueOf(months)));
    }

    private LocalDate defaultDue(YearMonth month, Schedule plan, LocalDate start, boolean rentDue) {
        if (!rentDue || plan == null) return due(month.plusMonths(1), plan == null ? 5 : plan.dueDay());
        var offset = ChronoUnit.MONTHS.between(YearMonth.from(start), month);
        return offset == 0 ? plan.firstDueDate() : due(YearMonth.from(plan.firstDueDate()).plusMonths(offset), plan.dueDay());
    }

    private LocalDate due(YearMonth month, int day) {
        return month.atDay(Math.min(day, month.lengthOfMonth()));
    }

    private Bill view(RoomBill bill, LocalDate today) {
        var open = outstanding(bill);
        var status = bill.getIssuedAt() == null ? "DRAFT" : open.signum() == 0 ? "PAID" :
                bill.getPaidAmount().signum() == 0 ? "UNPAID" : "PARTIAL";
        return new Bill(bill.getId(), bill.getRevision(), bill.getPropertyId(), bill.getRoomId(), "t-" + bill.getTenancyId(),
                bill.getRoomNumber(), bill.getTenantName(), YearMonth.from(bill.getBillingMonth()).toString(), bill.getKind(),
                bill.getDueDate(), bill.getIssuedAt(), status,
                bill.getIssuedAt() != null && open.signum() > 0 && bill.getDueDate().isBefore(today),
                bill.getRentFrom(), bill.getRentThrough(), amount(bill.getRentAmount()), bill.getUtilityReadingId() != null,
                amount(bill.getElectricityAmount()), amount(bill.getWaterAmount()),
                Arrays.asList(json.readValue(bill.getChargesJson(), RoomBillingRequest.Charge[].class)),
                amount(bill.getTotalAmount()), amount(bill.getPaidAmount()), amount(open));
    }

    private Detail detail(RoomBill bill) {
        var history = payments.findByBillIdOrderByPaidOnDescIdDesc(bill.getId()).stream()
                .map(value -> new Payment(value.getId(), value.getPaidOn(), amount(value.getAmount()), value.getMethod(), value.getNote())).toList();
        return new Detail(view(bill, RoomTenancyService.today()), history);
    }

    private String tenantName(RoomUtilityService.BillingPeriod period) {
        return period.lease().occupants().stream().filter(RoomTenancyService.Occupant::primaryTenant)
                .map(RoomTenancyService.Occupant::name).findFirst().orElse("Người thuê");
    }

    private RoomBill owned(Long id, Integer owner) {
        return bills.findByIdAndOwnerId(id, owner).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu thu của bạn."));
    }

    private Integer lockOwner() {
        var owner = auth.getCurrentUser().getUserId();
        users.findForRegistrationUpdate(owner).orElseThrow();
        return owner;
    }

    private YearMonth month(String value) {
        try {
            var parsed = YearMonth.parse(value);
            if (parsed.getYear() >= 1900 && !parsed.isAfter(YearMonth.from(RoomTenancyService.today()))) return parsed;
        } catch (DateTimeParseException ignored) {
            // A malformed value uses the same validation message as a future month.
        }
        throw new BadRequestException("Chọn tháng ghi hợp lệ, từ năm 1900 đến tháng hiện tại.");
    }

    private void validDate(LocalDate date) {
        if (date.getYear() < 1900 || date.getYear() > 9998) throw new BadRequestException("Ngày đã nhập nằm ngoài khoảng hỗ trợ.");
    }

    private AppException conflict(String message) { return new AppException(message, HttpStatus.CONFLICT); }
    private BigDecimal outstanding(RoomBill bill) { return bill.getTotalAmount().subtract(bill.getPaidAmount()); }
    private BigDecimal currency(BigDecimal value) { return value == null ? BigDecimal.ZERO : value.setScale(0, RoundingMode.HALF_UP); }
    private String amount(BigDecimal value) { return value.toPlainString(); }
}
