package com.example.backwork.calendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CalendarRepository extends JpaRepository<Calendar, Long> {

    // 개인 캘린더 1개 찾기
    Optional<Calendar> findByOwnerIdAndType(Long ownerId, String type);

    // 유저의 모든 캘린더
    List<Calendar> findByOwnerId(Long ownerId);

}
