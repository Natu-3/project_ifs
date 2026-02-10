package com.example.backwork.teamsch;


import com.example.backwork.redis.RedisPublisher;
import com.example.backwork.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ScheduleTeamService {
    private final ScheduleRepository repository;
    private final RedisPublisher redisPublisher;
}
