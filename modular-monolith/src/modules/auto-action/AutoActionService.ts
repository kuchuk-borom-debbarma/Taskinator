import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../database/tables/AutoAction.ts';

/**
 * Public service interface for the Auto Action module.
 * Matches the Service pattern used across task, project, and team modules.
 */
export interface AutoActionService {
    /**
     * Creates a new Auto Action.
     * Enforces project-scoped name uniqueness and sync-safety rules.
     */
    createAutoAction(data: NewAutoAction): Promise<AutoAction>;

    /**
     * Updates an existing Auto Action using Optimistic Concurrency Control (OCC).
     * Enforces project-scoped name uniqueness and sync-safety rules.
     */
    updateAutoAction(
        id: string,
        data: AutoActionUpdate,
        expectedVersion: number,
    ): Promise<AutoAction>;

    /**
     * Deletes an Auto Action by ID.
     */
    deleteAutoAction(id: string): Promise<void>;

    /**
     * Retrieves all Auto Actions for a specific project.
     */
    getAutoActionsForProject(projectId: string): Promise<AutoAction[]>;

    /**
     * Retrieves a single Auto Action by its ID.
     * Returns undefined if not found.
     */
    getAutoActionById(id: string): Promise<AutoAction | undefined>;
}
