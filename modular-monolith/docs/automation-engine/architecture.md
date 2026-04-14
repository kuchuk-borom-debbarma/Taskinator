# Automation Engine - Architecture

Automations define reactive rules for Tasks, Projects, and Teams. They operate via an **Array of Rules** evaluated sequentially.

An automation payload is structured exactly like this:
`[Rule, Rule, ...]`

Each `Rule` evaluates a logical tree (`when`) and executes a list of actions (`then`) if the logic passes.

```json
[
    {
        "when": {
            "match": "ALL",
            "conditions": [
                { "field": "status", "op": "CHANGED_TO", "value": "DONE" }
            ]
        },
        "then": [
            {
                "type": "UPDATE_TASK",
                "target": "@parent",
                "params": { "status": "READY" }
            }
        ]
    }
]
```

## DSL Core Logic
### 1. `when` (RuleGroup)
A highly nested query builder structure.
- `match`: Evaluates if `ALL` or `ANY` child checks pass.
- `conditions`: Array containing strict equality, delta checks (`CHANGED_TO`), or nested `RuleGroup` blocks.

### 2. `then` (Action)
Actions are strictly hierarchical. They mutate task state at explicit scopes:
- `@self`
- `@parent`
- `@children` (immediate)
- `@descendants` (recursive)
- `SPECIFIC_TASKS`