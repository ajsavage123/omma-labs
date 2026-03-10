import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from '../projectService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    }
  }
}));

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should fetch all projects ordered by created_at', async () => {
      const mockData = [{ id: '1', name: 'Test project' }];
      (supabase.from as any)().select().order.mockResolvedValue({ data: mockData, error: null });

      const result = await projectService.getProjects();

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(result).toEqual(mockData);
    });

    it('should throw error if retrieval fails', async () => {
      const mockError = { message: 'Failed to fetch' };
      (supabase.from as any)().select().order.mockResolvedValue({ data: null, error: mockError });

      await expect(projectService.getProjects()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('getProjectById', () => {
    it('should fetch single project by ID', async () => {
      const mockData = { id: '1', name: 'Test project' };
      (supabase.from as any)().select().eq().single.mockResolvedValue({ data: mockData, error: null });

      const result = await projectService.getProjectById('1');

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(result).toEqual(mockData);
    });
  });
});
