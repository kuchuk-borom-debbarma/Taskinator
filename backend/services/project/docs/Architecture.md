# High throughput target
The goal is to build a system that can handle thousands of requests per second. <br>
To make this a reality we need to off-load non-important operations into asynchronous flow. <br>
The second optimization is to optimize the queries to have as less trip as possible and avoid database hits if possible. <br>
We can do this by writing efficient queries, caching smartly. Writing to in memory database first and later on writing to disk, denormalizing tables to avoid joins. <br>

# Project features
Users can create projects. <br>
Projects can have members. <br>
Project can have teams. <br>
Teams can have members. <br>
Tasks can be assigned to teams. <br>
Tasks assigned to team can have sub-task assigned to another team. <br>
The idea behind hierarchical tasks is for users to be able to delegate tasks into sub tasks. <br>
We can use pathing string instead of closure tables as there will be many tasks and it will get heavy.