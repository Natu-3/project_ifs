package com.example.backwork.auth;


import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CalendarRepository calendarRepository;

    public User login(LoginRequest request) {

        User user = userRepository.findByUserid(request.getUserid())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호 불일치");
        }

        return user;
    }

    public SignupResponse singup(SignupRequest request) {

        if (userRepository.existsByUserid(request.getUserid())) {
            throw new IllegalArgumentException("이미 존재하는 userid");
        }

        User user = new User(
                request.getUserid(),
                passwordEncoder.encode(request.getPassword())
        );

        User saveUser = userRepository.save(user);

        Calendar personalCalendar = new Calendar(
                "개인 캘린더",
                "PERSONAL",
                saveUser
        );
        calendarRepository.save(personalCalendar);

        return new SignupResponse(
                saveUser.getId(),
                saveUser.getUserid(),
                null,
                saveUser.getAuth()
        );
    }
}
