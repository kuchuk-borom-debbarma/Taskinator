package dev.kuku.taskinator

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.kafka.core.KafkaTemplate

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=com.netflix.graphql.dgs.springgraphql.autoconfig.DgsSpringGraphQLAutoConfiguration,org.springframework.boot.autoconfigure.graphql.GraphQlAutoConfiguration"
    ]
)
@Import(TestPostgresConfiguration::class)
class WorkspaceApplicationTests {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    @Test
    fun contextLoads() {
    }

}
