export interface PaginationParams {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}

export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
}

export interface Connection<T> {
    edges: {
        node: T;
        cursor: string;
    }[];
    pageInfo: PageInfo;
    totalCount?: number;
}
