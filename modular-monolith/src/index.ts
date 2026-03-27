console.log('Hello via Bun!');
import { projectService } from './services/project';
import { teamService } from './services/team';

await Promise.all([projectService.init(), teamService.init()]);
