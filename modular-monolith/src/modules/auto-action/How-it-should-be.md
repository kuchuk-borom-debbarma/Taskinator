here is how i want to make this


so we have auto actions created for projects
some will be async some will be sync. The async ones will run as listeners
the sync one will run as part of the life cycle

lets discuss the sync flow first

we have two approch.
1. no parallel
we fetch the actions upto 100 limit for the project that are sync and match the event
then we will run them one by one
2. parallel
we will run the sync actions in parallel and wait for all of them to complete before moving on

since they are synchronous we will not be chunking or splitting or batching

we have hardcoded actions that are sync only but if users want they can use them in async auto action

so sync conditoisn and actins can be async but not vice versa

ok as for the async flow
we will not do the whole flow in one go we will split it into chunks
so we will have a listener that will listen for the trigger 
it will fetch the auto action of async type for that trigger  upto certain limit.
if there is more then it will re-emit but with cursor so that we can get the next batch of  auto actions from. 

ok for the listener itself
for each action it will emit an event to start the action

we will have another listener that will listen to the action start event
this will simply delegate the action data and the event data to the action engine.
