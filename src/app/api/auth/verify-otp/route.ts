import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json()
        const origin = request.headers.get('origin') || new URL(request.url).origin

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
        }

        // 1. Verify OTP in DB
        const { data: otpData, error: otpError } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (otpError || !otpData) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
        }

        // 2. Remove used OTP
        await supabase.from('otps').delete().eq('id', otpData.id)

        // 3. Ensure user exists in Supabase Auth
        // We check if the user exists first
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === email)

        let authUser

        if (!existingUser) {
            // Create new user if they don't exist
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { onboarding_complete: false }
            })
            if (createError) throw createError
            authUser = newUser.user
        } else {
            authUser = existingUser
        }

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${origin}/discover`
            }
        })

        if (linkError) throw linkError

        // 5. Build the final redirect URL
        // If Supabase returns a localhost URL (Site URL misconfigured), we bridge it to the current origin
        let redirectUrl = linkData.properties.action_link
        if (redirectUrl.includes('localhost')) {
            const urlObj = new URL(redirectUrl)
            urlObj.protocol = new URL(origin).protocol
            urlObj.host = new URL(origin).host
            urlObj.port = new URL(origin).port
            redirectUrl = urlObj.toString()
        }

        return NextResponse.json({
            success: true,
            redirectUrl
        })

    } catch (error: any) {
        console.error('Verify Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
