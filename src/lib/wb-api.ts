export async function fetchWBProducts(apiKey: string) {
  const url = 'https://content-api.wildberries.ru/content/v2/get/cards/list'
  let allProducts: any[] = []
  let cursor: any = null

  for (let page = 0; page < 50; page++) {
    const payload: any = {
      settings: {
        cursor: { ...(cursor || {}), limit: 100 },
        filter: { withPhoto: -1 }
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ошибка API товаров (${res.status}): ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const cards = data.cards || []
    allProducts = allProducts.concat(cards)

    if (data.cursor && data.cursor.total > allProducts.length) {
      cursor = { nmID: data.cursor.nmID, updatedAt: data.cursor.updatedAt }
    } else break

    await sleep(300)
  }

  return allProducts
}

export async function fetchWBStocks(apiKey: string) {
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 1)
  const dateStr = dateFrom.toISOString().replace(/\.\d{3}Z$/, '')

  const res = await fetch(
    `https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=${dateStr}`,
    { headers: { Authorization: apiKey } }
  )

  if (!res.ok) return [] // нет прав — возвращаем пустой массив
  return res.json()
}

export async function fetchWBPrices(apiKey: string) {
  let allPrices: any[] = []
  let offset = 0

  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=${offset}`,
      { headers: { Authorization: apiKey } }
    )

    if (!res.ok) return allPrices

    const data = await res.json()
    const items = data?.data?.listGoods || []
    allPrices = allPrices.concat(items)

    if (items.length < 1000) break
    offset += 1000
    await sleep(200)
  }

  return allPrices
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
