import { useState, useEffect, useRef, useCallback } from 'react';

interface Connection<T> {
  edges: { node: T; cursor: string }[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

interface SlidingWindowOptions<T> {
  initialData: Connection<T>;
  fetchMore: (params: any) => Promise<Connection<T>>;
  pageSize: number;
  maxWindowSize: number;
}

export function useSlidingWindow<T>({
  initialData,
  fetchMore,
  pageSize,
  maxWindowSize,
}: SlidingWindowOptions<T>) {
  const [items, setItems] = useState<T[]>(initialData.edges.map((e) => e.node));
  const [pageInfo, setPageInfo] = useState(initialData.pageInfo);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const loadNext = useCallback(async () => {
    if (isLoadingNext || !pageInfo.hasNextPage || !pageInfo.endCursor) return;

    setIsLoadingNext(true);
    try {
      const nextData = await fetchMore({ first: pageSize, after: pageInfo.endCursor });
      const nextItems = nextData.edges.map((e) => e.node);
      
      setItems((prev) => {
        const combined = [...prev, ...nextItems];
        if (combined.length > maxWindowSize) {
          return combined.slice(combined.length - maxWindowSize);
        }
        return combined;
      });
      setPageInfo((prev) => ({
        ...nextData.pageInfo,
        hasPreviousPage: prev.hasPreviousPage || true,
      }));
    } catch (err) {
      console.error('Failed to load next page:', err);
    } finally {
      setIsLoadingNext(false);
    }
  }, [isLoadingNext, pageInfo, fetchMore, pageSize, maxWindowSize]);

  const loadPrev = useCallback(async () => {
    if (isLoadingPrev || !pageInfo.hasPreviousPage || !pageInfo.startCursor) return;

    setIsLoadingPrev(true);
    try {
      const prevData = await fetchMore({ last: pageSize, before: pageInfo.startCursor });
      const prevItems = prevData.edges.map((e) => e.node);
      
      setItems((prev) => {
        const combined = [...prevItems, ...prev];
        if (combined.length > maxWindowSize) {
          return combined.slice(0, maxWindowSize);
        }
        return combined;
      });
      setPageInfo((prev) => ({
        ...prevData.pageInfo,
        hasNextPage: prev.hasNextPage || true,
      }));
    } catch (err) {
      console.error('Failed to load previous page:', err);
    } finally {
      setIsLoadingPrev(false);
    }
  }, [isLoadingPrev, pageInfo, fetchMore, pageSize, maxWindowSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === bottomSentinelRef.current) {
              loadNext();
            } else if (entry.target === topSentinelRef.current) {
              loadPrev();
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.1 }
    );

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

    return () => observer.disconnect();
  }, [loadNext, loadPrev]);

  // Handle initialData updates
  useEffect(() => {
    setItems(initialData.edges.map(e => e.node));
    setPageInfo(initialData.pageInfo);
  }, [initialData]);

  return {
    items,
    containerRef,
    topSentinelRef,
    bottomSentinelRef,
    isLoadingNext,
    isLoadingPrev,
  };
}
