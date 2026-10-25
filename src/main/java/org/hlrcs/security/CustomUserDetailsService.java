package org.hlrcs.security;

import org.hlrcs.entity.User;
import org.hlrcs.entity.UserCapability;
import org.hlrcs.repository.UserCapabilityRepository;
import org.hlrcs.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserCapabilityRepository userCapabilityRepository;

    public CustomUserDetailsService(UserRepository userRepository, UserCapabilityRepository userCapabilityRepository) {
        this.userRepository = userRepository;
        this.userCapabilityRepository = userCapabilityRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByPhoneNumber(email))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng với email: " + email));

        List<String> capabilities = userCapabilityRepository.findByUser_UserIdAndStatus(user.getUserId(), "ACTIVE")
                .stream()
                .filter(uc -> uc.getCapability() != null)
                .map(uc -> uc.getCapability().getCode())
                .collect(Collectors.toList());

        return new CustomUserDetails(user, capabilities);
    }
}
