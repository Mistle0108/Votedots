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
  }, []);

  const resetPreviewColor = useCallback(() => {
    setPreviewColor(null);
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
  }, []);

  const resetVoteState = useCallback(() => {
    setVotes({});
    setPreviewColor(null);
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, []);

  return {
    votes,
    previewColor,
    previewColorRef,
    votingCellIdsRef,
    topColorMapRef,
    handleColorChange,
    resetPreviewColor,
    applyVoteUpdate,
    resetVoteState,
  };
}
