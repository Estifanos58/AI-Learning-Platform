FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY user-profile-service ./user-profile-service
COPY proto ./proto
WORKDIR /app/user-profile-service
RUN mvn -q -DskipTests dependency:go-offline
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=builder /app/user-profile-service/target/user-profile-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 9091
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
