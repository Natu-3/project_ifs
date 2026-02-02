package com.example.backwork.auth;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {
    @GetMapping("/ping")
    public String ping(){
        System.out.println("Ping!!!");
        return "pong";
    }
}
