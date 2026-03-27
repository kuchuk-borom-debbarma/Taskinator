console.log('Hello via Bun!');
import {projectService} from "./services/project";

await projectService.init();
