plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    id("org.springframework.boot") version "4.0.2"
    id("io.spring.dependency-management") version "1.1.7"
}
val netflixDgsVersion by extra("11.0.0")

group = "dev.kuku"
version = "0.0.1-SNAPSHOT"
description = "workspace"


java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.exposed:exposed-spring-boot4-starter:1.0.0")
    implementation("org.jetbrains.exposed:exposed-java-time:1.0.0")
    implementation("com.github.f4b6a3:uuid-creator:6.0.0")

    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("com.netflix.graphql.dgs:graphql-dgs-spring-graphql-starter")
    implementation("org.springframework.boot:spring-boot-starter-graphql")
    implementation("com.netflix.graphql.dgs.codegen:graphql-dgs-codegen-gradle:8.3.0")
    testImplementation("org.springframework.graphql:spring-graphql-test")
    testImplementation("org.springframework:spring-webflux")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    implementation("io.github.oshai:kotlin-logging-jvm:7.0.0")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}
dependencyManagement {
    imports {
        mavenBom("com.netflix.graphql.dgs:graphql-dgs-platform-dependencies:$netflixDgsVersion")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
