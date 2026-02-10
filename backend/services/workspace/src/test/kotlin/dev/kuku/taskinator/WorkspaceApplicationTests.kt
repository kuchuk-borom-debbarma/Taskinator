package dev.kuku.taskinator

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=com.netflix.graphql.dgs.springgraphql.autoconfig.DgsSpringGraphQLAutoConfiguration,org.springframework.boot.autoconfigure.graphql.GraphQlAutoConfiguration"
    ]
)
class WorkspaceApplicationTests {

    @Test
    fun contextLoads() {
    }

}
