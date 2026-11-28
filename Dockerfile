FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY backend/pom.xml backend/mvnw ./
COPY backend/.mvn ./.mvn
COPY backend/src ./src
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline && ./mvnw -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/order-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_OPTS=""
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
