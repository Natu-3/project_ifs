package com.example.backwork.teamsch;

/*
    client 요청
   ↓
    서버가 Redis lock / 충돌 체크
   ↓
    DB 업데이트 (source of truth)
   ↓
    Redis pub/sub publish
   ↓
    websocket broadcast

    -------------

    [React]
       ↓
    Websocket send (schedule update)

    [Spring]
       ↓
    Redis Lock (scheduleId)
       ↓
    DB update
       ↓
    Redis pub/sub
       ↓
    Websocket broadcast


 */


public class ScheduleTeam {
}
