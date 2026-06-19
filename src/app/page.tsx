'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, TrendingDown, Truck, Settings, RefreshCw,
  Key, Trash2, Plus, AlertTriangle, CheckCircle, XCircle,
  Loader2, BarChart2, Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Tab = 'dashboard' | 'products' | 'stock' | 'supplies' | 'settings'
type StockStatus = 'all' | 'ok' | 'low' | 'none'

interface Product {
  id: number
  vendor_code: string
  nm_id: number
  name: string
  category: string
  brand: string
  price: number | null
  discount: number | null
  discounted_price: number | null
  wb_stock: number
  my_stock: number
  min_stock: number
  updated_at: string
}

interface Supply {
  id: number
  vendor_code: string
  quantity: number
  supplier: string | null
  purchase_price: number | null
  total: number | null
  comment: string | null
  date: string
  products?: { name: string }
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('ru-RU')
}

function fmtPrice(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('ru-RU') + ' ₽'
}

function getStatus(total: number, min: number): StockStatus {
  if (total <= 0) return 'none'
  if (total < min) return 'low'
  return 'ok'
}

function StockBadge({ total, min }: { total: number; min: number }) {
  const s = getStatus(total, min)
  if (s === 'none') return <span className="badge badge-none"><XCircle size={11}/>Нет</span>
  if (s === 'low')  return <span className="badge badge-low"><AlertTriangle size={11}/>Мало</span>
  return <span className="badge badge-ok"><CheckCircle size={11}/>Норма</span>
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function FiltersBar({ categories, category, onCategory, status, onStatus }: {
  categories: string[]
  category: string
  onCategory: (v: string) => void
  status: StockStatus
  onStatus: (v: StockStatus) => void
}) {
  const statuses: { value: StockStatus; label: string }[] = [
    { value: 'all',  label: 'Все' },
    { value: 'ok',   label: '✅ Норма' },
    { value: 'low',  label: '⚠️ Мало' },
    { value: 'none', label: '🔴 Нет' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-gray-400">
        <Filter size={13}/> Фильтр:
      </div>
      <select
        className="input text-sm py-1.5"
        style={{ width: 'auto' }}
        value={category}
        onChange={e => onCategory(e.target.value)}
      >
        <option value="">Все категории</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-1 flex-wrap">
        {statuses.map(s => (
          <button
            key={s.value}
            onClick={() => onStatus(s.value)}
            className="btn text-xs py-1 px-2.5"
            style={{
              background: status === s.value ? 'var(--brand)' : '#f3f4f6',
              color: status === s.value ? '#fff' : 'var(--text)',
              border: status === s.value ? 'none' : '1px solid var(--border)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ products }: { products: Product[] }) {
  const [category, setCategory] = useState('')
  const [status, setStatus]     = useState<StockStatus>('all')

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()

  const low  = products.filter(p => (p.wb_stock + p.my_stock) < p.min_stock)
  const none = products.filter(p => (p.wb_stock + p.my_stock) <= 0)

  const lowFiltered = products.filter(p => {
    const total = p.wb_stock + p.my_stock
    const s = getStatus(total, p.min_stock)
    if (total >= p.min_stock) return false
    if (category && p.category !== category) return false
    if (status !== 'all' && s !== status) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Товаров',  value: products.length, icon: Package,       color: '#3b5bdb' },
          { label: 'Мало',     value: low.length,      icon: AlertTriangle, color: '#ca8a04' },
          { label: 'Нет',      value: none.length,     icon: XCircle,       color: '#dc2626' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-3 md:p-5 flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4">
            <div style={{ background: color + '18', borderRadius: 8, padding: 8, flexShrink: 0 }}>
              <Icon size={18} style={{ color }}/>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl md:text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs md:text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <FiltersBar categories={categories} category={category} onCategory={setCategory} status={status} onStatus={setStatus}/>

      {lowFiltered.length === 0 ? (
        <div className="card p-8 text-center text-green-600 font-medium">
          <CheckCircle className="mx-auto mb-2" size={28}/>
          {category || status !== 'all' ? 'Нет товаров по фильтру' : 'Все товары в норме'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">
              ⚠️ Требуют пополнения
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Артикул','Название','Категория','WB','Мой','Всего','Мин.','Дефицит','Статус'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowFiltered.map((p, i) => {
                  const total = p.wb_stock + p.my_stock
                  return (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.vendor_code}</td>
                      <td className="px-4 py-2.5 font-medium max-w-xs truncate">{p.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                      <td className="px-4 py-2.5">{fmt(p.wb_stock)}</td>
                      <td className="px-4 py-2.5">{fmt(p.my_stock)}</td>
                      <td className="px-4 py-2.5 font-semibold">{fmt(total)}</td>
                      <td className="px-4 py-2.5 text-gray-400">{fmt(p.min_stock)}</td>
                      <td className="px-4 py-2.5 text-red-600 font-semibold">{fmt(Math.max(0, p.min_stock - total))}</td>
                      <td className="px-4 py-2.5"><StockBadge total={total} min={p.min_stock}/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            <div className="text-sm font-semibold text-gray-600">⚠️ Требуют пополнения</div>
            {lowFiltered.map(p => {
              const total = p.wb_stock + p.my_stock
              return (
                <div key={p.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm leading-snug">{p.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{p.vendor_code}</div>
                    </div>
                    <StockBadge total={total} min={p.min_stock}/>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { label: 'WB', value: fmt(p.wb_stock) },
                      { label: 'Мой', value: fmt(p.my_stock) },
                      { label: 'Мин.', value: fmt(p.min_stock) },
                      { label: 'Дефицит', value: fmt(Math.max(0, p.min_stock - total)), red: true },
                    ].map(({ label, value, red }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className={`font-bold text-sm ${red ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
                        <div className="text-gray-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                  {p.category && <div className="text-xs text-gray-400">{p.category}</div>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Products ────────────────────────────────────────────────────────────────

function Products({ products, onMinStockChange }: {
  products: Product[]
  onMinStockChange: (id: number, val: number) => void
}) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus]     = useState<StockStatus>('all')

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()

  const filtered = products.filter(p => {
    const total = p.wb_stock + p.my_stock
    const s = getStatus(total, p.min_stock)
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.vendor_code.toLowerCase().includes(search.toLowerCase())) return false
    if (category && p.category !== category) return false
    if (status !== 'all' && s !== status) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="input text-sm"
          style={{ width: 240 }}
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FiltersBar categories={categories} category={category} onCategory={setCategory} status={status} onStatus={setStatus}/>
      </div>
      <div className="text-xs text-gray-400">Найдено: {filtered.length} из {products.length}</div>

      {/* Desktop table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Артикул','nmID','Название','Категория','Бренд','Цена','Скидка','С скидкой','Мин.','Статус'].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            )}
            {filtered.map((p, i) => {
              const total = p.wb_stock + p.my_stock
              return (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.vendor_code}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.nm_id}</td>
                  <td className="px-4 py-2.5 font-medium max-w-xs truncate">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.brand}</td>
                  <td className="px-4 py-2.5">{fmtPrice(p.price)}</td>
                  <td className="px-4 py-2.5">{p.discount ? p.discount + '%' : '—'}</td>
                  <td className="px-4 py-2.5 font-semibold">{fmtPrice(p.discounted_price)}</td>
                  <td className="px-4 py-2.5">
                    <input type="number" className="input w-16 text-center py-1 px-2"
                      value={p.min_stock} min={0}
                      onChange={e => onMinStockChange(p.id, Number(e.target.value))}/>
                  </td>
                  <td className="px-4 py-2.5"><StockBadge total={total} min={p.min_stock}/></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-gray-400 text-sm">Нет данных</div>
        )}
        {filtered.map(p => {
          const total = p.wb_stock + p.my_stock
          return (
            <div key={p.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm leading-snug">{p.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{p.vendor_code}</div>
                </div>
                <StockBadge total={total} min={p.min_stock}/>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {p.category && <span>{p.category}</span>}
                {p.brand && <span>{p.brand}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Цена', value: fmtPrice(p.price) },
                  { label: 'Скидка', value: p.discount ? p.discount + '%' : '—' },
                  { label: 'С скидкой', value: fmtPrice(p.discounted_price) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="font-semibold text-sm text-gray-800">{value}</div>
                    <div className="text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stock ───────────────────────────────────────────────────────────────────

function Stock({ products }: { products: Product[] }) {
  const [category, setCategory] = useState('')
  const [status, setStatus]     = useState<StockStatus>('all')

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()

  const filtered = products.filter(p => {
    const total = p.wb_stock + p.my_stock
    const s = getStatus(total, p.min_stock)
    if (category && p.category !== category) return false
    if (status !== 'all' && s !== status) return false
    return true
  })

  return (
    <div className="space-y-4">
      <FiltersBar categories={categories} category={category} onCategory={setCategory} status={status} onStatus={setStatus}/>
      <div className="text-xs text-gray-400">Найдено: {filtered.length} из {products.length}</div>

      {/* Desktop table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Артикул','Название','Категория','WB склад','Мой склад','Всего','Мин.','Статус','Обновлено'].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            )}
            {filtered.map((p, i) => {
              const total = p.wb_stock + p.my_stock
              const date  = p.updated_at ? new Date(p.updated_at).toLocaleDateString('ru-RU') : '—'
              return (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.vendor_code}</td>
                  <td className="px-4 py-2.5 font-medium max-w-xs truncate">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2.5">{fmt(p.wb_stock)}</td>
                  <td className="px-4 py-2.5">{fmt(p.my_stock)}</td>
                  <td className="px-4 py-2.5 font-semibold">{fmt(total)}</td>
                  <td className="px-4 py-2.5 text-gray-400">{fmt(p.min_stock)}</td>
                  <td className="px-4 py-2.5"><StockBadge total={total} min={p.min_stock}/></td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-gray-400 text-sm">Нет данных</div>
        )}
        {filtered.map(p => {
          const total = p.wb_stock + p.my_stock
          const date  = p.updated_at ? new Date(p.updated_at).toLocaleDateString('ru-RU') : '—'
          return (
            <div key={p.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm leading-snug">{p.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{p.vendor_code}</div>
                </div>
                <StockBadge total={total} min={p.min_stock}/>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: 'WB', value: fmt(p.wb_stock) },
                  { label: 'Мой', value: fmt(p.my_stock) },
                  { label: 'Всего', value: fmt(total), bold: true },
                  { label: 'Мин.', value: fmt(p.min_stock) },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className={`text-sm ${bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{value}</div>
                    <div className="text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{p.category}</span>
                <span>{date}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Supplies ────────────────────────────────────────────────────────────────

function Supplies({ products }: { products: Product[] }) {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    vendor_code: '', quantity: '', supplier: '',
    purchase_price: '', comment: '', date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    supabase.from('supplies').select('*, products(name)').order('date', { ascending: false })
      .then(({ data }) => { setSupplies(data || []); setLoading(false) })
  }, [])

  const handleSubmit = async () => {
    if (!form.vendor_code || !form.quantity) return
    setSaving(true)
    const res = await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) { alert('Ошибка: ' + data.error); setSaving(false); return }
    const product = products.find(p => p.vendor_code === form.vendor_code)
    setSupplies(prev => [{ ...data, products: { name: product?.name || '' } }, ...prev])
    setForm({ vendor_code: '', quantity: '', supplier: '', purchase_price: '', comment: '', date: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
        <Plus size={16}/> Добавить поставку
      </button>

      {showForm && (
        <div className="card p-4 md:p-5 space-y-4">
          <div className="font-semibold text-gray-700">Новая поставка</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Артикул *</label>
              <select className="input" value={form.vendor_code} onChange={e => setForm(f => ({ ...f, vendor_code: e.target.value }))}>
                <option value="">— выбери товар —</option>
                {products.map(p => <option key={p.id} value={p.vendor_code}>{p.vendor_code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Количество *</label>
              <input type="number" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min={1}/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Поставщик</label>
              <input className="input" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Цена закупки, ₽</label>
              <input type="number" className="input" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Комментарий</label>
              <input className="input" value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}/>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.vendor_code || !form.quantity}>
              {saving ? <><Loader2 size={14} className="animate-spin"/>Сохранение...</> : 'Сохранить'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="card overflow-x-auto hidden md:block">
        {loading ? (
          <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto"/></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Дата','Артикул','Название','Кол-во','Поставщик','Цена','Сумма','Комментарий'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supplies.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Поставок пока нет</td></tr>
              )}
              {supplies.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{new Date(s.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{s.vendor_code}</td>
                  <td className="px-4 py-2.5 max-w-xs truncate">{s.products?.name || '—'}</td>
                  <td className="px-4 py-2.5 font-semibold">{s.quantity}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.supplier || '—'}</td>
                  <td className="px-4 py-2.5">{fmtPrice(s.purchase_price)}</td>
                  <td className="px-4 py-2.5">{fmtPrice(s.total)}</td>
                  <td className="px-4 py-2.5 text-gray-400">{s.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading && <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-gray-400"/></div>}
        {!loading && supplies.length === 0 && (
          <div className="card p-6 text-center text-gray-400 text-sm">Поставок пока нет</div>
        )}
        {supplies.map(s => (
          <div key={s.id} className="card p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{s.products?.name || s.vendor_code}</div>
                <div className="text-xs text-gray-400 font-mono">{s.vendor_code}</div>
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(s.date).toLocaleDateString('ru-RU')}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Кол-во', value: String(s.quantity) },
                { label: 'Цена', value: fmtPrice(s.purchase_price) },
                { label: 'Сумма', value: fmtPrice(s.total) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-sm text-gray-800">{value}</div>
                  <div className="text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {(s.supplier || s.comment) && (
              <div className="text-xs text-gray-400 flex gap-3">
                {s.supplier && <span>📦 {s.supplier}</span>}
                {s.comment  && <span>💬 {s.comment}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Settings ────────────────────────────────────────────────────────────────

function SettingsPanel() {
  const [hasKey, setHasKey]     = useState<boolean | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setHasKey(d.hasKey))
  }, [])

  const saveKey = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: keyInput })
    })
    if (res.ok) { setHasKey(true); setKeyInput(''); setMsg('✅ Ключ сохранён') }
    else setMsg('❌ Ошибка сохранения')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const deleteKey = async () => {
    if (!confirm('Удалить API-ключ?')) return
    await fetch('/api/settings', { method: 'DELETE' })
    setHasKey(false)
    setMsg('🗑 Ключ удалён')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="card p-5 space-y-4">
        <div className="font-semibold text-gray-700 flex items-center gap-2">
          <Key size={16}/> API-ключ Wildberries
        </div>
        {hasKey === null ? (
          <div className="text-gray-400 text-sm">Загрузка...</div>
        ) : hasKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle size={16}/> Ключ сохранён
            </div>
            <button className="btn btn-danger" onClick={deleteKey}>
              <Trash2 size={14}/> Удалить ключ
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="password" className="input" placeholder="Вставь API-ключ WB..."
              value={keyInput} onChange={e => setKeyInput(e.target.value)}/>
            <button className="btn btn-primary" onClick={saveKey} disabled={saving || !keyInput}>
              {saving ? <><Loader2 size={14} className="animate-spin"/>Сохранение...</> : <><Key size={14}/>Сохранить ключ</>}
            </button>
          </div>
        )}
        {msg && <div className="text-sm">{msg}</div>}
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 space-y-1">
          <p className="font-medium text-gray-500">Как получить API-ключ:</p>
          <p>1. Личный кабинет WB → Настройки → Доступ к API</p>
          <p>2. Создай ключ: Контент + Цены и скидки + Статистика</p>
          <p>3. Вставь ключ выше</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab]             = useState<Tab>('dashboard')
  const [products, setProducts]   = useState<Product[]>([])
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  const handleImport = async () => {
    setImporting(true)
    setImportMsg('')
    const res  = await fetch('/api/wb', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setImportMsg(`✅ ${data.products} товаров`)
      await loadProducts()
    } else {
      setImportMsg('❌ ' + data.error)
    }
    setImporting(false)
    setTimeout(() => setImportMsg(''), 5000)
  }

  const handleMinStockChange = async (id: number, val: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, min_stock: val } : p))
    await supabase.from('products').update({ min_stock: val }).eq('id', id)
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Дашборд',  icon: BarChart2   },
    { id: 'products',  label: 'Товары',    icon: Package     },
    { id: 'stock',     label: 'Остатки',   icon: TrendingDown},
    { id: 'supplies',  label: 'Поставки',  icon: Truck       },
    { id: 'settings',  label: 'Настройки', icon: Settings    },
  ]

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div style={{ background: '#3b5bdb', borderRadius: 8, padding: 7 }}>
              <Package size={18} color="white"/>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm md:text-base">Склад WB</div>
              <div className="text-xs text-gray-400 hidden md:block">Складской учёт Wildberries</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {importMsg && <span className="text-xs md:text-sm">{importMsg}</span>}
            <button className="btn btn-primary text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2" onClick={handleImport} disabled={importing}>
              {importing
                ? <><Loader2 size={13} className="animate-spin"/>Импорт...</>
                : <><RefreshCw size={13}/><span className="hidden md:inline">Импорт из WB</span><span className="md:hidden">WB</span></>}
            </button>
          </div>
        </div>

        {/* Desktop tabs */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 hidden md:flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: tab === id ? 'var(--brand)' : 'transparent',
                color: tab === id ? 'var(--brand)' : 'var(--text-muted)',
              }}>
              <Icon size={15}/>{label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {tab === 'dashboard' && <Dashboard products={products}/>}
        {tab === 'products'  && <Products  products={products} onMinStockChange={handleMinStockChange}/>}
        {tab === 'stock'     && <Stock     products={products}/>}
        {tab === 'supplies'  && <Supplies  products={products}/>}
        {tab === 'settings'  && <SettingsPanel/>}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
              style={{ color: tab === id ? 'var(--brand)' : 'var(--text-muted)' }}>
              <Icon size={20}/>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
