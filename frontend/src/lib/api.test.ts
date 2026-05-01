import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTasks,
  getColumns,
  getEpics,
  getTask,
  getEpic,
  getTaskComments,
  getEpicComments,
} from './api';

declare global {
  function fetch(url: string): Promise<any>;
}

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch all tasks from /api/tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          slug: 'TASK-001',
          title: 'Task 1',
          assignee: 'alice',
          column_id: 1,
          epic_id: null,
        },
        {
          id: 2,
          slug: 'TASK-002',
          title: 'Task 2',
          assignee: 'bob',
          column_id: 2,
          epic_id: 1,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await getTasks();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should throw error on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getTasks()).rejects.toThrow('API error: 500 Internal Server Error');
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getTasks()).rejects.toThrow('Network error');
    });

    it('should support column_id filter', async () => {
      const mockTasks = [
        {
          id: 1,
          slug: 'TASK-001',
          title: 'Task 1',
          column_id: 1,
          assignee: null,
          epic_id: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await getTasks({ column_id: 1 });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/tasks?column_id=1');
      expect(result).toEqual(mockTasks);
    });
  });

  describe('getColumns', () => {
    it('should fetch all columns from /api/columns', async () => {
      const mockColumns = [
        { id: 1, name: 'Todo', position: 0 },
        { id: 2, name: 'In Progress', position: 1 },
        { id: 3, name: 'Done', position: 2 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockColumns,
      });

      const result = await getColumns();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/columns');
      expect(result).toEqual(mockColumns);
    });

    it('should throw error when columns fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(getColumns()).rejects.toThrow('API error: 404 Not Found');
    });
  });

  describe('getEpics', () => {
    it('should fetch all epics from /api/epics', async () => {
      const mockEpics = [
        {
          id: 1,
          slug: 'EPIC-001',
          title: 'Epic 1',
          assignee: 'alice',
          column_id: 1,
          task_count: 5,
          done_count: 2,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEpics,
      });

      const result = await getEpics();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/epics');
      expect(result).toEqual(mockEpics);
    });

    it('should throw error when epics fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getEpics()).rejects.toThrow('API error: 500 Internal Server Error');
    });
  });

  describe('getTask', () => {
    it('should fetch a single task by id', async () => {
      const mockTask = {
        id: 1,
        slug: 'TASK-001',
        title: 'Task 1',
        content: '# Task Description\n\nThis is a task.',
        metadata: {
          assignee: 'alice',
          column_id: 1,
          created_at: '2026-05-01T10:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTask,
      });

      const result = await getTask(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/tasks/1');
      expect(result).toEqual(mockTask);
    });

    it('should throw error for missing task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(getTask(999)).rejects.toThrow('API error: 404 Not Found');
    });
  });

  describe('getEpic', () => {
    it('should fetch a single epic by id', async () => {
      const mockEpic = {
        id: 1,
        slug: 'EPIC-001',
        title: 'Epic 1',
        content: '# Epic Description',
        metadata: {
          assignee: 'alice',
          column_id: 1,
          task_count: 5,
          done_count: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEpic,
      });

      const result = await getEpic(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/epics/1');
      expect(result).toEqual(mockEpic);
    });

    it('should throw error for missing epic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(getEpic(999)).rejects.toThrow('API error: 404 Not Found');
    });
  });

  describe('getTaskComments', () => {
    it('should fetch comments for a task', async () => {
      const mockComments = [
        {
          id: 1,
          author: 'alice',
          body: 'Great work!',
          created_at: '2026-05-01T10:00:00Z',
        },
        {
          id: 2,
          author: 'bob',
          body: 'Thanks for the feedback.',
          created_at: '2026-05-01T11:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      });

      const result = await getTaskComments(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/tasks/1/comments');
      expect(result).toEqual(mockComments);
    });

    it('should handle empty comments list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await getTaskComments(1);

      expect(result).toEqual([]);
    });

    it('should throw error on task comments fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(getTaskComments(1)).rejects.toThrow('API error: 404 Not Found');
    });
  });

  describe('getEpicComments', () => {
    it('should fetch comments for an epic', async () => {
      const mockComments = [
        {
          id: 1,
          author: 'alice',
          body: 'Starting work on this epic.',
          created_at: '2026-05-01T10:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      });

      const result = await getEpicComments(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/epics/1/comments');
      expect(result).toEqual(mockComments);
    });

    it('should throw error on epic comments fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getEpicComments(1)).rejects.toThrow('API error: 500 Internal Server Error');
    });
  });
});
