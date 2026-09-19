"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export function usePublishedContent<T>(resource: "services" | "portfolio" | "careers" | "downloads") {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Record<string, T[]>>(`/${resource}`, { signal: controller.signal, cache: "no-store" })
      .then((data) => { if (!controller.signal.aborted) setItems(data[resource]); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resource, attempt]);
  return { items, loading, error, retry: () => { setLoading(true); setError(false); setAttempt((value) => value + 1); } };
}
