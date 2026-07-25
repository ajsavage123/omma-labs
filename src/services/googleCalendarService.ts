export interface LinkedAccount {
  email: string;
  name: string;
  token: string;
  expiresAt: number;
}

export const googleCalendarService = {
  getClientId(): string {
    return localStorage.getItem('google_cal_client_id') || '';
  },

  setClientId(clientId: string): void {
    localStorage.setItem('google_cal_client_id', clientId);
  },

  getLinkedAccounts(): LinkedAccount[] {
    try {
      const data = localStorage.getItem('google_linked_accounts');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveLinkedAccounts(accounts: LinkedAccount[]): void {
    localStorage.setItem('google_linked_accounts', JSON.stringify(accounts));
  },

  disconnectAccount(email: string): void {
    const accounts = this.getLinkedAccounts();
    const updated = accounts.filter(a => a.email !== email);
    this.saveLinkedAccounts(updated);
  },

  async addAccount(clientId: string, onAccessGranted?: (account: LinkedAccount) => void, onError?: (err: any) => void): Promise<void> {
    const google = (window as any).google;
    if (!google) {
      if (onError) onError(new Error("Google Identity Services library not loaded yet."));
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (onError) onError(tokenResponse);
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

          try {
            // Get user profile info (email and name)
            const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const profile = await res.json();
            const email = profile.email;
            const name = profile.name || email.split('@')[0];

            const accounts = this.getLinkedAccounts();
            const existingIdx = accounts.findIndex(a => a.email === email);
            const newAccount: LinkedAccount = { email, name, token: accessToken, expiresAt };

            if (existingIdx >= 0) {
              accounts[existingIdx] = newAccount;
            } else {
              accounts.push(newAccount);
            }

            this.saveLinkedAccounts(accounts);
            if (onAccessGranted) onAccessGranted(newAccount);
          } catch (err) {
            if (onError) onError(err);
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      if (onError) onError(err);
    }
  },

  async findEventByTaskId(account: LinkedAccount, taskId: string): Promise<any | null> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=crm_task_id=${taskId}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${account.token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          console.warn(`Token expired for account ${account.email}`);
        }
        return null;
      }
      const data = await res.json();
      return data.items && data.items.length > 0 ? data.items[0] : null;
    } catch (err) {
      console.error("Error finding Google Calendar event:", err);
      return null;
    }
  },

  async syncTask(task: any, accountEmail: string, customAttendees?: string[]): Promise<any> {
    const accounts = this.getLinkedAccounts();
    const account = accounts.find(a => a.email === accountEmail);
    if (!account) {
      throw new Error(`Google Account ${accountEmail} is not connected.`);
    }

    if (Date.now() > account.expiresAt) {
      throw new Error(`Session expired for ${accountEmail}. Please reconnect this account.`);
    }

    // Build event payload
    const title = `${task.activity_type || 'Task'}: ${task.title}`;
    let description = `CRM Task Details:\n`;
    description += `Status: ${task.status}\n`;
    description += `Priority: ${task.priority}\n`;
    
    if (task.crm_leads) {
      description += `Lead: ${task.crm_leads.contact_person} (${task.crm_leads.company_name})\n`;
      if (task.crm_leads.phone) description += `Phone: ${task.crm_leads.phone}\n`;
      if (task.crm_leads.email) description += `Email: ${task.crm_leads.email}\n`;
    }

    const datePart = new Date(task.due_date).toISOString().split('T')[0];
    let start = {};
    let end = {};

    if (task.due_time) {
      const timePart = task.due_time.length === 5 ? `${task.due_time}:00` : task.due_time;
      const startLocal = `${datePart}T${timePart}`;
      const startDate = new Date(startLocal);
      
      // Default to 1-hour duration
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      start = { dateTime: startDate.toISOString() };
      end = { dateTime: endDate.toISOString() };
    } else {
      // All-day event
      start = { date: datePart };
      const nextDay = new Date(new Date(datePart).getTime() + 24 * 60 * 60 * 1000);
      end = { date: nextDay.toISOString().split('T')[0] };
    }

    const attendeesList = [];
    
    // Add custom attendees if specified
    if (customAttendees && customAttendees.length > 0) {
      customAttendees.forEach(email => {
        const trimmed = email.trim();
        if (trimmed && trimmed.includes('@')) {
          attendeesList.push({ email: trimmed });
        }
      });
    } else {
      // Fallback: invite the lead's email if available
      if (task.crm_leads?.email) {
        attendeesList.push({ email: task.crm_leads.email });
      }
    }

    const eventPayload = {
      summary: title,
      description: description,
      start,
      end,
      attendees: attendeesList,
      extendedProperties: {
        private: {
          crm_task_id: task.id
        }
      }
    };

    // Find if event already exists
    const existingEvent = await this.findEventByTaskId(account, task.id);
    
    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    let method = 'POST';

    if (existingEvent) {
      url += `/${existingEvent.id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.token}`
      },
      body: JSON.stringify(eventPayload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to sync task: ${errBody}`);
    }

    return await res.json();
  },

  async deleteTaskEvent(taskId: string): Promise<void> {
    const accounts = this.getLinkedAccounts();
    
    for (const account of accounts) {
      if (Date.now() > account.expiresAt) continue;

      const event = await this.findEventByTaskId(account, taskId);
      if (event) {
        try {
          const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${account.token}` }
          });
        } catch (err) {
          console.error(`Failed to delete event from account ${account.email}`, err);
        }
      }
    }
  },

  generateGoogleCalendarLink(task: any, customAttendees?: string[]): string {
    const title = encodeURIComponent(`${task.activity_type || 'Task'}: ${task.title}`);
    
    const datePart = task.due_date.replace(/-/g, '').split('T')[0];
    let dates = '';
    if (task.due_time) {
      const timePart = task.due_time.substring(0, 5).replace(':', '');
      const startLocal = `${datePart}T${timePart}00`;
      
      const [hours, minutes] = task.due_time.split(':').map(Number);
      const endDate = new Date(new Date(task.due_date).setHours(hours + 1, minutes));
      
      const endHours = String(endDate.getHours()).padStart(2, '0');
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
      const endLocal = `${datePart}T${endHours}${endMinutes}00`;
      dates = `${startLocal}/${endLocal}`;
    } else {
      const nextDay = new Date(new Date(task.due_date).getTime() + 24 * 60 * 60 * 1000);
      const nextDatePart = nextDay.toISOString().split('T')[0].replace(/-/g, '');
      dates = `${datePart}/${nextDatePart}`;
    }

    let details = `CRM Task Details:\n`;
    details += `Status: ${task.status}\n`;
    details += `Priority: ${task.priority}\n`;
    if (task.crm_leads) {
      details += `Lead: ${task.crm_leads.contact_person} (${task.crm_leads.company_name})\n`;
      if (task.crm_leads.phone) details += `Phone: ${task.crm_leads.phone}\n`;
      if (task.crm_leads.email) details += `Email: ${task.crm_leads.email}\n`;
    }
    const detailsEncoded = encodeURIComponent(details);

    let attendees = '';
    if (customAttendees && customAttendees.length > 0) {
      attendees = customAttendees.join(',');
    } else if (task.crm_leads?.email) {
      attendees = task.crm_leads.email;
    }
    const addParam = attendees ? `&add=${encodeURIComponent(attendees)}` : '';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${detailsEncoded}${addParam}`;
  },

  generateGmailComposeLink(task: any, toEmail: string, addCalendarLink: string): string {
    const subject = encodeURIComponent(`CRM Task Invite: ${task.title}`);
    
    let body = `Hello,\n\n`;
    body += `An action has been scheduled in the CRM:\n\n`;
    body += `Task: ${task.title}\n`;
    body += `Activity Type: ${task.activity_type || 'Task'}\n`;
    body += `Priority: ${task.priority || 'Medium'}\n`;
    body += `Due Date: ${task.due_date.split('T')[0]} ${task.due_time || ''}\n\n`;
    
    if (task.crm_leads) {
      body += `Lead Contact: ${task.crm_leads.contact_person} (${task.crm_leads.company_name})\n`;
      if (task.crm_leads.email) body += `Lead Email: ${task.crm_leads.email}\n`;
    }
    
    body += `\nAdd this to your Google Calendar in 1-click:\n`;
    body += `${addCalendarLink}\n\n`;
    body += `Regards,\nCRM Team`;
    
    const bodyEncoded = encodeURIComponent(body);
    const toParam = toEmail ? `&to=${encodeURIComponent(toEmail)}` : '';

    return `https://mail.google.com/mail/?view=cm&fs=1${toParam}&su=${subject}&body=${bodyEncoded}`;
  }
};
