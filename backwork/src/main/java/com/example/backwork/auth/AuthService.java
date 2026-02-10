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
                passwordEncoder.encode(request.getPassword()),
                request.getEmail(),
                request.getName()
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
                saveUser.getEmail() != null ? saveUser.getEmail() : "",
                saveUser.getAuth(),
                saveUser.getName() != null ? saveUser.getName() : ""
        );
    }

    // 사용자 정보 수정
    public User updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim();
            // 이메일 중복 확인 (다른 사용자가 사용 중인지)
            if (user.getEmail() == null || !user.getEmail().equals(newEmail)) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new IllegalArgumentException("이미 사용 중인 이메일입니다");
                }
            }
            user.setEmail(newEmail);
        }

        return userRepository.save(user);
    }

    // 사용자 ID로 조회
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElse(null);
    }
}
