import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
const { mockFrom } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock useCRMData
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMSalesPlan from '../CRMSalesPlan';

const renderSalesPlan = (expandAll = true) => {
  const utils = render(
    <MemoryRouter>
      <CRMSalesPlan />
    </MemoryRouter>
  );
  if (expandAll) {
    const expandBtn = screen.queryByText('Expand All');
    if (expandBtn) {
      fireEvent.click(expandBtn);
    }
  }
  return utils;
};

describe('CRMSalesPlan (7-Day Sales To-Do)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockUseAuth.mockReturnValue({
      user: { id: 'rep-1', full_name: 'Alex Sales', role: 'admin', workspace_id: 'ws-test' },
    });

    mockUseCRMData.mockReturnValue({
      teamMembers: [
        { id: 'rep-1', full_name: 'Alex Sales', username: 'alex', designation: 'Sales Head', role: 'admin' },
        { id: 'rep-2', full_name: 'Sarah Rep', username: 'sarah', designation: 'Business Development', role: 'partner' }
      ],
      leads: [
        { id: 'lead-1', company_name: 'Acme Corp', contact_person: 'John Doe', status: 'New Lead' }
      ],
      refreshLeads: vi.fn(),
      refreshActivities: vi.fn(),
      refreshTasks: vi.fn(),
    });

    // Setup chained Supabase mock calls
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('renders the header with 7-Day Sales Plan and cadence badge', async () => {
    renderSalesPlan();
    expect(screen.getByText('7-Day Sales Plan')).toBeInTheDocument();
    expect(screen.getByText('Weekly Cadence')).toBeInTheDocument();
  });

  it('renders all Day 1 through Day 7 navigation and matrix rows', async () => {
    renderSalesPlan();
    for (let day = 1; day <= 7; day++) {
      expect(screen.getAllByText(new RegExp(`Day ${day}`, 'i')).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('displays Day 1 tasks with inline tool buttons (Google Maps, Justdial, Sulekha, + Add to CRM)', async () => {
    renderSalesPlan();
    expect(screen.getByText('Discover Local & Regional Target Businesses')).toBeInTheDocument();
    expect(screen.getAllByText('Google Maps').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Justdial').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sulekha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('+ Add to CRM').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Research & Qualification tasks and inline classification buttons', async () => {
    renderSalesPlan();
    expect(screen.getByText('Deep-Dive Company Background & Digital Presence')).toBeInTheDocument();
    expect(screen.getByText('Classify Lead Temperature in CRM (Hot, Warm, Cold)')).toBeInTheDocument();
    expect(screen.getAllByText('Company Website').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('LinkedIn Company').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Apollo.io').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Classify Hot 🔥').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Classify Warm ☀️').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Classify Cold ❄️').length).toBeGreaterThanOrEqual(1);
  });

  it('renders outreach tasks with Phone, WhatsApp, Gmail, LinkedIn', async () => {
    renderSalesPlan();
    expect(screen.getByText('Direct Phone Calls to High-Priority Prospects')).toBeInTheDocument();
    expect(screen.getByText('Personalized WhatsApp Business Intro Messages')).toBeInTheDocument();
    expect(screen.getAllByText('Phone / Dialer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Log Call in CRM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('WhatsApp Business').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gmail').length).toBeGreaterThanOrEqual(1);
  });

  it('renders meeting scheduling tools (Google Meet, Zoom, CRM Calendar)', async () => {
    renderSalesPlan();
    expect(screen.getByText('Schedule Discovery Meetings on Google Meet or Zoom')).toBeInTheDocument();
    expect(screen.getAllByText('Google Meet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Zoom').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Schedule Meeting in CRM').length).toBeGreaterThanOrEqual(1);
  });

  it('renders portfolio sharing and pipeline progression tools', async () => {
    renderSalesPlan();
    expect(screen.getByText('Share OomaLabs Portfolio & Case Studies')).toBeInTheDocument();
    expect(screen.getByText('Advance Good Opportunities in CRM Pipeline')).toBeInTheDocument();
    expect(screen.getAllByText('OomaLabs Portfolio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Service Menu Card').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Open CRM Pipeline').length).toBeGreaterThanOrEqual(1);
  });

  it('renders performance review and report submission controls', async () => {
    renderSalesPlan();
    expect(screen.getByText('Review CRM History & Activity Proof')).toBeInTheDocument();
    expect(screen.getByText('Submit 7-Day Performance Report for Manager Sign-off')).toBeInTheDocument();
    expect(screen.getAllByText('CRM Analytics & Reports').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Generate & Submit Report').length).toBeGreaterThanOrEqual(1);
  });

  it('allows checking off a task and updates completion state', async () => {
    renderSalesPlan();

    // Find the toggle button for task 1
    const taskButtons = screen.getAllByTitle(/Mark as (completed|pending)/);
    expect(taskButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(taskButtons[0]);
    await waitFor(() => {
      // Local storage should reflect task completion
      const keys = Object.keys(localStorage);
      expect(keys.some(k => k.startsWith('ooma_sales_plan_'))).toBe(true);
    });
  });

  it('enables Manager Audit mode and allows switching between sales reps to view verified metrics', async () => {
    renderSalesPlan();

    const auditBtn = screen.getByRole('button', { name: /Audit Reps/i });
    fireEvent.click(auditBtn);

    expect(screen.getByText('Auditing Rep:')).toBeInTheDocument();

    // Rep selector exists
    const repSelect = screen.getByRole('combobox');
    expect(repSelect).toBeInTheDocument();
    expect(screen.getByText('Alex Sales (Sales Head)')).toBeInTheDocument();
  });
});
