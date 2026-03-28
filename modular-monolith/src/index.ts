console.log('Hello via Bun!');
import { projectService } from './services/project';
import { teamService } from './services/team';
import { taskService } from './services/task';

await Promise.all([
    projectService.init(),
    teamService.init(),
    taskService.init(),
]);
