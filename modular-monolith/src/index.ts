import { projectService } from './services/project';
import { teamService } from './services/team';
import { taskService } from './services/task';
import { startConsumers } from './kafka/registry';

await Promise.all([
    projectService.init(),
    teamService.init(),
    taskService.init(),
    startConsumers(),
]);
