package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "service_requests", indexes = {
        @Index(name = "idx_service_request_customer", columnList = "customer_id,request_id"),
        @Index(name = "idx_service_request_service", columnList = "service_id,request_id")})
@Getter @Setter @NoArgsConstructor
public class ServiceRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer requestId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)
    private Service service;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "customer_id", nullable = false)
    private User customer;
    @Column(nullable = false, length = 100) private String contactName;
    @Column(nullable = false, length = 20) private String contactPhone;
    @Column(nullable = false, length = 2000) private String description;
    @Column(length = 500) private String address;
    @Column(nullable = false) private Instant scheduledAt;
    @Column(nullable = false, length = 20) private String status;
    @Column(nullable = false) private Instant createdAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "handled_by")
    private User handledBy;
    private Instant handledAt;
    @Column(length = 2000) private String responseReason;
    @Version private int revision;
}
