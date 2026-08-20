import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeadScoring } from '../useLeadScoring';

describe('useLeadScoring', () => {
  it('assigns 100 to Won leads instantly', () => {
    const leads = [{ id: '1', status: 'Won (Converted)', created_at: new Date().toISOString() }];
    const { result } = renderHook(() => useLeadScoring(leads, [], []));
    expect(result.current[0].propensityScore).toBe(100);
  });

  it('assigns 0 to Lost leads instantly', () => {
    const leads = [{ id: '1', status: 'Lost', created_at: new Date().toISOString() }];
    const { result } = renderHook(() => useLeadScoring(leads, [], []));
    expect(result.current[0].propensityScore).toBe(0);
  });

  it('calculates score for active lead accurately', () => {
    const leads = [{
      id: '1',
      status: 'Negotiation', // +35
      email: 'test@test.com', // +3
      phone: '123456', // +3
      estimated_value: 1000, // +4
      created_at: new Date().toISOString(),
    }];

    const activities = [
      { lead_id: '1', created_at: new Date().toISOString() }, // +5 (activity) +10 (recent <7 days)
      { lead_id: '1', created_at: new Date().toISOString() }, // +5
    ];

    const tasks = [
      { lead_id: '1', status: 'Completed' }, // +5
      { lead_id: '1', status: 'Pending' }, // +5
    ];

    const { result } = renderHook(() => useLeadScoring(leads, activities, tasks));
    // Score should be:
    // Stage: 35
    // Data: 3 + 3 + 4 = 10
    // Activities: 5 * 2 = 10
    // Recency: 10
    // Tasks: 5 (completed) + 5 (pending) = 10
    // Total: 35 + 10 + 10 + 10 + 10 = 75
    expect(result.current[0].propensityScore).toBe(75);
  });
});
