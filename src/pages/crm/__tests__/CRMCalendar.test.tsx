import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock CRMDataContext
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMCalendar from '../CRMCalendar';

const renderCalendar = () => {
  return render(
    <MemoryRouter>
      <CRMCalendar />
    </MemoryRouter>
  );
};

describe('CRMCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null during loading', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: true });
    const { container } = renderCalendar();
    expect(container.innerHTML).toBe('');
  });

  it('renders calendar title and page after loading', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders current month name', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(monthName)).toBeInTheDocument();
  });

  it('renders day-of-week headers', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    
    const nextButton = screen.getByTitle('Next month');
    fireEvent.click(nextButton);
    
    // After clicking next, should show next month name
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(nextMonthName)).toBeInTheDocument();
  });

  it('navigates to previous month', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    
    const prevButton = screen.getByTitle('Previous month');
    fireEvent.click(prevButton);
    
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(prevMonthName)).toBeInTheDocument();
  });

  it('shows tasks for selected date', () => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    mockUseCRMData.mockReturnValue({
      tasks: [
        {
          id: 't1',
          title: 'Call Client Alpha',
          due_date: today.toISOString(),
          status: 'Pending',
          crm_leads: { company_name: 'Alpha Corp', contact_person: 'John' }
        },
      ],
      loading: false,
    });
    renderCalendar();
    
    // Click today's date
    const todayButtons = screen.getAllByText(String(today.getDate()));
    // Click the current month's date (might have multiple if prev/next month share a number)
    todayButtons[0].click();
    
    expect(screen.getByText('Call Client Alpha')).toBeInTheDocument();
  });

  it('shows "No tasks on this date" when no tasks exist', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    renderCalendar();
    expect(screen.getByText('No tasks on this date')).toBeInTheDocument();
  });

  it('renders 42 day cells (6 weeks grid)', () => {
    mockUseCRMData.mockReturnValue({ tasks: [], loading: false });
    const { container } = renderCalendar();
    // The grid has 7 columns × 6 rows = 42 buttons (day cells)
    const dayCells = container.querySelectorAll('.grid.grid-cols-7 button');
    expect(dayCells.length).toBe(42);
  });
});
