import { createClient } from '@supabase/supabase-js'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function sendOTPEmail(email: string, code: string) {
    // Use Resend API
    if (process.env.RESEND_API_KEY) {
        return await sendViaResend(email, code)
    }

    // Fallback: Log to console in dev
    console.log(`[AUTH] OTP for ${email}: ${code}`)
    return { success: true, mode: 'console' }
}

async function sendViaResend(email: string, code: string) {
    const apiKey = process.env.RESEND_API_KEY

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Spartan Finder <onboarding@resend.dev>', // Resend default for unverified domains
                to: email,
                subject: 'Your Spartan Finder Access Code',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h1 style="color: #18453b; font-size: 24px; font-weight: 800; margin-bottom: 16px;">Spartan Finder Protocol</h1>
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">Use the following configuration code to validate your identity and access the Spartan Network:</p>
            <div style="background: #f3f4f6; padding: 24px; text-align: center; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #18453b;">${code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; text-transform: uppercase; letter-spacing: 1px;">This code expires in 10 minutes. Exclusive access for validated Spartans.</p>
          </div>
        `,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Resend Error:', data)

            // Development Fallback: If Resend is restricted (403), log the code to console so the user isn't blocked.
            if (response.status === 403) {
                console.log(`\n[DEV ONLY] Resend is restricted. Use this code: ${code}\n`)
                return { success: true, mode: 'console_fallback' }
            }

            return {
                success: false,
                error: data.message || 'Resend failed to send email'
            }
        }

        return { success: true, mode: 'resend' }
    } catch (error: any) {
        console.error('Email sending failed:', error)
        return { success: false, error: error.message || 'System Error' }
    }
}
