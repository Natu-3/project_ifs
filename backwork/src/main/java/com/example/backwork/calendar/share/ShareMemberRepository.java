package com.example.backwork.calendar.share;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShareMemberRepository extends JpaRepository<ShareMember, ShareMemberId> {

    boolean existsByCalendarIdAndUserId(Long calendarId, Long userId);

    List<ShareMember> findByCalendarId(Long calendarId);

    List<ShareMember> findByUserId(Long userId);

    Optional<ShareMember> findByCalendarIdAndUserId(Long calendarId, Long userId);

    void deleteByCalendarIdAndUserId(Long calendarId, Long userId);
}