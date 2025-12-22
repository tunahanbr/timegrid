export type ExternalSource = 'google' | 'outlook' | 'ical';

export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export interface ExternalOrganizer {
  name?: string;
  email?: string;
}

export interface ExternalAttendee {
  name?: string;
  email?: string;
  responseStatus?: ResponseStatus;
}

// Read-only overlay event from an external provider
export interface ExternalEvent {
  // Local stable id (e.g., `${source}:${sourceEventId}` or a UUID)
  id: string;
  source: ExternalSource;
  sourceEventId: string; // Provider id or canonical URL for iCal
  calendarId?: string;
  calendarName?: string;
  title: string;
  description?: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  allDay?: boolean;
  location?: string;
  url?: string; // Link to open in native app/provider
  organizer?: ExternalOrganizer;
  attendees?: ExternalAttendee[];
  color?: string; // Optional provider color to help styling overlays
  status?: 'confirmed' | 'tentative' | 'cancelled';
  recurrenceRule?: string | null; // RRULE text if present
  lastUpdated?: string; // ISO 8601
}

export interface TimeRange {
  start: Date;
  end: Date;
}
