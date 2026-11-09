package org.hlrcs.service;

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

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    void logout(HttpServletRequest request, HttpServletResponse response);

    User getCurrentUser();

    UserProfileResponse getProfile();

    UserProfileResponse updateProfile(UpdateProfileRequest request);

    void changePassword(ChangePasswordRequest request);
}
