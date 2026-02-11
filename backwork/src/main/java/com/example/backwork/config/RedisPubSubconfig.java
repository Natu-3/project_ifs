//package com.example.backwork.config;
//
//import com.example.backwork.schedule.ScheduleUpdateListener;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.data.redis.connection.RedisConnectionFactory;
//import org.springframework.data.redis.listener.ChannelTopic;
//import org.springframework.data.redis.listener.RedisMessageListenerContainer;
//import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
//
//@Configuration
//public RedisPubSubConfig {
//
//    @Bean
//    public ChannelTopic scheduleUpdateTopic() {
//        return new ChannelTopic("schedule:updates");
//    }
//
//    @Bean
//    public RedisMessageListenerContainer redisMessageListenerContainer(
//            RedisConnectionFactory connectionFactory,
//            MessageListenerAdapter listenerAdapter
//    ) {
//        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
//        container.setConnectionFactory(connectionFactory);
//        container.addMessageListener(listenerAdapter, scheduleUpdateTopic());
//        return container;
//    }
//
//    @Bean
//    public MessageListenerAdapter listenerAdapter(ScheduleUpdateListener listener) {
//        return new MessageListenerAdapter(listener, "onMessage");
//    }
//}