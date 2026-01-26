FROM amazoncorretto:21.0.4
WORKDIR /app
COPY . .
RUN ./gradlew build
CMD ["java", "-jar", "/app/server.jar"]