package org.hlrcs.service.impl;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hlrcs.dto.request.ChangePasswordRequest;
import org.hlrcs.dto.request.GoogleLoginRequest;
import org.hlrcs.dto.request.LoginRequest;
import org.hlrcs.dto.request.RegisterRequest;
import org.hlrcs.dto.request.UpdateProfileRequest;
import org.hlrcs.dto.response.AuthResponse;
import org.hlrcs.dto.response.UserProfileResponse;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.UserCapabilityRepository;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.security.CustomUserDetails;
import org.hlrcs.security.GoogleTokenVerifier;
import org.hlrcs.security.GoogleUserInfo;
import org.hlrcs.security.JwtTokenProvider;
import org.hlrcs.service.AuthService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserCapabilityRepository userCapabilityRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthServiceImpl(UserRepository userRepository,
                           UserCapabilityRepository userCapabilityRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider,
                           GoogleTokenVerifier googleTokenVerifier) {
        this.userRepository = userRepository;
        this.userCapabilityRepository = userCapabilityRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã được sử dụng: " + request.getEmail());
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
                throw new BadRequestException("Số điện thoại đã được sử dụng: " + request.getPhoneNumber());
            }
        }

        // Mặc định role là USER nếu không chỉ định, chỉ cho phép tự đăng ký USER hoặc ROOM_HOST
        UserRole assignedRole = request.getRole() != null ? request.getRole() : UserRole.USER;
        if (assignedRole == UserRole.ADMIN || assignedRole == UserRole.STAFF) {
            assignedRole = UserRole.USER;
        }

        User user = User.builder()
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null)
                .role(assignedRole)
                .status(UserStatus.ACTIVE)
                .authProvider("LOCAL")
                .build();

        User savedUser = userRepository.save(user);

        String token = tokenProvider.generateTokenFromUser(savedUser);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(savedUser.getUserId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .phoneNumber(savedUser.getPhoneNumber())
                .role(savedUser.getRole())
                .status(savedUser.getStatus())
                .capabilities(List.of())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().trim().toLowerCase(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException("Tài khoản của bạn đã bị vô hiệu hóa.", HttpStatus.FORBIDDEN);
        }

        String token = tokenProvider.generateToken(authentication);

        List<String> capabilities = userDetails.getCapabilities();

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .organization(user.getOrganization())
                .preferredArea(user.getPreferredArea())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .capabilities(capabilities)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserInfo googleUser = googleTokenVerifier.verifyToken(request.idToken());
        User user = userRepository.findByGoogleSubject(googleUser.subject()).orElse(null);

        if (user == null) {
            String email = googleUser.email().trim().toLowerCase(Locale.ROOT);
            if (userRepository.existsByEmail(email)) {
                throw new AppException("Email này đã thuộc một tài khoản HL-RCS. Hãy dùng phương thức đăng nhập ban đầu hoặc liên hệ hỗ trợ.", HttpStatus.CONFLICT);
            }

            String fullName = googleUser.fullName();
            if (fullName == null || fullName.isBlank() || fullName.length() > 255) {
                fullName = email.substring(0, email.indexOf('@'));
            }

            user = User.builder()
                    .email(email)
                    .fullName(fullName.trim())
                    .avatar(googleUser.avatar())
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .authProvider("GOOGLE")
                    .googleSubject(googleUser.subject())
                    .build();
            try {
                user = userRepository.saveAndFlush(user);
            } catch (DataIntegrityViolationException ex) {
                throw new AppException("Không thể tạo tài khoản Google. Vui lòng thử đăng nhập lại.", HttpStatus.CONFLICT);
            }
        } else if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException("Tài khoản của bạn đã bị vô hiệu hóa.", HttpStatus.FORBIDDEN);
        }

        List<String> capabilities = userCapabilityRepository.findByUser_UserIdAndStatus(user.getUserId(), "ACTIVE")
                .stream()
                .filter(uc -> uc.getCapability() != null)
                .map(uc -> uc.getCapability().getCode())
                .collect(Collectors.toList());

        String token = tokenProvider.generateTokenFromUser(user);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .organization(user.getOrganization())
                .preferredArea(user.getPreferredArea())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .capabilities(capabilities)
                .build();
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        SecurityContextHolder.clearContext();

        // Xóa cookie Authorization nếu có
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("Authorization".equals(cookie.getName())) {
                    Cookie expiredCookie = new Cookie("Authorization", null);
                    expiredCookie.setPath("/");
                    expiredCookie.setHttpOnly(true);
                    expiredCookie.setMaxAge(0);
                    response.addCookie(expiredCookie);
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AppException("Người dùng chưa đăng nhập hoặc token không hợp lệ", HttpStatus.UNAUTHORIZED);
        }

        String email;
        if (authentication.getPrincipal() instanceof CustomUserDetails customUserDetails) {
            email = customUserDetails.getUsername();
        } else {
            email = authentication.getName();
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng hiện tại"));
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile() {
        User user = getCurrentUser();

        List<String> capabilities = userCapabilityRepository.findByUser_UserIdAndStatus(user.getUserId(), "ACTIVE")
                .stream()
                .filter(uc -> uc.getCapability() != null)
                .map(uc -> uc.getCapability().getCode())
                .collect(Collectors.toList());

        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .organization(user.getOrganization())
                .preferredArea(user.getPreferredArea())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .capabilities(capabilities)
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            String newPhone = request.getPhoneNumber().trim();
            if (!newPhone.equals(user.getPhoneNumber()) && userRepository.existsByPhoneNumber(newPhone)) {
                throw new BadRequestException("Số điện thoại này đã được sử dụng bởi tài khoản khác: " + newPhone);
            }
            user.setPhoneNumber(newPhone);
        }

        if (request.getOrganization() != null) user.setOrganization(request.getOrganization().trim());
        if (request.getPreferredArea() != null) user.setPreferredArea(request.getPreferredArea().trim());
        if (request.getAvatar() != null) {
            validateAvatar(request.getAvatar());
            user.setAvatar(request.getAvatar());
        }
        User updatedUser = userRepository.save(user);

        List<String> capabilities = userCapabilityRepository.findByUser_UserIdAndStatus(updatedUser.getUserId(), "ACTIVE")
                .stream()
                .filter(uc -> uc.getCapability() != null)
                .map(uc -> uc.getCapability().getCode())
                .collect(Collectors.toList());

        return UserProfileResponse.builder()
                .userId(updatedUser.getUserId())
                .email(updatedUser.getEmail())
                .fullName(updatedUser.getFullName())
                .phoneNumber(updatedUser.getPhoneNumber())
                .organization(updatedUser.getOrganization())
                .preferredArea(updatedUser.getPreferredArea())
                .avatar(updatedUser.getAvatar())
                .role(updatedUser.getRole())
                .status(updatedUser.getStatus())
                .createdAt(updatedUser.getCreatedAt())
                .capabilities(capabilities)
                .build();
    }

    private void validateAvatar(String avatar) {
        if (avatar.isEmpty()) return;
        if (!avatar.matches("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")) {
            throw new BadRequestException("Ảnh đại diện phải là JPG, PNG hoặc WebP hợp lệ");
        }
        try {
            byte[] bytes = java.util.Base64.getDecoder().decode(avatar.substring(avatar.indexOf(',') + 1));
            if (bytes.length > 2621440) throw new BadRequestException("Ảnh đại diện tối đa 2.5 MB");
            boolean valid = bytes.length >= 12 && (
                avatar.startsWith("data:image/png;") && bytes[0] == (byte) 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G' && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10 ||
                avatar.startsWith("data:image/jpeg;") && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff ||
                avatar.startsWith("data:image/webp;") && new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP")
            );
            if (!valid) throw new BadRequestException("Nội dung ảnh đại diện không hợp lệ");
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Nội dung ảnh đại diện không hợp lệ");
        }
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = getCurrentUser();

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        if (request.getOldPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
