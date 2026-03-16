# Multi-stage build for Spring Boot (Java 21)
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy Maven descriptor first for dependency caching
COPY pom.xml ./
RUN mvn -B dependency:go-offline

# Copy sources and build
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
ENV APP_HOME=/opt/app
WORKDIR ${APP_HOME}

COPY --from=build /workspace/target/*.jar app.jar

# Health + config via env
EXPOSE 8080
ENTRYPOINT ["java","-jar","/opt/app/app.jar"]
