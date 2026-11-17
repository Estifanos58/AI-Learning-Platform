FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY api-gateway ./api-gateway
COPY proto ./proto
WORKDIR /app/api-gateway
RUN mvn -q -DskipTests dependency:go-offline
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=builder /app/api-gateway/target/api-gateway-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
