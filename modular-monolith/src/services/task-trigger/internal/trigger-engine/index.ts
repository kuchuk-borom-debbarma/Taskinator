import type { TaskTrigger } from '../../TaskTriggerService.ts';
import { updateParentStatusTrigger } from './processors/updateParentStatus.ts';
import {
    notifyParentTeamTrigger,
    notifyTaskTeamTrigger,
} from './processors/notifyTeamTrigger.ts';

type TriggerProcessor = {
    [K in TaskTrigger['triggerType']]: (
        taskId: string,
        trigger: Extract<
            TaskTrigger,
            {
                triggerType: K;
            }
        >,
    ) => Promise<void>;
};

const processor: TriggerProcessor = {
    UPDATE_PARENT_STATUS: updateParentStatusTrigger,
    NOTIFY_PARENT_TEAM: notifyParentTeamTrigger,
    NOTIFY_TASK_TEAM: notifyTaskTeamTrigger,
};

export default processor;
