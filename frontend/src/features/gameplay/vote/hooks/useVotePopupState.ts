import { useCallback, useState } from "react";
import { VotePopupPosition, VotePopupState } from "../model/vote.types";

const INITIAL_POSITION: VotePopupPosition = { x: 0, y: 0 };

export function useVotePopupState() {
  const [popupState, setPopupState] = useState<VotePopupState>({
    open: false,
    position: INITIAL_POSITION,
  });

  const openPopup = useCallback((position: VotePopupPosition) => {
    setPopupState({
      open: true,
      position,
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupState((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  return {
    popupOpen: popupState.open,
    popupPos: popupState.position,
    openPopup,
    closePopup,
  };
}
