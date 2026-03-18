import { insertProject, deleteProject as delPro, insertProjectMember, removeProjectMember } from "./queries";
import { kafkaProducer } from "../../kafka/producer";
import { ProjectEvent } from "./events";

export class ProjectService {
    async createProject(data: { userId: string; name: string; description?: string }) {
        const { userId, name, description } = data;
        console.log(`Creating project for user: ${userId}, name: ${name}`);
        try {
            const result = await insertProject(data);
            if (!result) throw new Error("Failed to insert project for user: " + userId);

            await kafkaProducer.send({
                topic: "project",
                messages: [{
                    key: result.id,
                    value: JSON.stringify({ event: ProjectEvent.PROJECT_CREATED, data: result }),
                    timestamp: new Date().toISOString()
                }]
            });

            return result;
        } catch (err) {
            console.error("Error at createProject:", err);
            return null;
        }
    }

    async deleteProject(data: { userId: string; projectId: string }) {
        const { userId, projectId } = data;
        console.log(`Deleting project ${projectId} for user ${userId}`);
        try {
            const deleted = await delPro(data);
            if (!deleted) throw new Error("Project not found or unauthorized");

            await kafkaProducer.send({
                topic: "project",
                messages: [{
                    key: projectId,
                    value: JSON.stringify({ event: ProjectEvent.PROJECT_DELETED, data: projectId }),
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            console.error("Error at deleteProject:", err);
        }
    }

    async addProjectMember(data: { userId: string; userToAdd: string; projectId: string }) {
        const { userId, projectId, userToAdd } = data;
        console.log(`Adding member ${userToAdd} to project ${projectId} by user ${userId}`);
        try {
            const added = await insertProjectMember(data);
            if (!added) throw new Error("Failed to add member — unauthorized or already exists");

            await kafkaProducer.send({
                topic: "project",
                messages: [{
                    key: projectId,
                    value: JSON.stringify({ event: ProjectEvent.PROJECT_MEMBER_ADDED, data }),
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            console.error("Error at addProjectMember:", err);
        }
    }

    async removeProjectMember(data: { userId: string; userToRemove: string; projectId: string }) {
        const { userId, projectId, userToRemove } = data;
        console.log(`Removing member ${userToRemove} from project ${projectId} by user ${userId}`);
        try {
            const removed = await removeProjectMember(data);
            if (!removed) throw new Error("Failed to remove member — unauthorized or not found");

            await kafkaProducer.send({
                topic: "project",
                messages: [{
                    key: projectId,
                    value: JSON.stringify({ event: ProjectEvent.PROJECT_MEMBER_REMOVED, data }),
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            console.error("Error at removeProjectMember:", err);
        }
    }
}

export const projectService = new ProjectService();