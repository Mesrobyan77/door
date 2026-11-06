"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { useLatestRef } from "@/lib/react/use-latest-ref";

const DISMISS_THRESHOLD_PX = 120;
const SCROLL_DRAG_ARM_PX = 10;

type DragSession = {
  pointerId: number;
  startClientY: number;
};

type UseProfileMobileSheetDragArgs = {
  enabled: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  onDismiss: (releaseOffsetY: number) => void;
  onSnapBack: () => void;
  /** Live drag offset while the finger is down (px). */
  onOffsetChange: (offsetY: number) => void;
};

type UseProfileMobileSheetDragResult = {
  headerPointerHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  scrollAreaPointerHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  panelPointerHandlers: {
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  clearSessions: () => void;
};

/**
 * MaMarie-style dismiss drag. Applies transform imperatively during the gesture
 * so React state updates cannot fight the finger.
 */
export function useProfileMobileSheetDrag({
  enabled,
  panelRef,
  scrollAreaRef,
  onDismiss,
  onSnapBack,
  onOffsetChange,
}: UseProfileMobileSheetDragArgs): UseProfileMobileSheetDragResult {
  const activeDragRef = useRef<DragSession | null>(null);
  const pendingScrollDragRef = useRef<DragSession | null>(null);
  const latestOffsetRef = useRef(0);
  const onDismissRef = useLatestRef(onDismiss);
  const onSnapBackRef = useLatestRef(onSnapBack);
  const onOffsetChangeRef = useLatestRef(onOffsetChange);

  const clearSessions = useCallback(() => {
    activeDragRef.current = null;
    pendingScrollDragRef.current = null;
  }, []);

  const applyOffset = useCallback(
    (offsetY: number, withTransition: boolean) => {
      const panel = panelRef.current;
      if (!panel) return;
      latestOffsetRef.current = offsetY;
      panel.style.transition = withTransition
        ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
        : "none";
      panel.style.transform =
        offsetY > 0 ? `translateY(${offsetY}px)` : "translateY(0)";
      onOffsetChangeRef.current(offsetY);
    },
    [panelRef, onOffsetChangeRef],
  );

  const beginDrag = useCallback(
    (pointerId: number, startClientY: number) => {
      activeDragRef.current = { pointerId, startClientY };
      pendingScrollDragRef.current = null;
      panelRef.current?.setPointerCapture(pointerId);
    },
    [panelRef],
  );

  const onHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      beginDrag(event.pointerId, event.clientY);
    },
    [beginDrag, enabled],
  );

  const onScrollAreaPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if ((scrollAreaRef.current?.scrollTop ?? 0) > 0) return;
      pendingScrollDragRef.current = {
        pointerId: event.pointerId,
        startClientY: event.clientY,
      };
    },
    [enabled, scrollAreaRef],
  );

  const onPanelPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const active = activeDragRef.current;
      if (active && active.pointerId === event.pointerId) {
        const offsetY = Math.max(0, event.clientY - active.startClientY);
        applyOffset(offsetY, false);
        if (offsetY > 0) {
          event.preventDefault();
        }
        return;
      }

      const pending = pendingScrollDragRef.current;
      if (!pending || pending.pointerId !== event.pointerId) return;

      const deltaY = event.clientY - pending.startClientY;
      if (deltaY < -SCROLL_DRAG_ARM_PX) {
        pendingScrollDragRef.current = null;
        return;
      }
      if (deltaY <= SCROLL_DRAG_ARM_PX) return;
      if ((scrollAreaRef.current?.scrollTop ?? 0) > 0) return;

      beginDrag(event.pointerId, pending.startClientY);
      applyOffset(deltaY, false);
      event.preventDefault();
    },
    [applyOffset, beginDrag, scrollAreaRef],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pendingScrollDragRef.current = null;
      const active = activeDragRef.current;
      if (!active || active.pointerId !== event.pointerId) return;

      if (panelRef.current?.hasPointerCapture(event.pointerId)) {
        panelRef.current.releasePointerCapture(event.pointerId);
      }

      const offsetY = Math.max(0, event.clientY - active.startClientY);
      activeDragRef.current = null;

      if (offsetY >= DISMISS_THRESHOLD_PX) {
        onDismissRef.current(offsetY);
        return;
      }

      applyOffset(0, true);
      onSnapBackRef.current();
    },
    [applyOffset, panelRef, onDismissRef, onSnapBackRef],
  );

  useEffect(() => {
    if (!enabled) {
      clearSessions();
    }
  }, [clearSessions, enabled]);

  return {
    headerPointerHandlers: { onPointerDown: onHeaderPointerDown },
    scrollAreaPointerHandlers: { onPointerDown: onScrollAreaPointerDown },
    panelPointerHandlers: {
      onPointerMove: onPanelPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    clearSessions,
  };
}
