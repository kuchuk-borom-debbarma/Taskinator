import { traceService } from '../../infra/tracing/index.ts';
import { TaskServiceImpl } from './internal/TaskServiceImpl.ts';
import type { Task, TaskLink } from './TaskService.ts';

export interface BaseService {
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const taskService = traceService('TaskService', new TaskServiceImpl());
export type { Task, TaskLink };
