"use client";

import { createContext, useContext } from "react";

export const CoachPanelContext = createContext<(() => void) | null>(null);

export function useCoachPanel() {
  return useContext(CoachPanelContext);
}
