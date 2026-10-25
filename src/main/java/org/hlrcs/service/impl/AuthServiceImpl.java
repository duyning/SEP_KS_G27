package org.hlrcs.service.impl;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hlrcs.dto.request.ChangePasswordRequest;
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
import org.hlrcs.security.JwtTokenProvider;
import org.hlrcs.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserCapabilityRepository userCapabilityRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(UserRepository userRepository,
                           UserCapabilityRepository userCapabilityRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.userCapabilityRepository = userCapabilityRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
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
                .role(user.getRole())
                .status(user.getStatus())
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
                .role(updatedUser.getRole())
                .status(updatedUser.getStatus())
                .createdAt(updatedUser.getCreatedAt())
                .capabilities(capabilities)
                .build();
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
