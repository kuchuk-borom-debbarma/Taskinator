package dev.kuku.taskinator

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import javax.sql.DataSource

@TestConfiguration
class TestPostgresConfiguration {
    @Bean
    @Primary
    fun dataSource(): DataSource {
        return EmbeddedPostgres.builder().start().postgresDatabase
    }
}
