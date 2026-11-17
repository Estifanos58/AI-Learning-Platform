FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY auth-service ./auth-service
COPY proto ./proto
WORKDIR /app/auth-service
RUN mvn -q -DskipTests dependency:go-offline
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=builder /app/auth-service/target/auth-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 9090
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
