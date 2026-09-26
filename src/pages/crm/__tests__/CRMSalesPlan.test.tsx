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

const renderSalesPlan = () => {
  return render(
    <MemoryRouter>
      <CRMSalesPlan />
    </MemoryRouter>
  );
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

  it('renders the header with 7-Day Sales To-Do and repeating cycle badge', async () => {
    renderSalesPlan();
    expect(screen.getByText('7-Day Sales To-Do')).toBeInTheDocument();
    expect(screen.getByText('Repeating Cycle')).toBeInTheDocument();
  });

  it('renders all Day 1 through Day 7 navigation pills', async () => {
    renderSalesPlan();
    for (let day = 1; day <= 7; day++) {
      expect(screen.getByText(`Day ${day}`)).toBeInTheDocument();
    }
  });

  it('displays Day 1 tasks with inline tool buttons (Google Maps, Justdial, Sulekha, + Add to CRM)', async () => {
    renderSalesPlan();
    // Click Day 1 to ensure active view
    fireEvent.click(screen.getByText('Day 1'));

    expect(screen.getByText('Discover Local & Regional Target Businesses')).toBeInTheDocument();
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
    expect(screen.getAllByText('Justdial').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sulekha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+ Add to CRM')).toBeInTheDocument();
  });

  it('navigating to Day 3 renders Research & Qualification tasks and inline classification buttons', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 3'));

    expect(screen.getByText('Deep-Dive Company Background & Digital Presence')).toBeInTheDocument();
    expect(screen.getByText('Classify Lead Temperature in CRM (Hot, Warm, Cold)')).toBeInTheDocument();
    expect(screen.getByText('Company Website')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn Company')).toBeInTheDocument();
    expect(screen.getByText('Apollo.io')).toBeInTheDocument();
    expect(screen.getByText('Classify Hot 🔥')).toBeInTheDocument();
    expect(screen.getByText('Classify Warm ☀️')).toBeInTheDocument();
    expect(screen.getByText('Classify Cold ❄️')).toBeInTheDocument();
  });

  it('navigating to Day 4 renders outreach tasks with Phone, WhatsApp, Gmail, LinkedIn', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 4'));

    expect(screen.getByText('Direct Phone Calls to High-Priority Prospects')).toBeInTheDocument();
    expect(screen.getByText('Personalized WhatsApp Business Intro Messages')).toBeInTheDocument();
    expect(screen.getByText('Phone / Dialer')).toBeInTheDocument();
    expect(screen.getByText('Log Call in CRM')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
  });

  it('navigating to Day 5 renders meeting scheduling tools (Google Meet, Zoom, CRM Calendar)', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 5'));

    expect(screen.getByText('Schedule Discovery Meetings on Google Meet or Zoom')).toBeInTheDocument();
    expect(screen.getByText('Google Meet')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Schedule Meeting in CRM')).toBeInTheDocument();
  });

  it('navigating to Day 6 renders portfolio sharing and pipeline progression tools', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 6'));

    expect(screen.getByText('Share OomaLabs Portfolio & Case Studies')).toBeInTheDocument();
    expect(screen.getByText('Advance Good Opportunities in CRM Pipeline')).toBeInTheDocument();
    expect(screen.getByText('OomaLabs Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Service Menu Card')).toBeInTheDocument();
    expect(screen.getByText('Open CRM Pipeline')).toBeInTheDocument();
  });

  it('navigating to Day 7 renders performance review and report submission controls', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 7'));

    expect(screen.getByText('Review CRM History & Activity Proof')).toBeInTheDocument();
    expect(screen.getByText('Submit 7-Day Performance Report for Manager Sign-off')).toBeInTheDocument();
    expect(screen.getByText('CRM Analytics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Generate & Submit Report')).toBeInTheDocument();
  });

  it('allows checking off a task and updates completion state', async () => {
    renderSalesPlan();
    fireEvent.click(screen.getByText('Day 1'));

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

    const managerAuditBtn = screen.getByRole('button', { name: /Manager Audit/i });
    fireEvent.click(managerAuditBtn);

    expect(screen.getByText('Auditing Sales Rep:')).toBeInTheDocument();
    expect(screen.getByText(/Manager mode verifies actual database activity/i)).toBeInTheDocument();

    // Rep selector exists
    const repSelect = screen.getByRole('combobox');
    expect(repSelect).toBeInTheDocument();
    expect(screen.getByText('Alex Sales (Sales Head)')).toBeInTheDocument();
  });
});
