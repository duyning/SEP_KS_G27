package org.hlrcs.configuration;

import org.hlrcs.entity.Capability;
import org.hlrcs.entity.User;
import org.hlrcs.entity.UserCapability;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.repository.CapabilityRepository;
import org.hlrcs.repository.UserCapabilityRepository;
import org.hlrcs.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(UserRepository userRepository,
                                      CapabilityRepository capabilityRepository,
                                      UserCapabilityRepository userCapabilityRepository,
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Khởi tạo danh sách Capabilities nếu chưa có
            List<String[]> defaultCaps = List.of(
                    new String[]{"Quản lý bài đăng", "MANAGE_POST"},
                    new String[]{"Quản lý phòng trọ", "MANAGE_ROOM"},
                    new String[]{"Cung cấp dịch vụ", "MANAGE_SERVICE"},
                    new String[]{"Hỗ trợ kỹ thuật", "SUPPORT_CHAT"},
                    new String[]{"Kiểm duyệt nội dung", "MODERATE_CONTENT"}
            );

            for (String[] capData : defaultCaps) {
                if (!capabilityRepository.existsByCode(capData[1])) {
                    Capability cap = Capability.builder()
                            .name(capData[0])
                            .code(capData[1])
                            .build();
                    capabilityRepository.save(cap);
                }
            }

            // 2. Khởi tạo tài khoản Quản trị viên (ADMIN) mặc định
            if (!userRepository.existsByEmail("admin@hlrcs.com")) {
                User admin = User.builder()
                        .email("admin@hlrcs.com")
                        .passwordHash(passwordEncoder.encode("admin123"))
                        .fullName("Hệ Thống Quản Trị")
                        .phoneNumber("0987654321")
                        .role(UserRole.ADMIN)
                        .status(UserStatus.ACTIVE)
                        .build();
                User savedAdmin = userRepository.save(admin);

                // Gán quyền kiểm duyệt cho admin
                capabilityRepository.findByCode("MODERATE_CONTENT").ifPresent(cap -> {
                    UserCapability uc = UserCapability.builder()
                            .user(savedAdmin)
                            .capability(cap)
                            .status("ACTIVE")
                            .grantedAt(LocalDateTime.now())
                            .build();
                    userCapabilityRepository.save(uc);
                });
            }

            // 3. Khởi tạo tài khoản Staff mặc định
            if (!userRepository.existsByEmail("staff@hlrcs.com")) {
                User staff = User.builder()
                        .email("staff@hlrcs.com")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .fullName("Nhân Viên Kiểm Duyệt")
                        .phoneNumber("0987654322")
                        .role(UserRole.STAFF)
                        .status(UserStatus.ACTIVE)
                        .build();
                User savedStaff = userRepository.save(staff);

                capabilityRepository.findByCode("MODERATE_CONTENT").ifPresent(cap -> {
                    UserCapability uc = UserCapability.builder()
                            .user(savedStaff)
                            .capability(cap)
                            .status("ACTIVE")
                            .grantedAt(LocalDateTime.now())
                            .build();
                    userCapabilityRepository.save(uc);
                });
            }

            // 4. Khởi tạo tài khoản Room Host mặc định
            if (!userRepository.existsByEmail("host@hlrcs.com")) {
                User host = User.builder()
                        .email("host@hlrcs.com")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .fullName("Chủ Nhà Trọ Mẫu")
                        .phoneNumber("0987654323")
                        .role(UserRole.ROOM_HOST)
                        .status(UserStatus.ACTIVE)
                        .build();
                User savedHost = userRepository.save(host);

                capabilityRepository.findByCode("MANAGE_ROOM").ifPresent(cap -> {
                    UserCapability uc = UserCapability.builder()
                            .user(savedHost)
                            .capability(cap)
                            .status("ACTIVE")
                            .grantedAt(LocalDateTime.now())
                            .build();
                    userCapabilityRepository.save(uc);
                });
            }

            if (!userRepository.existsByEmail("host-new@hlrcs.com")) {
                User newHost = userRepository.save(User.builder()
                        .email("host-new@hlrcs.com")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .fullName("Chủ trọ mới")
                        .role(UserRole.ROOM_HOST)
                        .status(UserStatus.ACTIVE)
                        .build());
                capabilityRepository.findByCode("MANAGE_ROOM").ifPresent(cap ->
                        userCapabilityRepository.save(UserCapability.builder().user(newHost).capability(cap)
                                .status("ACTIVE").grantedAt(LocalDateTime.now()).build()));
            }

            // 5. Khởi tạo tài khoản Người thuê (USER) mặc định
            if (!userRepository.existsByEmail("user@hlrcs.com")) {
                User user = User.builder()
                        .email("user@hlrcs.com")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .fullName("Sinh Viên Mẫu")
                        .phoneNumber("0987654324")
                        .role(UserRole.USER)
                        .status(UserStatus.ACTIVE)
                        .build();
                userRepository.save(user);
            }
        };
    }
}
