import { useState } from 'react'
import { current } from '../auth.js'
import { settings, saveSettings, resetDb } from '../db.js'
import { PageHead, Card, Btn, Field, Input, Section, Modal } from '../components/ui.jsx'
import { Building2, Palette, ShieldAlert, Save, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const BRANDS=['#6C5CE7','#2563EB','#0EA5E9','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6']

export default function Settings(){
  const u=current()
  const [f,setF]=useState(settings())
  const [saved,setSaved]=useState(false)
  const [confirmReset,setConfirmReset]=useState(false)
  const set=(k,v)=>{ setF(p=>({...p,[k]:v})); setSaved(false) }
  const save=()=>{ if(!f.schoolName.trim())return toast.error('Le nom de l’école est requis'); saveSettings(f); setSaved(true); toast.success('Paramètres enregistrés — appliqués partout') }
  const reset=()=>{ resetDb(); toast.success('Données réinitialisées'); location.reload() }

  return (<>
    <PageHead title="Paramètres de l’école" sub="Configurez votre établissement — appliqué partout dans l’application."
      action={<Btn onClick={save}>{saved?<><Check size={16}/> Enregistré</>:<><Save size={16}/> Enregistrer</>}</Btn>}/>

    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card className="p-6">
          <h3 className="font-bold flex items-center gap-2 mb-4"><Building2 size={18} className="accent-text"/> Identité de l’établissement</h3>
          <Section title="Général">
            <Field label="Nom de l’école *"><Input value={f.schoolName} onChange={e=>set('schoolName',e.target.value)} placeholder="École Al-Nour"/></Field>
            <Field label="Nom court (sidebar)"><Input value={f.shortName} onChange={e=>set('shortName',e.target.value)} placeholder="Al-Nour"/></Field>
            <Field label="Ville"><Input value={f.city} onChange={e=>set('city',e.target.value)}/></Field>
            <Field label="Année scolaire"><Input value={f.year} onChange={e=>set('year',e.target.value)} placeholder="2025–2026"/></Field>
            <Field label="Nom du directeur / directrice"><Input value={f.director} onChange={e=>set('director',e.target.value)}/></Field>
            <Field label="Initiales du logo"><Input value={f.logoText} onChange={e=>set('logoText',e.target.value.slice(0,3).toUpperCase())} maxLength={3} placeholder="AN"/></Field>
          </Section>
          <Section title="Coordonnées">
            <Field label="Téléphone"><Input value={f.phone} onChange={e=>set('phone',e.target.value)}/></Field>
            <Field label="E-mail"><Input value={f.email} onChange={e=>set('email',e.target.value)}/></Field>
            <div className="sm:col-span-2"><Field label="Adresse"><Input value={f.address} onChange={e=>set('address',e.target.value)}/></Field></div>
          </Section>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold flex items-center gap-2 mb-4"><Palette size={18} className="accent-text"/> Marque & couleur</h3>
          <div className="flex flex-wrap gap-2.5">
            {BRANDS.map(c=>(
              <button key={c} onClick={()=>set('brand',c)} className="w-10 h-10 rounded-xl grid place-items-center transition hover:scale-105" style={{background:c,boxShadow:f.brand===c?`0 0 0 3px #fff, 0 0 0 5px ${c}`:'none'}}>
                {f.brand===c&&<Check size={18} className="text-white"/>}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">La couleur de marque est utilisée sur la page publique et les documents de l’école.</p>
        </Card>

        {u.role==='owner'&&<Card className="p-6 border-coral/40">
          <h3 className="font-bold flex items-center gap-2 mb-1 text-coral"><ShieldAlert size={18}/> Zone sensible</h3>
          <p className="text-sm text-muted mb-3">Réinitialiser remet toutes les données de démonstration à zéro.</p>
          <Btn variant="danger" onClick={()=>setConfirmReset(true)}>Réinitialiser les données de démo</Btn>
        </Card>}
      </div>

      {/* live preview */}
      <div>
        <div className="text-xs font-bold uppercase text-muted mb-2">Aperçu</div>
        <Card className="p-4">
          <div className="rounded-2xl p-4 text-white" style={{background:`linear-gradient(135deg,${f.brand},#10162B)`}}>
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl grid place-items-center font-extrabold bg-white/20">{f.logoText||'??'}</span>
              <div><div className="font-bold leading-tight">{f.schoolName||'—'}</div><div className="text-xs opacity-80">{f.city} · {f.year}</div></div>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">Directeur</span><span className="font-medium">{f.director||'—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Téléphone</span><span className="font-medium">{f.phone||'—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">E-mail</span><span className="font-medium truncate ml-2">{f.email||'—'}</span></div>
          </div>
        </Card>
      </div>
    </div>

    <Modal open={confirmReset} onClose={()=>setConfirmReset(false)} title="Réinitialiser les données ?"
      footer={<><Btn variant="ghost" onClick={()=>setConfirmReset(false)}>Annuler</Btn><Btn variant="danger" onClick={reset}>Réinitialiser</Btn></>}>
      <p className="text-sm text-muted">Toutes les données de démonstration (élèves, comptes, emplois du temps, évaluations…) seront remises à zéro. Cette action est irréversible.</p>
    </Modal>
  </>)
}
