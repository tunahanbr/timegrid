import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sync a time entry to Google Calendar
async function syncToGoogleCalendar(entry: any, accessToken: string) {
  const event = {
    summary: entry.description || 'Time Tracking',
    start: {
      dateTime: entry.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: entry.end_time,
      timeZone: 'UTC',
    },
    description: `Project: ${entry.project?.name || 'Unknown'}\nTracked via TimeTrack`,
    colorId: '1', // Blue
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create calendar event')
  }

  return await response.json()
}

// Sync a time entry to Microsoft Calendar
async function syncToMicrosoftCalendar(entry: any, accessToken: string) {
  const event = {
    subject: entry.description || 'Time Tracking',
    start: {
      dateTime: entry.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: entry.end_time,
      timeZone: 'UTC',
    },
    body: {
      contentType: 'text',
      content: `Project: ${entry.project?.name || 'Unknown'}\nTracked via TimeTrack`,
    },
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create calendar event')
  }

  return await response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { timeEntryId, userId } = await req.json()

    if (!timeEntryId || !userId) {
      throw new Error('Missing timeEntryId or userId')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch time entry
    const { data: entry, error: entryError } = await supabaseClient
      .from('time_entries')
      .select('*, project:projects(*)')
      .eq('id', timeEntryId)
      .single()

    if (entryError || !entry) {
      throw new Error('Time entry not found')
    }

    // Check if entry is complete (has end_time)
    if (!entry.end_time) {
      throw new Error('Cannot sync running timer to calendar')
    }

    // Fetch integration settings
    const { data: settings } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('user_id', userId)
      .in('provider', ['google_calendar', 'outlook_calendar'])
      .eq('is_enabled', true)

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No calendar integrations enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const setting of settings) {
      try {
        // Get OAuth token for this provider
        const provider = setting.provider === 'google_calendar' ? 'google' : 'microsoft'
        const { data: token } = await supabaseClient
          .from('oauth_tokens')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', provider)
          .single()

        if (!token || !token.access_token) {
          results.push({ provider, status: 'error', error: 'No access token found' })
          continue
        }

        // Sync to calendar
        let calendarEvent
        if (provider === 'google') {
          calendarEvent = await syncToGoogleCalendar(entry, token.access_token)
        } else {
          calendarEvent = await syncToMicrosoftCalendar(entry, token.access_token)
        }

        // Store mapping
        await supabaseClient
          .from('calendar_sync_mappings')
          .upsert({
            user_id: userId,
            time_entry_id: timeEntryId,
            provider,
            external_event_id: calendarEvent.id,
            sync_status: 'synced',
          })

        results.push({ provider, status: 'success', eventId: calendarEvent.id })

      } catch (error) {
        console.error(`Failed to sync to ${setting.provider}:`, error)
        
        // Store error in mapping
        await supabaseClient
          .from('calendar_sync_mappings')
          .upsert({
            user_id: userId,
            time_entry_id: timeEntryId,
            provider: setting.provider === 'google_calendar' ? 'google' : 'microsoft',
            external_event_id: '',
            sync_status: 'failed',
            error_message: error.message,
          })

        results.push({ 
          provider: setting.provider, 
          status: 'error', 
          error: error.message 
        })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Calendar sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
