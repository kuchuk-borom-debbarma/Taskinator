const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter5_5() {
  return [
    h2("5.5 Atomic Event Orchestration and Safety Gates"),
    body("In a complex system like Taskinator, one event often triggers a cascade of subsequent actions. For example, updating a task to 'COMPLETED' might trigger an automation that updates a parent task. Without proper safeguards, these cascades can lead to infinite recursive loops."),

    h3("5.5.1 The System Actor Pattern"),
    body("To manage recursion, Taskinator distinguishes between human-initiated actions and system-initiated side effects. Every event payload carries a 'userId' field. When an automated service (like the Trigger Engine) performs a mutation, it explicitly identifies itself as the 'SYSTEM' user."),
    
    codeBlock(`// Event Payload Example
{
  "eventId": "...",
  "type": "task.updated",
  "userId": "SYSTEM",
  "data": { "status": "DONE" }
}`),

    h3("5.5.2 The Recursive Safety Gate"),
    body("Consumer listeners are equipped with 'Safety Gates'. Upon receiving an event, the listener checks the 'userId'. If the event originated from the 'SYSTEM' user, the listener terminates early, effectively breaking the recursive cycle."),
    
    codeBlock(`// Safety Gate Implementation
async function onTaskUpdated(event) {
    if (event.userId === 'SYSTEM') {
        console.log("Recursive event detected; ignoring.");
        return;
    }
    // Proceed with business logic...
    await triggerCascadingAutomations(event);
}`),

    h3("5.5.3 Orchestration Trace: Parent-Guard Trigger"),
    body("Consider the 'Parent-Guard' trigger, which prevents a parent task from being marked as 'DONE' if its children are still 'TODO'. The orchestration flow is as follows:"),
    
    body("1. Human User (u123) updates Task A to 'DONE'."),
    body("2. An event is emitted with userId: 'u123'."),
    body("3. The Trigger Listener catches the event. Since userId is not 'SYSTEM', it executes."),
    body("4. The listener finds incomplete children and reverts Task A to 'TODO'."),
    body("5. This reversion emits a NEW event with userId: 'SYSTEM'."),
    body("6. The Trigger Listener catches the second event, hits the Safety Gate, and stops."),

    emptyLine(),
    insertImage("diagram_recursion_safety.png"),
    figCaption("Figure 5.5: Recursive Event Flow with Origin Tracking Safety Gates"),
  ];
};
