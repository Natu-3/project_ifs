package com.example.backwork.calendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CalendarRepository extends JpaRepository<Calendar, Long> {

    // 개인 캘린더 1개 찾기
    Optional<Calendar> findByOwnerIdAndType(Long ownerId, String type);

    // 유저의 모든 캘린더
    List<Calendar> findByOwnerId(Long ownerId);
    
    // 팀 캘린더 목록 조회 (타입별)
    List<Calendar> findAllByOwnerIdAndType(Long ownerId, String type);
    
    // 소유자 확인용 (삭제 시 사용)
    Optional<Calendar> findByIdAndOwnerId(Long id, Long ownerId);

}
