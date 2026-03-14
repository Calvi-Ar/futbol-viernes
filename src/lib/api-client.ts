/**
 * Wrapper around fetch that injects the x-group-id header from localStorage.
 */
export function groupFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const groupId =
    typeof window !== "undefined"
      ? localStorage.getItem("futbol-current-group-id") ?? ""
      : "";

  const headers = new Headers(init?.headers);
  if (groupId) {
    headers.set("x-group-id", groupId);
  }

  return fetch(input, { ...init, headers });
}
