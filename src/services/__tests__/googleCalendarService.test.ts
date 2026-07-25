import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleCalendarService, type LinkedAccount } from '../googleCalendarService';

describe('googleCalendarService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('manages Client ID in localStorage', () => {
    expect(googleCalendarService.getClientId()).toBe('');
    googleCalendarService.setClientId('test-client-id');
    expect(googleCalendarService.getClientId()).toBe('test-client-id');
  });

  it('manages linked accounts in localStorage', () => {
    const mockAccounts: LinkedAccount[] = [
      { email: 'test1@example.com', name: 'User 1', token: 'token-1', expiresAt: Date.now() + 100000 },
      { email: 'test2@example.com', name: 'User 2', token: 'token-2', expiresAt: Date.now() + 100000 }
    ];

    expect(googleCalendarService.getLinkedAccounts()).toEqual([]);
    googleCalendarService.saveLinkedAccounts(mockAccounts);
    expect(googleCalendarService.getLinkedAccounts()).toEqual(mockAccounts);

    googleCalendarService.disconnectAccount('test1@example.com');
    expect(googleCalendarService.getLinkedAccounts()).toEqual([mockAccounts[1]]);
  });

  it('syncs a task successfully to Google Calendar', async () => {
    const mockAccount: LinkedAccount = {
      email: 'test@example.com',
      name: 'Test User',
      token: 'valid-token',
      expiresAt: Date.now() + 100000
    };
    googleCalendarService.saveLinkedAccounts([mockAccount]);

    const mockTask = {
      id: 'task-123',
      title: 'Discuss Proposal',
      activity_type: 'Meeting',
      priority: 'High',
      status: 'Pending',
      due_date: '2026-07-25',
      due_time: '10:00:00',
      crm_leads: {
        company_name: 'Acme Corp',
        contact_person: 'John Doe',
        email: 'john@acme.com',
        phone: '123456'
      }
    };

    // Mock fetch responses:
    // First fetch: findEventByTaskId -> returns empty list (event doesn't exist yet)
    // Second fetch: POST/create event -> returns mock event
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    } as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'google-event-id' })
    } as any);

    const result = await googleCalendarService.syncTask(mockTask, 'test@example.com', ['invited@example.com']);
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('google-event-id');

    // Verify properties of the created event
    const lastCall = mockFetch.mock.calls[1];
    const postBody = JSON.parse(lastCall[1]?.body as string);
    expect(postBody.summary).toBe('Meeting: Discuss Proposal');
    expect(postBody.attendees).toContainEqual({ email: 'invited@example.com' });
    expect(postBody.extendedProperties.private.crm_task_id).toBe('task-123');
  });

  it('deletes event successfully across active accounts', async () => {
    const mockAccount: LinkedAccount = {
      email: 'test@example.com',
      name: 'Test User',
      token: 'valid-token',
      expiresAt: Date.now() + 100000
    };
    googleCalendarService.saveLinkedAccounts([mockAccount]);

    const mockFetch = vi.mocked(fetch);
    // Mock finding event (exists) and deleting event (success)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: 'google-event-id' }] })
    } as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('')
    } as any);

    await googleCalendarService.deleteTaskEvent('task-123');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const deleteCall = mockFetch.mock.calls[1];
    expect(deleteCall[0]).toContain('/google-event-id');
    expect(deleteCall[1]?.method).toBe('DELETE');
  });

  it('generates prefilled Google Calendar template links correctly', () => {
    const mockTask = {
      title: 'Sales Strategy',
      activity_type: 'Call',
      priority: 'Low',
      status: 'Pending',
      due_date: '2026-07-25',
      due_time: '14:00:00',
      crm_leads: {
        company_name: 'Stark Industries',
        contact_person: 'Pepper Potts',
        email: 'pepper@stark.com'
      }
    };
    
    const url = googleCalendarService.generateGoogleCalendarLink(mockTask, ['invited@stark.com']);
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Call%3A%20Sales%20Strategy');
    expect(url).toContain('dates=20260725T140000/20260725T150000');
    expect(url).toContain('add=invited%40stark.com');
  });

  it('generates prefilled Gmail compose links correctly', () => {
    const mockTask = {
      title: 'Final Meeting',
      activity_type: 'Meeting',
      priority: 'High',
      status: 'Pending',
      due_date: '2026-07-25',
      due_time: '16:30:00'
    };
    const calendarLink = 'http://add-calendar-event';
    
    const url = googleCalendarService.generateGmailComposeLink(mockTask, 'sales@company.com', calendarLink);
    expect(url).toContain('view=cm');
    expect(url).toContain('to=sales%40company.com');
    expect(url).toContain('su=CRM%20Task%20Invite%3A%20Final%20Meeting');
    expect(url).toContain('http%3A%2F%2Fadd-calendar-event');
  });
});
