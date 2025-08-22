import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CANDIDATES = [
  { id: 'c1', nama: 'Rosyidi', alias: 'Pak Eko' },
  { id: 'c2', nama: 'Rodi Atmaja', alias: 'Pak Osi' },
  { id: 'c3', nama: 'Marja Ulpah', alias: 'Pak Alesa' },
  { id: 'c4', nama: "Sar'i", alias: 'Pk Ogi' },
  { id: 'c5', nama: 'H. Azhar Hamidi', alias: 'H. Dadik' },
  { id: 'c6', nama: 'Khairul Muttaqin', alias: 'Jae Lolo' },
]

const ADMIN_PIN = '1234'

export default function App(){
  const [votes, setVotes] = useState(Object.fromEntries(CANDIDATES.map(c=>[c.id,0])))
  const [selected, setSelected] = useState(null)
  const [hasVoted, setHasVoted] = useState(getHasVoted())
  const [pin, setPin] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const deviceId = getOrCreateDeviceId()

  async function fetchTotals(){
    const { data, error } = await supabase.from('votes_aggregate').select('*')
    if(error){ console.error(error); return }
    const base = Object.fromEntries(CANDIDATES.map(c=>[c.id,0]))
    for(const row of data){ base[row.candidate_id]=Number(row.total)||0 }
    setVotes(base)
  }

  useEffect(()=>{
    fetchTotals().then(()=>setLoading(false))

    // Realtime: dengarkan INSERT pada tabel votes
    const channel = supabase.channel('realtime-votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload)=>{
        const cid = payload.new.candidate_id
        setVotes(prev => ({ ...prev, [cid]: (prev[cid]||0)+1 }))
      }).subscribe()

    // Fallback polling tiap 3 detik (jika realtime tidak aktif)
    const timer = setInterval(fetchTotals, 3000)

    return ()=>{
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [])

  async function submitVote(){
    if(!selected){ alert('Pilih calon dulu.'); return }
    if(hasVoted){ alert('Perangkat ini sudah memilih.'); return }
    // backend enforce device_id unique
    const { error } = await supabase.from('votes').insert({ device_id: deviceId, candidate_id: selected })
    if(error){
      if(String(error.message).toLowerCase().includes('duplicate')){
        setHasVotedLS(true); setHasVoted(true)
        alert('Perangkat ini sudah pernah memilih.')
      } else {
        alert('Gagal menyimpan suara. Coba lagi.')
        console.error(error)
      }
      return
    }
    setHasVotedLS(true); setHasVoted(true)
  }

  const total = useMemo(()=> CANDIDATES.reduce((s,c)=>s+(votes[c.id]||0),0), [votes])
  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase()
    if(!q) return CANDIDATES
    return CANDIDATES.filter(c=> c.nama.toLowerCase().includes(q) || (c.alias||'').toLowerCase().includes(q))
  },[search])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Poling Bakal Calon Kades Suela — 2026</h1>
            <p className="text-sm text-slate-600">Pilih satu calon. 1 perangkat = 1 suara. Hasil realtime.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="password" className="px-3 py-2 border rounded-xl text-sm" placeholder="PIN Admin"
                   value={pin} onChange={(e)=>setPin(e.target.value)} />
            {pin===ADMIN_PIN ? (
              <button onClick={()=>exportCSV(votes)} className="px-3 py-2 rounded-xl text-sm border hover:bg-slate-100">Ekspor CSV</button>
            ) : (
              <button className="px-3 py-2 rounded-xl text-sm bg-slate-900 text-white opacity-60 cursor-not-allowed">Admin</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <section className="mb-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-sm text-slate-600">Total suara masuk: <span className="font-semibold text-slate-900">{total}</span></div>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Cari calon..." className="px-3 py-2 border rounded-xl text-sm w-64"
                     value={search} onChange={(e)=>setSearch(e.target.value)} />
              <span className="text-xs text-slate-500">{filtered.length} calon</span>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map(c=>{
            const count = votes[c.id]||0
            const pct = total>0 ? Math.round(count/total*100) : 0
            const active = selected===c.id
            return (
              <article key={c.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{c.nama}</h3>
                      <p className="text-sm text-slate-600">{c.alias}</p>
                    </div>
                    <button onClick={()=>setSelected(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm border ${active?'bg-slate-900 text-white':'hover:bg-slate-100'}`}>
                      {active ? 'Dipilih' : 'Pilih'}
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">Perolehan</span>
                      <span className="font-medium text-slate-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900" style={{width: pct+'%'}}></div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mt-8">
          <div className="bg-white border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h4 className="font-semibold">Kirim Suara</h4>
              <p className="text-sm text-slate-600">Pastikan pilihan Anda sudah benar. 1 perangkat = 1 suara.</p>
            </div>
            <button onClick={submitVote} disabled={!selected || hasVoted}
              className={`px-4 py-2 rounded-2xl text-white ${(!selected||hasVoted)?'bg-slate-300 cursor-not-allowed':'bg-emerald-600 hover:opacity-90'}`}>
              {hasVoted ? 'Sudah memilih'
                        : selected ? `Pilih: ${CANDIDATES.find(x=>x.id===selected)?.nama}`
                        : 'Pilih calon dulu'}
            </button>
          </div>
        </section>

        <section className="mt-10">
          <details className="bg-slate-100/70 border rounded-2xl p-4">
            <summary className="cursor-pointer font-semibold">Panduan singkat</summary>
            <ol className="list-decimal pl-6 text-sm text-slate-700 mt-3 space-y-2">
              <li>Masukkan <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code> di environment.</li>
              <li>Jalankan skrip <code>supabase.sql</code> pada SQL Editor Supabase.</li>
              <li>Realtime aktif otomatis. Jika tidak, sistem polling tiap 3 detik akan menyamakan hasil.</li>
            </ol>
          </details>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} — Poling Bakal Calon Kades Suela 2026.
      </footer>
    </div>
  )
}

function exportCSV(votes){
  const headers = ['id_calon','nama','alias','suara']
  const rows = CANDIDATES.map(c=>[c.id,c.nama,c.alias||'',votes[c.id]||0])
  const csv = [headers.join(','),...rows.map(r=>r.join(','))].join('\n')
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='hasil-poling.csv'; a.click()
  URL.revokeObjectURL(url)
}

function getOrCreateDeviceId(){
  const KEY='polling-desa-device-id'
  try{
    let id = localStorage.getItem(KEY)
    if(!id){ id = crypto.randomUUID(); localStorage.setItem(KEY,id) }
    return id
  }catch{ return 'fallback-'+Math.random().toString(36).slice(2) }
}

function setHasVotedLS(v){ try{ localStorage.setItem('polling-desa-hasVoted', v?'1':'0') }catch{} }
function getHasVoted(){ try{ return localStorage.getItem('polling-desa-hasVoted')==='1' }catch{ return false } }