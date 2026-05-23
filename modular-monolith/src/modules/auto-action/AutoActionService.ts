import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../database/tables/AutoAction.js';
import type { Connection, PaginationParams } from '../../types/pagination.ts';
import type { BehaviorSettingsCatalog } from './types.js';

export type AutoActionConnection = Connection<AutoAction>;

export interface CreateAutoActionForActorInput {
    projectId: string;
    name?: string;
    description?: string | null;
    triggers?: any[];
    steps?: any[];
    isActive?: boolean;
    isSync?: boolean;
}

export interface UpdateAutoActionForActorInput {
    name?: string;
    description?: string | null;
    triggers?: any[];
    steps?: any[];
    isActive?: boolean;
    isSync?: boolean;
}

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

    /**
     * Retrieves Auto Actions by IDs.
     * Internal use only — callers must establish authorization first.
     */
    getAutoActionsByIds(ids: string[]): Promise<AutoAction[]>;

    /**
     * Retrieves a single Auto Action only if the actor can access its project.
     */
    getAutoActionForActor(
        actorId: string,
        id: string,
    ): Promise<AutoAction | undefined>;

    /**
     * Retrieves Auto Actions by IDs, filtered by actor project access.
     */
    getAutoActionsForActorByIds(
        actorId: string,
        ids: string[],
    ): Promise<AutoAction[]>;

    /**
     * Retrieves project Auto Actions as a Relay-style connection.
     */
    getAutoActionsForProjectConnection(
        actorId: string,
        projectId: string,
        pagination?: PaginationParams,
    ): Promise<AutoActionConnection>;

    /**
     * Creates a project Auto Action on behalf of an authorized actor.
     */
    createAutoActionForActor(
        actorId: string,
        input: CreateAutoActionForActorInput,
    ): Promise<AutoAction>;

    /**
     * Updates an Auto Action on behalf of an authorized actor.
     */
    updateAutoActionForActor(
        actorId: string,
        id: string,
        expectedVersion: number,
        input: UpdateAutoActionForActorInput,
    ): Promise<AutoAction>;

    /**
     * Deletes an Auto Action on behalf of an authorized actor.
     */
    deleteAutoActionForActor(actorId: string, id: string): Promise<void>;

    /**
     * Retrieves the catalog of available behaviors and their settings.
     */
    getBehaviorSettingsCatalog(
        projectId: string,
    ): Promise<BehaviorSettingsCatalog>;
}
