SERVICE COMPLAINT UML — REVISED
Source review date: 2026-11-25

Open service-complaint-complete.drawio in diagrams.net. It contains seven editable pages:
01 Submit Service Complaint
02 Review Service Complaint
03 Respond to Staff Request
04 Controller & Service
05 Repositories
06 Request & Response DTOs
07 Entities & Relationships

Each page is also supplied as an individual .drawio, .svg and .png file.
Two smaller bundles contain only the sequence pages or only the class pages.
This revised set supersedes the earlier diagrams outside this directory.

SCOPE AND CONVENTIONS
The scope is the implemented service complaint workflow, not the entire application.
Sequence diagrams describe application-level interactions; persistence calls are grouped
behind a conceptual persistence facade (not an additional implemented Java class).
Some labels summarize several source statements. Execution-duration bars are omitted.
The break fragment exits the interaction on rejection; success continues only otherwise.
Dashed open arrows denote replies; solid arrows denote calls. alt guards are exclusive.
Validation failures are consolidated for readability. Bean Validation can reject input
before the service call; security can reject before the controller. Image upload size
limits may also return 413; unexpected infrastructure errors are not expanded.
Opening details assumes successful authorization; rejected reads do not show private data.
UI participant names identify the corresponding React components, not Java classes.

Class pages include the declared complaint controller/service fields and operations,
the complaint repositories, nested request/response records, ApiResponse, FileContent,
complaint entities, image value object and moderation log. Generated constructors,
Lombok accessors and record-generated members are omitted. Inherited JpaRepository
operations are represented through interface generalization, not repeated.
User and Service intentionally show only complaint-related members and are marked partial.
Shared AuthService, ServicePublicationService, EntityManager and shared repository internals
are external to this module view; the service's typed references identify dependencies.
Association attributes and their drawn relationships describe the same references.
Multiplicities refer to relationship ends; unspecified reverse multiplicities are omitted.
Image composition models persisted value ownership within this complaint workflow.
Other modules also use ServiceImage; those collections are outside this view.
Nullable String/Boolean values retain their actual Java types; notably outcome may be null,
and a null responseRequested supports legacy status compatibility.
Status, outcome and action are Strings in source, not invented enum classes.

WORKFLOW RULES
Authenticated non-owners can report a public eligible service. One open report per
reporter/service is allowed. Content is validated after trimming, with 10–3000 characters.
At most five JPG/PNG/WEBP images, at most 5 MB each, are accepted per evidence submission.
Active STAFF/ADMIN may review, excluding the reporter and the service provider.
REQUEST_EXPLANATION asks the provider for a response; it keeps PENDING and sets the flag.
The provider responds to STAFF, not to the reporter. EXPLAINED clears the request flag
and keeps PENDING. The workflow has no automatic removal deadline for unanswered requests.
DISMISS sets RESOLVED/DISMISS and leaves the publication state unchanged.
REMOVE sets RESOLVED/REMOVE, hides the service and increments its revision.
Final decisions cannot be reviewed again through these operations.
Each review or provider response adds history/audit and increments complaint revision.
Stale revisions and incompatible workflow state return conflicts.

PRIMARY SOURCE FILES (relative to repository root)
src/main/java/org/hlrcs/controller/ServiceComplaintController.java
src/main/java/org/hlrcs/service/ServiceComplaintService.java
src/main/java/org/hlrcs/service/ServiceFeedbackImages.java
src/main/java/org/hlrcs/service/StaffService.java (FileContent record)
src/main/java/org/hlrcs/repository/ServiceComplaintRepository.java
src/main/java/org/hlrcs/repository/ServiceComplaintEventRepository.java
src/main/java/org/hlrcs/entity/ServiceComplaint.java
src/main/java/org/hlrcs/entity/ServiceComplaintEvent.java
src/main/java/org/hlrcs/entity/ServiceImage.java
src/main/java/org/hlrcs/entity/ModerationLog.java
src/main/java/org/hlrcs/entity/Service.java
src/main/java/org/hlrcs/entity/User.java
src/main/java/org/hlrcs/dto/response/ApiResponse.java
src/main/java/org/hlrcs/exception/GlobalExceptionHandler.java

VERIFICATION
The diagrams were compared with the local implementation, rendered to PNG for visual
inspection, and checked for parseable XML and valid draw.io cell references.
No application behavior is changed by this documentation-only revision.
