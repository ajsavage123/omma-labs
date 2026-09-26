import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeadScoring } from '../useLeadScoring';

describe('useLeadScoring', () => {
  it('returns empty array when no leads are provided', () => {
    const { result } = renderHook(() => useLeadScoring());
    expect(result.current).toEqual([]);
  });

  it('assigns instant 100 for Won (Converted) or Completed leads', () => {
    const leads = [
      { id: '1', status: 'Won (Converted)', created_at: '2026-01-01' },
      { id: '2', status: 'Completed', created_at: '2026-01-01' },
    ];
    const { result } = renderHook(() => useLeadScoring(leads));
    expect(result.current[0].propensityScore).toBe(100);
    expect(result.current[1].propensityScore).toBe(100);
  });

  it('assigns instant 0 for Lost or Not Interested leads', () => {
    const leads = [
      { id: '1', status: 'Lost', created_at: '2026-01-01' },
      { id: '2', status: 'Not Interested', created_at: '2026-01-01' },
    ];
    const { result } = renderHook(() => useLeadScoring(leads));
    expect(result.current[0].propensityScore).toBe(0);
    expect(result.current[1].propensityScore).toBe(0);
  });

  it('computes stage weights accurately', () => {
    const stages = [
      { status: 'Negotiation', expected: 35 },
      { status: 'Proposal Sent', expected: 25 },
      { status: 'Interested', expected: 15 },
      { status: 'Contacted', expected: 10 },
      { status: 'New Leads', expected: 5 },
      { status: 'Other Status', expected: 0 },
    ];

    const leads = stages.map((s, idx) => ({
      id: `lead-${idx}`,
      status: s.status,
      created_at: '2026-01-01',
    }));

    const { result } = renderHook(() => useLeadScoring(leads));
    stages.forEach((s, idx) => {
      expect(result.current[idx].propensityScore).toBe(s.expected);
    });
  });

  it('adds interaction history points up to max 30', () => {
    const leads = [{ id: 'l1', status: 'New Leads', created_at: '2026-01-01' }]; // 5 base stage
    // 7 activities = 35 pts, capped at 30 pts. Activity created over 30 days ago to avoid recency bonus.
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const activities = Array.from({ length: 7 }, (_, i) => ({
      id: `a-${i}`,
      lead_id: 'l1',
      created_at: oldDate,
    }));

    const { result } = renderHook(() => useLeadScoring(leads, activities));
    // 5 stage + 30 activities = 35
    expect(result.current[0].propensityScore).toBe(35);
  });

  it('evaluates task discipline with pending and completed tasks', () => {
    const leads = [{ id: 'l1', status: 'Contacted', created_at: '2026-01-01' }]; // 10 base stage
    const tasks = [
      { id: 't1', lead_id: 'l1', status: 'Completed' }, // +5
      { id: 't2', lead_id: 'l1', status: 'Completed' }, // +5 (max completed is 10)
      { id: 't3', lead_id: 'l1', status: 'Completed' }, // exceeds 10 completed cap
      { id: 't4', lead_id: 'l1', status: 'Pending' },   // +5 hasPending
    ];

    const { result } = renderHook(() => useLeadScoring(leads, [], tasks));
    // 10 stage + 10 completed + 5 pending = 25
    expect(result.current[0].propensityScore).toBe(25);
  });

  it('adds data completeness points (email, phone, estimated_value)', () => {
    const leadPartial = {
      id: 'l1',
      status: 'New Leads', // 5
      email: 'sales@example.com', // +3
      created_at: '2026-01-01',
    };
    const leadFull = {
      id: 'l2',
      status: 'New Leads', // 5
      email: 'sales@example.com', // +3
      phone: '+1234567890', // +3
      estimated_value: 50000, // +4
      created_at: '2026-01-01',
    };

    const { result } = renderHook(() => useLeadScoring([leadPartial, leadFull]));
    expect(result.current[0].propensityScore).toBe(8); // 5 + 3
    expect(result.current[1].propensityScore).toBe(15); // 5 + 3 + 3 + 4
  });

  it('adds recency bonus for recent activities and caps score at 99', () => {
    const lead = {
      id: 'l1',
      status: 'Negotiation', // 35
      email: 'test@example.com', // +3
      phone: '12345', // +3
      estimated_value: 100000, // +4
      created_at: '2026-01-01',
    };
    // 6 activities from yesterday (30 max) + recency <= 7 days (+10)
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const activities = Array.from({ length: 6 }, (_, i) => ({
      id: `act-${i}`,
      lead_id: 'l1',
      created_at: recentDate,
    }));
    // Tasks: 2 completed (10) + 1 pending (5) = +15
    const tasks = [
      { id: 't1', lead_id: 'l1', status: 'Completed' },
      { id: 't2', lead_id: 'l1', status: 'Completed' },
      { id: 't3', lead_id: 'l1', status: 'Pending' },
    ];

    // Raw total: 35 (stage) + 30 (activities) + 15 (tasks) + 10 (data) + 10 (recency) = 100
    // But capped at 99 because active lead!
    const { result } = renderHook(() => useLeadScoring([lead], activities, tasks));
    expect(result.current[0].propensityScore).toBe(99);
  });
});
