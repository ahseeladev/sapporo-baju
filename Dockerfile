FROM eclipse-temurin:17-jdk AS build
WORKDIR /build
COPY backend/pom.xml ./pom.xml
COPY backend/mvnw ./mvnw
COPY backend/.mvn ./.mvn
COPY backend/src ./src
RUN chmod +x mvnw && ./mvnw -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/order-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
