package com.example.backwork.config;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BootstrapAdminInitializer {

    private final UserRepository userRepository;
    private final CalendarRepository calendarRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${bootstrap.admin.userid:}")
    private String bootstrapAdminUserid;

    @Value("${bootstrap.admin.password:}")
    private String bootstrapAdminPassword;

    @Value("${bootstrap.admin.email:}")
    private String bootstrapAdminEmail;

    @Value("${bootstrap.admin.name:}")
    private String bootstrapAdminName;

    @PostConstruct
    public void initializeBootstrapAdmin() {
        if (bootstrapAdminUserid == null || bootstrapAdminUserid.isBlank()
                || bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            return;
        }

        User user = userRepository.findByUserid(bootstrapAdminUserid).orElse(null);
        if (user == null) {
            user = new User(
                    bootstrapAdminUserid,
                    passwordEncoder.encode(bootstrapAdminPassword),
                    (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank()) ? null : bootstrapAdminEmail,
                    (bootstrapAdminName == null || bootstrapAdminName.isBlank()) ? null : bootstrapAdminName
            );
            user.setAuth("ADMIN");
            user.setMustChangePassword(true);
            user = userRepository.save(user);
        } else {
            if (!"ADMIN".equalsIgnoreCase(user.getAuth())) {
                user.setAuth("ADMIN");
            }
            if (!user.isMustChangePassword()) {
                user.setMustChangePassword(true);
            }
            user = userRepository.save(user);
        }

        if (calendarRepository.findByOwnerIdAndType(user.getId(), "PERSONAL").isEmpty()) {
            calendarRepository.save(new Calendar("개인 캘린더", "PERSONAL", user));
        }
    }
}

