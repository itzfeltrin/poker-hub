import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "poker-hub:selected-group-id";

type GroupScopeValue = {
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
};

const GroupScopeContext = createContext<GroupScopeValue | null>(null);

export function GroupScopeProvider({ children }: { children: React.ReactNode }) {
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === null || v === "" || v === "all") return null;
      return v;
    },
  );

  const setSelectedGroupId = useCallback((id: string | null) => {
    setSelectedGroupIdState(id);
  }, []);

  useEffect(() => {
    if (selectedGroupId === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, selectedGroupId);
    }
  }, [selectedGroupId]);

  const value = useMemo(
    () => ({ selectedGroupId, setSelectedGroupId }),
    [selectedGroupId, setSelectedGroupId],
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
