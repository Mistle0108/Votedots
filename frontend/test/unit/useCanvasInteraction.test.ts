import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Cell } from "@/features/gameplay/canvas";
import { useCanvasInteraction } from "@/features/gameplay/canvas/hooks/useCanvasInteraction";

function createPointerEvent(options: {
  currentTarget: HTMLDivElement;
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button?: number;
}) {
  return {
    ...options,
  } as ReactPointerEvent<HTMLDivElement>;
}

describe("useCanvasInteraction", () => {
  it("suppresses cell activation for pinch sequences until every pointer is released", () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    const container = document.createElement("div");
    const canvas = document.createElement("canvas");

    container.appendChild(canvas);
    container.setPointerCapture = vi.fn();
    container.releasePointerCapture = vi.fn();
    canvas.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 160,
      bottom: 160,
      width: 160,
      height: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    const onActivateCell = vi.fn();
    const onPan = vi.fn();
    const cells: Cell[] = [{ x: 1, y: 1, color: null, status: "idle" }];

    const { result } = renderHook(() =>
      useCanvasInteraction({
        canvasRef: { current: canvas },
        cells,
        gridX: 10,
        gridY: 10,
        cameraX: 0,
        cameraY: 0,
        zoom: 1,
        worldOffsetX: 0,
        worldOffsetY: 0,
        onPan,
        onActivateCell,
      }),
    );

    act(() => {
      now = 0;
      result.current.handlePointerDown(
        createPointerEvent({
          currentTarget: container,
          pointerId: 1,
          pointerType: "touch",
          clientX: 10,
          clientY: 10,
        }),
      );
      result.current.handlePointerDown(
        createPointerEvent({
          currentTarget: container,
          pointerId: 2,
          pointerType: "touch",
          clientX: 24,
          clientY: 24,
        }),
      );
      result.current.handlePointerUp(
        createPointerEvent({
          currentTarget: container,
          pointerId: 2,
          pointerType: "touch",
          clientX: 24,
          clientY: 24,
        }),
      );
      result.current.handlePointerUp(
        createPointerEvent({
          currentTarget: container,
          pointerId: 1,
          pointerType: "touch",
          clientX: 10,
          clientY: 10,
        }),
      );
    });

    expect(onActivateCell).not.toHaveBeenCalled();

    act(() => {
      now = 1_000;
      result.current.handlePointerDown(
        createPointerEvent({
          currentTarget: container,
          pointerId: 3,
          pointerType: "touch",
          clientX: 10,
          clientY: 10,
        }),
      );
      result.current.handlePointerUp(
        createPointerEvent({
          currentTarget: container,
          pointerId: 3,
          pointerType: "touch",
          clientX: 10,
          clientY: 10,
        }),
      );
    });

    expect(onActivateCell).toHaveBeenCalledTimes(1);
    expect(onPan).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
