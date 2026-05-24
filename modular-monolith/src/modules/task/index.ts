import { TaskServiceImpl } from './internal/TaskServiceImpl.ts';
import type { Task, TaskLink } from './TaskService.ts';

export interface BaseService {
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const taskService = new TaskServiceImpl();
export type { Task, TaskLink };
