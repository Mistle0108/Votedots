import { useCallback, useEffect, useRef, useState } from "react";

export default function useVotePopup() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  const previewColorRef = useRef<string | null>(null);

  useEffect(() => {
    previewColorRef.current = previewColor;
  }, [previewColor]);

  const openPopup = useCallback((position: { x: number; y: number }) => {
    setPopupPos(position);
    setPopupOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setPreviewColor(null);
    previewColorRef.current = null;
    setPopupOpen(false);
  }, []);

  const resetPreviewColor = useCallback(() => {
    setPreviewColor(null);
    previewColorRef.current = null;
  }, []);

  const handleColorChange = useCallback((color: string | null) => {
    setPreviewColor(color);
    previewColorRef.current = color;
  }, []);

  return {
    popupOpen,
    popupPos,
    previewColor,
    previewColorRef,
    openPopup,
    closePopup,
    resetPreviewColor,
    handleColorChange,
  };
}
