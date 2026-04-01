import { useCallback, useEffect, useRef, useState } from "react";

export default function useVoteState() {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [votingCellIds, setVotingCellIds] = useState<Set<number>>(new Set());
  const [topColorMap, setTopColorMap] = useState<Map<number, string>>(
    new Map(),
  );

  const votingCellIdsRef = useRef<Set<number>>(new Set());
  const topColorMapRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    votingCellIdsRef.current = votingCellIds;
  }, [votingCellIds]);

  useEffect(() => {
    topColorMapRef.current = topColorMap;
  }, [topColorMap]);

  const applyVoteUpdate = useCallback(
    (nextVotes: Record<string, number>) => {
      setVotes(nextVotes);

      const nextVotingCellIds = new Set<number>();
      const countMap = new Map<number, { color: string; count: number }>();

      for (const [key, count] of Object.entries(nextVotes)) {
        const [cellIdStr, color] = key.split(":");
        const cellId = parseInt(cellIdStr, 10);

        nextVotingCellIds.add(cellId);

        const existing = countMap.get(cellId);
        if (!existing || count > existing.count) {
          countMap.set(cellId, { color, count });
        }
      }

      const nextTopColorMap = new Map<number, string>();
      countMap.forEach(({ color }, cellId) => {
        nextTopColorMap.set(cellId, color);
      });

      votingCellIdsRef.current = nextVotingCellIds;
      topColorMapRef.current = nextTopColorMap;

      setVotingCellIds(nextVotingCellIds);
      setTopColorMap(nextTopColorMap);
    },
    [],
  );

  const resetVoteState = useCallback(() => {
    const emptyVotingCellIds = new Set<number>();
    const emptyTopColorMap = new Map<number, string>();

    setVotes({});
    votingCellIdsRef.current = emptyVotingCellIds;
    topColorMapRef.current = emptyTopColorMap;
    setVotingCellIds(emptyVotingCellIds);
    setTopColorMap(emptyTopColorMap);
  }, []);

  return {
    votes,
    votingCellIds,
    topColorMap,
    votingCellIdsRef,
    topColorMapRef,
    applyVoteUpdate,
    resetVoteState,
  };
}
