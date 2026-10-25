package org.hlrcs.security;

import lombok.Getter;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final User user;
    private final List<String> capabilities;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(User user, List<String> capabilities) {
        this.user = user;
        this.capabilities = capabilities != null ? capabilities : new ArrayList<>();

        List<GrantedAuthority> auths = new ArrayList<>();
        // Role authority: ROLE_USER, ROLE_ROOM_HOST, ROLE_STAFF, ROLE_ADMIN
        if (user.getRole() != null) {
            auths.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        }

        // Capability authorities
        for (String cap : this.capabilities) {
            auths.add(new SimpleGrantedAuthority("CAPABILITY_" + cap));
            auths.add(new SimpleGrantedAuthority(cap));
        }

        this.authorities = auths;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() == UserStatus.ACTIVE;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getStatus() == UserStatus.ACTIVE;
    }
}
