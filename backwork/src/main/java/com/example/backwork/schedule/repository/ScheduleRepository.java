package com.example.backwork.schedule.repository;

import com.example.backwork.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByOwnerId(Long ownerId);

    List<Schedule> findByOwnerIdAndStartAtBetween(
            Long ownerId,
            LocalDateTime start,
            LocalDateTime end
    );
}
