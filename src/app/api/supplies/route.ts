import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('supplies')
    .select('*, products(name)')
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { vendor_code, quantity, supplier, purchase_price, comment, date } = body

  if (!vendor_code || !quantity) {
    return NextResponse.json({ error: 'Артикул и количество обязательны' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('supplies')
    .insert({
      vendor_code,
      quantity: Number(quantity),
      supplier: supplier || null,
      purchase_price: purchase_price ? Number(purchase_price) : null,
      total: purchase_price ? Number(quantity) * Number(purchase_price) : null,
      comment: comment || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Обновляем my_stock в products
  const { data: product } = await supabase
    .from('products')
    .select('my_stock')
    .eq('vendor_code', vendor_code)
    .single()

  if (product) {
    await supabase
      .from('products')
      .update({ my_stock: (product.my_stock || 0) + Number(quantity) })
      .eq('vendor_code', vendor_code)
  }

  return NextResponse.json(data)
}
