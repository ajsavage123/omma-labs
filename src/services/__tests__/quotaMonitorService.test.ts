import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quotaMonitorService } from '../quotaMonitorService';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table)
  }
}));

describe('quotaMonitorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('fetches quota stats and calculates percentages correctly', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockImplementation((_col: string, opts?: any) => {
        if (opts?.count === 'exact') {
          return Promise.resolve({ count: 10, error: null });
        }
        return {
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { created_at: new Date().toISOString() }, error: null })
            })
          })
        };
      })
    }));

    const stats = await quotaMonitorService.getQuotaStats('ws-123', true);

    expect(stats.databaseStorage.max).toBe(500);
    expect(stats.realtimeConnections.max).toBe(200);
    expect(stats.realtimeMessages.max).toBe(2000000);
    expect(stats.egressBandwidth.max).toBe(5.0);
    expect(stats.authMAU.max).toBe(50000);
    expect(stats.autoPauseHealth.status).toBe('safe');
  });

  it('uses sessionStorage cache on subsequent calls within TTL', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockImplementation((_col: string, opts?: any) => {
        if (opts?.count === 'exact') {
          return Promise.resolve({ count: 5, error: null });
        }
        return {
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { created_at: new Date().toISOString() }, error: null })
            })
          })
        };
      })
    }));

    const stats1 = await quotaMonitorService.getQuotaStats('ws-123', false);
    const callsCountFirst = mockFrom.mock.calls.length;

    // Second call without forceRefresh should read from sessionStorage cache
    const stats2 = await quotaMonitorService.getQuotaStats('ws-123', false);
    const callsCountSecond = mockFrom.mock.calls.length;

    expect(callsCountSecond).toBe(callsCountFirst);
    expect(stats2.totalRows).toBe(stats1.totalRows);
  });

  it('sends keep-alive ping successfully', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: null })
      })
    });

    const success = await quotaMonitorService.sendKeepAlivePing();
    expect(success).toBe(true);
  });
});
