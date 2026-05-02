/**
 * Typed API client for AgentBoard
 * Provides strongly-typed functions to fetch data from http://localhost:8000/api
 */

const API_BASE = 'http://localhost:8000/api';

/**
 * Handles API responses and throws errors for non-2xx status codes
 */
async function fetchJSON<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

/**
 * Build query string from parameters
 */
function buildQueryString(params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  }

  const qs = queryParams.toString();
  return qs ? `?${qs}` : '';
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface Column {
  id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  slug: string;
  title: string;
  assignee: string | null;
  column_id: number;
  epic_id: number | null;
  created_at?: string;
  updated_at?: string;
  excerpt?: string;
}

export interface TaskDetail extends Task {
  content: string;
  content_error?: string;
}

export interface Epic {
  id: number;
  slug: string;
  title: string;
  assignee: string | null;
  column_id: number;
  task_count?: number;
  done_count?: number;
  created_at?: string;
  updated_at?: string;
  excerpt?: string;
}

export interface EpicDetail extends Epic {
  content: string;
  content_error?: string;
}

export interface Comment {
  id: number;
  author: string;
  body: string;
  created_at: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Fetch all tasks, optionally filtered
 */
export async function getTasks(filters?: {
  column_id?: number;
  epic_id?: number;
  assignee?: string;
}): Promise<Task[]> {
  const qs = buildQueryString(filters);
  return fetchJSON<Task[]>(`${API_BASE}/tasks${qs}`);
}

/**
 * Fetch all columns
 */
export async function getColumns(): Promise<Column[]> {
  return fetchJSON<Column[]>(`${API_BASE}/columns`);
}

/**
 * Fetch all epics, optionally filtered
 */
export async function getEpics(filters?: {
  column_id?: number;
  assignee?: string;
}): Promise<Epic[]> {
  const qs = buildQueryString(filters);
  return fetchJSON<Epic[]>(`${API_BASE}/epics${qs}`);
}

/**
 * Fetch a single task by ID
 */
export async function getTask(id: number): Promise<TaskDetail> {
  return fetchJSON<TaskDetail>(`${API_BASE}/tasks/${id}`);
}

/**
 * Fetch a single epic by ID
 */
export async function getEpic(id: number): Promise<EpicDetail> {
  return fetchJSON<EpicDetail>(`${API_BASE}/epics/${id}`);
}

/**
 * Fetch comments for a task
 */
export async function getTaskComments(taskId: number): Promise<Comment[]> {
  return fetchJSON<Comment[]>(`${API_BASE}/tasks/${taskId}/comments`);
}

/**
 * Fetch comments for an epic
 */
export async function getEpicComments(epicId: number): Promise<Comment[]> {
  return fetchJSON<Comment[]>(`${API_BASE}/epics/${epicId}/comments`);
}

/**
 * Post a comment on a task
 */
export async function postTaskComment(
  taskId: number,
  author: string,
  body: string
): Promise<Comment> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ author, body }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Post a comment on an epic
 */
export async function postEpicComment(
  epicId: number,
  author: string,
  body: string
): Promise<Comment> {
  const response = await fetch(`${API_BASE}/epics/${epicId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ author, body }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Reorder columns on the backend
 */
export async function patchColumnsReorder(ids: number[]): Promise<any> {
  const response = await fetch(`${API_BASE}/columns/reorder`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
