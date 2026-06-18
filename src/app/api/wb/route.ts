import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchWBProducts, fetchWBStocks, fetchWBPrices } from '@/lib/wb-api'

export async function POST() {
  // Получаем API-ключ из Supabase
  const { data: settingsRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'wb_api_key')
    .single()

  const apiKey = settingsRow?.value
  if (!apiKey) {
    return NextResponse.json({ error: 'API-ключ не указан' }, { status: 400 })
  }

  try {
    const [products, stocks, prices] = await Promise.all([
      fetchWBProducts(apiKey),
      fetchWBStocks(apiKey),
      fetchWBPrices(apiKey),
    ])

    // Индекс цен
    const priceMap: Record<number, any> = {}
    prices.forEach((p: any) => { priceMap[p.nmID] = p })

    // Индекс остатков по артикулу
    const stockMap: Record<string, number> = {}
    stocks.forEach((s: any) => {
      const key = s.supplierArticle || String(s.nmId)
      stockMap[key] = (stockMap[key] || 0) + (s.quantity || 0)
    })

    // Upsert товаров
    const productRows = products.map((card: any) => {
      const p = priceMap[card.nmID] || {}
      const discountedPrice = p.price && p.discount
        ? Math.round(p.price * (1 - p.discount / 100))
        : p.price || null

      return {
        vendor_code: card.vendorCode || '',
        nm_id: card.nmID,
        name: card.title || card.subjectName || '',
        category: card.subjectName || '',
        brand: card.brand || '',
        price: p.price || null,
        discount: p.discount || null,
        discounted_price: discountedPrice,
        wb_stock: stockMap[card.vendorCode] ?? stockMap[String(card.nmID)] ?? 0,
        updated_at: new Date().toISOString(),
      }
    })

    if (productRows.length) {
      const { error } = await supabase
        .from('products')
        .upsert(productRows, { onConflict: 'nm_id' })
      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      products: productRows.length,
      stocks: stocks.length,
      prices: prices.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
