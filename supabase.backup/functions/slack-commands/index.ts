import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse Slack slash command payload
    const formData = await req.formData()
    const text = formData.get('text')?.toString() || ''
    const userId = formData.get('user_id')?.toString()
    const channelId = formData.get('channel_id')?.toString()
    const command = text.split(' ')[0]
    const args = text.substring(command.length).trim()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Map Slack user_id to our user_id (need a slack_users table)
    const { data: slackUser } = await supabaseClient
      .from('oauth_tokens')
      .select('user_id')
      .eq('provider', 'slack')
      .eq('scope', userId) // Store slack user_id in scope temporarily
      .single()

    if (!slackUser) {
      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: '❌ Please connect your Slack account first at /integrations',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appUserId = slackUser.user_id

    // Handle commands
    switch (command) {
      case 'start': {
        // Parse: /timer start [project] [description]
        const parts = args.split(' ')
        const projectName = parts[0] || 'General'
        const description = parts.slice(1).join(' ') || 'Working'

        // Find or create project
        let { data: project } = await supabaseClient
          .from('projects')
          .select('id')
          .eq('user_id', appUserId)
          .eq('name', projectName)
          .single()

        if (!project) {
          const { data: newProject } = await supabaseClient
            .from('projects')
            .insert({ name: projectName, color: '#3b82f6' })
            .select('id')
            .single()
          project = newProject
        }

        // Check if timer is already running
        const { data: runningTimer } = await supabaseClient
          .from('time_entries')
          .select('id')
          .eq('user_id', appUserId)
          .is('end_time', null)
          .single()

        if (runningTimer) {
          return new Response(
            JSON.stringify({
              response_type: 'ephemeral',
              text: '⏰ You already have a timer running. Stop it first with `/timer stop`',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Start timer
        const { error } = await supabaseClient
          .from('time_entries')
          .insert({
            user_id: appUserId,
            project_id: project.id,
            description,
            start_time: new Date().toISOString(),
          })

        if (error) throw error

        return new Response(
          JSON.stringify({
            response_type: 'in_channel',
            text: `✅ Timer started for *${projectName}*: ${description}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'stop': {
        // Find running timer
        const { data: runningTimer } = await supabaseClient
          .from('time_entries')
          .select('*, project:projects(name)')
          .eq('user_id', appUserId)
          .is('end_time', null)
          .single()

        if (!runningTimer) {
          return new Response(
            JSON.stringify({
              response_type: 'ephemeral',
              text: '❌ No timer is currently running',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Stop timer
        const endTime = new Date()
        const startTime = new Date(runningTimer.start_time)
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

        await supabaseClient
          .from('time_entries')
          .update({
            end_time: endTime.toISOString(),
            duration,
          })
          .eq('id', runningTimer.id)

        return new Response(
          JSON.stringify({
            response_type: 'in_channel',
            text: `⏹️ Timer stopped for *${runningTimer.project?.name}*\nDuration: ${formatDuration(duration)}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'status': {
        // Get current timer
        const { data: runningTimer } = await supabaseClient
          .from('time_entries')
          .select('*, project:projects(name)')
          .eq('user_id', appUserId)
          .is('end_time', null)
          .single()

        if (!runningTimer) {
          return new Response(
            JSON.stringify({
              response_type: 'ephemeral',
              text: '⏸️ No timer is currently running',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const elapsed = Math.floor((Date.now() - new Date(runningTimer.start_time).getTime()) / 1000)

        return new Response(
          JSON.stringify({
            response_type: 'ephemeral',
            text: `⏱️ *Current Timer*\nProject: ${runningTimer.project?.name}\nDescription: ${runningTimer.description}\nElapsed: ${formatDuration(elapsed)}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'today': {
        // Get today's total
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: entries } = await supabaseClient
          .from('time_entries')
          .select('duration')
          .eq('user_id', appUserId)
          .gte('start_time', today.toISOString())

        const total = entries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0

        return new Response(
          JSON.stringify({
            response_type: 'ephemeral',
            text: `📊 *Today's Total*: ${formatDuration(total)}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({
            response_type: 'ephemeral',
            text: `❓ Unknown command. Available commands:\n` +
                  `• \`/timer start [project] [description]\` - Start tracking time\n` +
                  `• \`/timer stop\` - Stop the current timer\n` +
                  `• \`/timer status\` - Check your current timer\n` +
                  `• \`/timer today\` - See your time tracked today`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Slack command error:', error)
    return new Response(
      JSON.stringify({
        response_type: 'ephemeral',
        text: `❌ Error: ${error.message}`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Slack expects 200 even for errors
      }
    )
  }
})
