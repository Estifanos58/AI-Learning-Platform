# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app

ENV MAVEN_OPTS="-Dmaven.wagon.http.pool=false -Dmaven.wagon.http.retryHandler.count=5 -Dhttp.keepAlive=false"

COPY proto ./proto
COPY user-profile-service ./user-profile-service
WORKDIR /app/user-profile-service

RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests \
    -Dmaven.wagon.http.pool=false \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dhttp.keepAlive=false

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -m appuser
COPY --from=builder --chown=appuser:appgroup /app/user-profile-service/target/user-profile-service-0.0.1-SNAPSHOT.jar app.jar
USER appuser
EXPOSE 8083 9091
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8083 && printf "GET /actuator/health/liveness HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n" >&3 && grep -q "200" <&3'
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/opt/app/app.jar"]
