import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crmAccessService } from '../crmAccessService';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('crmAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccessStatus', () => {
    it('returns the access status when a record exists', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'approved' },
        error: null,
      });
      const mockEqWorkspace = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqWorkspace });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const status = await crmAccessService.getAccessStatus('u1', 'ws1');

      expect(supabase.from).toHaveBeenCalledWith('crm_access');
      expect(mockSelect).toHaveBeenCalledWith('status');
      expect(mockEqUser).toHaveBeenCalledWith('user_id', 'u1');
      expect(mockEqWorkspace).toHaveBeenCalledWith('workspace_id', 'ws1');
      expect(status).toBe('approved');
    });

    it('returns "none" when PGRST116 (not found) error is returned', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });
      const mockEqWorkspace = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqWorkspace });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const status = await crmAccessService.getAccessStatus('u1', 'ws1');
      expect(status).toBe('none');
    });

    it('returns null and logs error on other database errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Internal Server Error' },
      });
      const mockEqWorkspace = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqWorkspace });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const status = await crmAccessService.getAccessStatus('u1', 'ws1');
      expect(status).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching CRM access status:',
        expect.anything()
      );
      consoleSpy.mockRestore();
    });
  });

  describe('requestAccess', () => {
    it('upserts a pending access record successfully', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

      await expect(
        crmAccessService.requestAccess('u1', 'ws1')
      ).resolves.not.toThrow();

      expect(supabase.from).toHaveBeenCalledWith('crm_access');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          workspace_id: 'ws1',
          status: 'pending',
          requested_at: expect.any(String),
        })
      );
    });

    it('throws error when upsert fails', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({
        error: new Error('Upsert failed'),
      });
      vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

      await expect(
        crmAccessService.requestAccess('u1', 'ws1')
      ).rejects.toThrow('Upsert failed');
    });
  });

  describe('getPendingRequests', () => {
    it('queries and returns pending requests for the workspace', async () => {
      const mockData = [
        { id: 'req-1', user_id: 'u1', status: 'pending', users: { username: 'john' } },
      ];
      const mockEqStatus = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEqWorkspace = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqWorkspace });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await crmAccessService.getPendingRequests('ws1');

      expect(supabase.from).toHaveBeenCalledWith('crm_access');
      expect(mockSelect).toHaveBeenCalledWith('*, users(username, designation)');
      expect(mockEqWorkspace).toHaveBeenCalledWith('workspace_id', 'ws1');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
      expect(result).toEqual(mockData);
    });

    it('throws error when query fails', async () => {
      const mockEqStatus = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Query error'),
      });
      const mockEqWorkspace = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqWorkspace });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      await expect(
        crmAccessService.getPendingRequests('ws1')
      ).rejects.toThrow('Query error');
    });
  });

  describe('updateRequestStatus', () => {
    it('updates request status and processed_at timestamp', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      await expect(
        crmAccessService.updateRequestStatus('req-1', 'approved')
      ).resolves.not.toThrow();

      expect(supabase.from).toHaveBeenCalledWith('crm_access');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          processed_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'req-1');
    });

    it('throws error when update fails', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: new Error('Update failed'),
      });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      await expect(
        crmAccessService.updateRequestStatus('req-1', 'rejected')
      ).rejects.toThrow('Update failed');
    });
  });
});
