-- Run after Hibernate has added the nullable outcome and response_requested columns.
-- Back up first. The application also reads legacy rows without this backfill.
UPDATE service_complaints
SET outcome = CASE status WHEN 'DISMISSED' THEN 'DISMISS' WHEN 'REMOVED' THEN 'REMOVE' ELSE outcome END,
    response_requested = CASE WHEN status = 'NEEDS_EXPLANATION' THEN TRUE WHEN status = 'PENDING' THEN COALESCE(response_requested, FALSE) ELSE FALSE END,
    status = CASE WHEN status IN ('DISMISSED', 'REMOVED') THEN 'RESOLVED' ELSE 'PENDING' END
WHERE status IN ('PENDING', 'NEEDS_EXPLANATION', 'EXPLAINED', 'DISMISSED', 'REMOVED');
