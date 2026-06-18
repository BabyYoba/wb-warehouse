import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'wb_api_key')
    .single()

  // Не возвращаем сам ключ — только факт наличия
  return NextResponse.json({ hasKey: !!data?.value })
}

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json()
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'Ключ не может быть пустым' }, { status: 400 })
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'wb_api_key', value: apiKey.trim() }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await supabase.from('settings').delete().eq('key', 'wb_api_key')
  return NextResponse.json({ ok: true })
}
