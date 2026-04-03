import {projectService} from './services/project';
import {teamService} from './services/team';
import {taskService} from './services/task';
import {startConsumers} from './kafka/registry';
import {startRestServer} from './restful';
import {taskTriggerService} from "./services/task-trigger";

// Start API immediately
startRestServer(3000);

await Promise.all([
    projectService.init(),
    teamService.init(),
    taskService.init(),
    taskTriggerService.init(),
    startConsumers(),
]);
