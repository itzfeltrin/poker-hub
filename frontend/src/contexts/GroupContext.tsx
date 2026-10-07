import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiChampionship } from "@poker-hub/db";
import { championshipContainsDate } from "@poker-hub/db";

const GROUP_STORAGE_KEY = "poker-hub:selected-group-id";
const CHAMP_STORAGE_PREFIX = "poker-hub:championship:";

type GroupScopeValue = {
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  selectedChampionshipId: string | null;
  setSelectedChampionshipId: (id: string | null) => void;
};

const GroupScopeContext = createContext<GroupScopeValue | null>(null);

function readStoredChampionship(groupId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CHAMP_STORAGE_PREFIX + groupId);
}

function writeStoredChampionship(groupId: string, value: string) {
  window.localStorage.setItem(CHAMP_STORAGE_PREFIX + groupId, value);
}

export function GroupScopeProvider({ children }: { children: React.ReactNode }) {
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      const v = window.localStorage.getItem(GROUP_STORAGE_KEY);
      if (v === null || v === "" || v === "all") return null;
      return v;
    },
  );
  const [selectedChampionshipId, setSelectedChampionshipIdState] = useState<
    string | null
  >(null);

  const setSelectedGroupId = useCallback((id: string | null) => {
    setSelectedGroupIdState(id);
    setSelectedChampionshipIdState(null);
  }, []);

  const setSelectedChampionshipId = useCallback(
    (id: string | null) => {
      setSelectedChampionshipIdState(id);
      if (!selectedGroupId) return;
      writeStoredChampionship(selectedGroupId, id ?? "all");
    },
    [selectedGroupId],
  );

  useEffect(() => {
    if (selectedGroupId === null) {
      window.localStorage.removeItem(GROUP_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GROUP_STORAGE_KEY, selectedGroupId);
    }
  }, [selectedGroupId]);

  const value = useMemo(
    () => ({
      selectedGroupId,
      setSelectedGroupId,
      selectedChampionshipId,
      setSelectedChampionshipId,
    }),
    [
      selectedGroupId,
      setSelectedGroupId,
      selectedChampionshipId,
      setSelectedChampionshipId,
    ],
  );

  return (
    <GroupScopeContext.Provider value={value}>
      {children}
    </GroupScopeContext.Provider>
  );
}

export function useGroupScope() {
  const ctx = useContext(GroupScopeContext);
  if (!ctx) {
    throw new Error("useGroupScope must be used within GroupScopeProvider");
  }
  return ctx;
}

/** Resolve championship selection when the group or list changes. */
export function useSyncChampionshipSelection(
  championships: ApiChampionship[] | undefined,
  isReady: boolean,
) {
  const {
    selectedGroupId,
    selectedChampionshipId,
    setSelectedChampionshipId,
  } = useGroupScope();

  useEffect(() => {
    if (!selectedGroupId) return;
    if (!isReady) return;
    const list = championships ?? [];
    const stored = readStoredChampionship(selectedGroupId);
    if (stored === "all") {
      if (selectedChampionshipId !== null) setSelectedChampionshipId(null);
      return;
    }
    if (stored && list.some((row) => row.id === stored)) {
      if (selectedChampionshipId !== stored) setSelectedChampionshipId(stored);
      return;
    }
    const today = new Date().toISOString();
    const current = list.find((row) =>
      championshipContainsDate(row.startDate, row.endDate, today),
    );
    const next = current?.id ?? null;
    if (selectedChampionshipId !== next) setSelectedChampionshipId(next);
  }, [
    selectedGroupId,
    championships,
    isReady,
    selectedChampionshipId,
    setSelectedChampionshipId,
  ]);
}
