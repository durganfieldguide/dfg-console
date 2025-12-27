'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MockModeStore {
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
}

export const useMockMode = create<MockModeStore>()(
  persist(
    (set) => ({
      useMockData: false, // Default to live data in production
      setUseMockData: (value) => set({ useMockData: value }),
    }),
    {
      name: 'dfg-mock-mode',
    }
  )
);
