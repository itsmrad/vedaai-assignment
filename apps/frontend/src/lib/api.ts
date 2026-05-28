// Thin fetch wrapper for the VedaAI backend.
// Reads NEXT_PUBLIC_API_URL with a sensible localhost default.

import type { Assignment, QuestionPaper } from "@/lib/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | null | object;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const isJsonBody =
    options?.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer) &&
    typeof options.body === "object";

  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");
  if (isJsonBody) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: isJsonBody ? JSON.stringify(options!.body) : (options?.body as BodyInit | null | undefined),
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const err = isJson ? body.error : { message: body };
    throw new ApiError(
      res.status,
      err?.message ?? `Request failed: ${res.status}`,
      err?.code,
      err?.details,
    );
  }
  return body as T;
}

export const api = {
  listAssignments: (limit = 50) =>
    request<{ items: Assignment[] }>(`/api/assignments?limit=${limit}`),

  getAssignment: (id: string) =>
    request<{ assignment: Assignment }>(`/api/assignments/${id}`),

  getPaper: (id: string) =>
    request<{ paper: QuestionPaper }>(`/api/assignments/${id}/paper`),

  createAssignment: (form: FormData) =>
    request<{ assignment: Assignment }>(`/api/assignments`, {
      method: "POST",
      body: form,
    }),

  regenerate: (id: string) =>
    request<{ assignment: Assignment }>(
      `/api/assignments/${id}/regenerate`,
      { method: "POST" },
    ),

  regenerateWithFeedback: (
    id: string,
    feedback: Array<{ sectionLabel: string; comment: string }>,
  ) =>
    request<{ assignment: Assignment }>(
      `/api/assignments/${id}/regenerate`,
      { method: "POST", body: { feedback } },
    ),

  deleteAssignment: (id: string) =>
    request<void>(`/api/assignments/${id}`, { method: "DELETE" }),

  // PDF endpoint: 202 means "rendering, retry later". We return a discriminated
  // union so callers can handle both polling and binary download cleanly.
  fetchPdf: async (
    id: string,
    student?: { studentName?: string; rollNumber?: string; section?: string },
  ): Promise<
    | { status: "ready"; blob: Blob }
    | { status: "rendering"; retryAfterMs: number }
  > => {
    const params = new URLSearchParams();
    if (student?.studentName) params.set("studentName", student.studentName);
    if (student?.rollNumber) params.set("rollNumber", student.rollNumber);
    if (student?.section) params.set("section", student.section);
    const qs = params.toString();
    const res = await fetch(
      `${API_URL}/api/assignments/${id}/pdf${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
    if (res.status === 202) {
      const json = await res.json();
      return { status: "rendering", retryAfterMs: json.retryAfterMs ?? 1500 };
    }
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, `PDF request failed: ${text}`);
    }
    return { status: "ready", blob: await res.blob() };
  },
};
