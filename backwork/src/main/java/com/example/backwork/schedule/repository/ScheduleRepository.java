package com.example.backwork.schedule.repository;

import com.example.backwork.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByOwnerId(Long ownerId);

    List<Schedule> findByOwnerIdAndStartAtLessThanEqualAndEndAtGreaterThanEqual(
            Long ownerId,
            LocalDateTime monthEnd,
            LocalDateTime monthStart
    );

    List<Schedule> findByOwnerIdAndEndAtIsNullAndStartAtBetween(
            Long ownerId,
            LocalDateTime monthStart,
            LocalDateTime monthEnd
    );
    List<Schedule> findByCalendarIdAndStartAtLessThanEqualAndEndAtGreaterThanEqual(
            Long calendarId,
            LocalDateTime monthEnd,
            LocalDateTime monthStart
    );

    List<Schedule> findByCalendarIdAndEndAtIsNullAndStartAtBetween(
            Long calendarId,
            LocalDateTime monthStart,
            LocalDateTime monthEnd
    );

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("""
            SELECT DISTINCT s
            FROM Schedule s
            JOIN FETCH s.calendar c
            JOIN FETCH s.owner o
            WHERE s.createdAt BETWEEN :start AND :end
            ORDER BY s.createdAt DESC
            """)
    List<Schedule> findByCreatedAtBetweenWithCalendarAndOwner(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
