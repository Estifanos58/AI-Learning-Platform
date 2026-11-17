# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app

ENV MAVEN_OPTS="-Dmaven.wagon.http.pool=false -Dmaven.wagon.http.retryHandler.count=5 -Dhttp.keepAlive=false"

COPY proto ./proto
COPY chat-service ./chat-service
WORKDIR /app/chat-service

RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests \
    -Dmaven.wagon.http.pool=false \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dhttp.keepAlive=false

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=builder /app/chat-service/target/chat-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 9095
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
