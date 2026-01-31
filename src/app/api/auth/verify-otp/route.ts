import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json()

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

        // 4. Generate a session token for the user
        // Since we verified the OTP ourselves, we can create a magic link or just return the user
        // The cleanest way to log them in from the server is to generate a magic link and return that,
        // or use admin-level sign-in if available.
        // For Supabase, the best way to bridge a custom OTP to a session is 'generateLink'

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        })

        if (linkError) throw linkError

        return NextResponse.json({
            success: true,
            redirectUrl: linkData.properties.action_link
        })

    } catch (error: any) {
        console.error('Verify Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
