# syntax=docker/dockerfile:1

# 1) Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /workspace

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./

RUN chmod +x gradlew \
 && sed -i 's/\r$//' gradlew

# Pre-fetch dependencies for better layer caching
RUN ./gradlew --no-daemon dependencies || true

COPY . .
RUN ./gradlew --no-daemon clean bootJar

# 2) Runtime stage
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl
COPY --from=build /workspace/build/libs/*.jar /app/app.jar

EXPOSE 8080

# NOTE: This requires Spring Boot Actuator exposing /actuator/health.
# If actuator endpoint is not available yet, add spring-boot-starter-actuator and expose it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]