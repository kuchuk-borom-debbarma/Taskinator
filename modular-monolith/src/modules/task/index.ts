import { TaskServiceImpl } from './internal/TaskServiceImpl.ts';

export interface BaseService {
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const taskService = new TaskServiceImpl();
