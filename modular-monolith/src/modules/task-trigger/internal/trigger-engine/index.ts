import type { TaskTrigger } from '../../TaskTriggerService.ts';
import { blockParentDoneTrigger } from './processors/blockParentDoneTrigger.ts';
import { webhookTrigger } from './processors/webhookTrigger.ts';
import {
    notifyTaskTrigger,
} from './processors/notifyTaskTrigger.ts';

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
    BLOCK_PARENT_DONE: blockParentDoneTrigger,
    NOTIFY_TASK: notifyTaskTrigger,
};

export default processor;
