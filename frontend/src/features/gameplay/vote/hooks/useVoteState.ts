import { useCallback, useEffect, useRef, useState } from "react";

export default function useVoteState() {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [votingCellIds, setVotingCellIds] = useState<Set<string>>(new Set());
  const [topColorMap, setTopColorMap] = useState<Map<string, string>>(
    new Map(),
  );

  const previewColorRef = useRef<string | null>(null);
  const votingCellIdsRef = useRef<Set<string>>(new Set());
  const topColorMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    previewColorRef.current = previewColor;
  }, [previewColor]);

  useEffect(() => {
    votingCellIdsRef.current = votingCellIds;
  }, [votingCellIds]);

  useEffect(() => {
    topColorMapRef.current = topColorMap;
  }, [topColorMap]);

  const handleColorChange = useCallback((color: string | null) => {
    setPreviewColor(color);
    previewColorRef.current = color;
  }, []);

  const resetPreviewColor = useCallback(() => {
    setPreviewColor(null);
    previewColorRef.current = null;
  }, []);

  const applyVoteUpdate = useCallback((nextVotes: Record<string, number>) => {
    setVotes(nextVotes);

    const nextVotingCellIds = new Set<string>();
    const nextTopColorMap = new Map<string, string>();
    const topCountMap = new Map<string, number>();

    Object.entries(nextVotes).forEach(([key, count]) => {
      const [xStr, yStr, color] = key.split(":");
      const x = Number(xStr);
      const y = Number(yStr);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !color) {
        return;
      }

      const cellKey = `${x}:${y}`;
      nextVotingCellIds.add(cellKey);

      const currentTopCount = topCountMap.get(cellKey) ?? -1;
      if (count > currentTopCount) {
        topCountMap.set(cellKey, count);
        nextTopColorMap.set(cellKey, color);
      }
    });

    setVotingCellIds(nextVotingCellIds);
    setTopColorMap(nextTopColorMap);
    votingCellIdsRef.current = nextVotingCellIds;
    topColorMapRef.current = nextTopColorMap;
  }, []);

  const resetVoteState = useCallback(() => {
    const emptyVotingCellIds = new Set<string>();
    const emptyTopColorMap = new Map<string, string>();

    setVotes({});
    setPreviewColor(null);
    setVotingCellIds(emptyVotingCellIds);
    setTopColorMap(emptyTopColorMap);

    previewColorRef.current = null;
    votingCellIdsRef.current = emptyVotingCellIds;
    topColorMapRef.current = emptyTopColorMap;
  }, []);

  return {
    votes,
    previewColor,
    previewColorRef,
    votingCellIds,
    topColorMap,
    votingCellIdsRef,
    topColorMapRef,
    handleColorChange,
    resetPreviewColor,
    applyVoteUpdate,
    resetVoteState,
  };
}
