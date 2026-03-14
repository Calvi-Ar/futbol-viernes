"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

export type GroupRole = "owner" | "admin" | "viewer";

export type GroupInfo = {
  groupId: string;
  groupName: string;
  role: GroupRole;
  linkedPlayerId: string | null;
};

type GroupContextValue = {
  groups: GroupInfo[];
  currentGroup: GroupInfo | null;
  setCurrentGroupId: (id: string) => void;
  loading: boolean;
  refetchGroups: () => Promise<void>;
  canEdit: boolean;
};

const GroupContext = createContext<GroupContextValue>({
  groups: [],
  currentGroup: null,
  setCurrentGroupId: () => {},
  loading: true,
  refetchGroups: async () => {},
  canEdit: false,
});

export function useGroup() {
  return useContext(GroupContext);
}

const STORAGE_KEY = "futbol-current-group-id";

export default function GroupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = (await res.json()) as GroupInfo[];
        setGroups(data);
        if (data.length > 0) {
          const savedId =
            typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_KEY)
              : null;
          const match = savedId
            ? data.find((g) => g.groupId === savedId)
            : null;
          const selectedId = match ? match.groupId : data[0].groupId;
          setCurrentGroupId(selectedId);
          localStorage.setItem(STORAGE_KEY, selectedId);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGroups();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchGroups]);

  const handleSetCurrentGroupId = useCallback((id: string) => {
    setCurrentGroupId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const currentGroup =
    groups.find((g) => g.groupId === currentGroupId) ?? null;

  const canEdit =
    currentGroup?.role === "owner" || currentGroup?.role === "admin";

  return (
    <GroupContext.Provider
      value={{
        groups,
        currentGroup,
        setCurrentGroupId: handleSetCurrentGroupId,
        loading,
        refetchGroups: fetchGroups,
        canEdit,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
