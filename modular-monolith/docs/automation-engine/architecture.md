# Automation Engine - Architecture

ok so we will have automations that users can create so lets define them

actorId (the user who created it)
projectId (the project the automation belongs to)
for : TASK, PROJECT, TEAM
automations: JSONB

automation is going to look something like this

[
    {
        conditions: [{condition}]
        actions: [{actions}]
    }
]

they will be executed in order

when the conditions are true then the actions will be executed in order

now lets define the structure of the condition


so we can have a list of automations that are going to be executed for a task

it can also be single automation in that case only one automation in the automations JSONB list