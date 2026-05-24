/**
 * The net state of a project within a single batch.
 * Used to perform semantic folding (Net gain/loss aggregation).
 */
export interface ProjectState {
    projectId: string;
    userId: string;
    netBalance: number; // +1 for CREATED, -1 for DELETED
}
