import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOTPEmail } from '@/lib/email'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email || !email.endsWith('@msu.edu')) {
            return NextResponse.json({ error: 'Valid @msu.edu email required' }, { status: 400 })
        }

        // 1. Generate a 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // 2. Store in DB
        const { error: dbError } = await supabase
            .from('otps')
            .insert({ email, code, expires_at: expiresAt.toISOString() })

        if (dbError) throw dbError

        // 3. Dispatch Email
        const emailResult = await sendOTPEmail(email, code)

        if (!emailResult.success) {
            console.error('Email failed, enabling Hackathon Mode. Error:', emailResult.error)
            // HACKATHON FIX: If email fails (sandbox/dns), return success anyway 
            // and send the code back to the client so the user can still log in.
            return NextResponse.json({
                success: true,
                message: 'Hackathon Mode: Email failed, but code generated.',
                debugCode: code // 🚨 EXPOSING CODE TO CLIENT FOR DEMO 🚨
            })
        }

        return NextResponse.json({
            success: true,
            message: 'Code dispatched successfully',
            debugCode: code // 🚨 FORCE HACKATHON MODE: ALWAYS RETURN CODE 🚨
        })
    } catch (error: any) {
        console.error('OTP Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
