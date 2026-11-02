package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

/** One database row serializes automatic selection across application instances. */
@Entity @Table(name = "verification_assignment_queue")
@Getter @Setter @NoArgsConstructor
public class VerificationAssignmentQueue {
    @Id private Integer id;
    public VerificationAssignmentQueue(Integer id) { this.id = id; }
}
