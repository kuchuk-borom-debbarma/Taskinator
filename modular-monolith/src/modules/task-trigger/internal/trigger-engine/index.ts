import type { TaskTrigger } from '../../TaskTriggerService.ts';
import { blockParentDoneTrigger } from './processors/blockParentDoneTrigger.ts';
import { sequenceUnlockTrigger } from './processors/sequenceUnlockTrigger.ts';
import { webhookTrigger } from './processors/webhookTrigger.ts';
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
        updates: any,
    ) => Promise<void>;
};

const processor: TriggerProcessor = {
    WEBHOOK: webhookTrigger,
    SEQUENCE_UNLOCK: sequenceUnlockTrigger,
    BLOCK_PARENT_DONE: blockParentDoneTrigger,
    NOTIFY_PARENT_TEAM: notifyParentTeamTrigger,
    NOTIFY_TASK_TEAM: notifyTaskTeamTrigger,
};

export default processor;
