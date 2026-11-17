FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY file-service ./file-service
COPY proto ./proto
WORKDIR /app/file-service
RUN mvn -q -DskipTests dependency:go-offline
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=builder /app/file-service/target/file-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 9092
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
