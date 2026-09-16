"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePartner, recordPartnerEntries, assignOrderPartners } from "@/app/admin/partner-actions";
import { summarizeLedger, ENTRY_LABELS, csvCell } from "@/lib/partners/ledger";
import { formatNpr } from "@/lib/utils/money";
import { Button } from "@/components/ui/Button";
import type { Partner, PartnerEntry, PartnerEntryKind, PartnerOrder } from "@/types/partners";

const inputClass = "w-full rounded-lg border border-charcoal/20 bg-paper px-3 py-2 text-sm";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
const dateInNepal = (iso: string) => iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" }) : "";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-semibold text-muted">{label}{children}</label>; }
function download(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(r => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function PartnersWorkspace({ partners, entries, orders, skus }: { partners: Partner[]; entries: PartnerEntry[]; orders: PartnerOrder[]; skus: string[] }) {
  const [selected, setSelected] = useState(partners[0]?.id ?? "");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [message, setMessage] = useState(""); const [pending, start] = useTransition();
  const router = useRouter();
  const company = partners.find(p => p.id === selected);
  const allEntries = entries.filter(e => e.partnerId === selected);
  const periodEntries = allEntries.filter(e => (!from || e.occurredOn >= from) && (!to || e.occurredOn <= to)).sort((a,b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  const balance = summarizeLedger(allEntries);
  const period = summarizeLedger(periodEntries);
  const linked = orders.filter(o => [o.salesPartnerId, o.courierPartnerId].includes(selected) && (!from || dateInNepal(o.createdAt) >= from) && (!to || dateInNepal(o.createdAt) <= to));
  const delivered = linked.filter(o => o.orderStatus === "delivered");
  const execute = (action: () => Promise<{ok: boolean; error?: string}>) => start(async () => {
    setMessage("");
    try { const result = await action(); setMessage(result.ok ? "Saved. Records and reports updated." : result.error ?? "Could not save."); if (result.ok) router.refresh(); }
    catch { setMessage("Could not save. Check your connection and retry."); }
  });
  return <div className="space-y-7">
    <div className="rounded-2xl border border-forest/20 bg-paper p-5"><p className="font-semibold">Company records, stock and settlements</p><p className="mt-2 max-w-3xl text-sm text-muted">Track Daraz, Pathao, distributors and any courier here. Manual mode is active. API connections are reserved for a future update; no account is connected automatically.</p></div>
    <details className="rounded-2xl border border-charcoal/15 bg-paper p-5"><summary className="cursor-pointer font-semibold">Add a company</summary><CompanyForm onSave={data => execute(() => savePartner(data))} pending={pending} /></details>
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Company"><select className={inputClass} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select company</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}{p.active ? "" : " (inactive)"}</option>)}</select></Field>
      <Field label="Report from (Nepal date)"><input type="date" className={inputClass} value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></Field>
      <Field label="Report through"><input type="date" className={inputClass} value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></Field>
    </div>
    {message && <p role="status" className="rounded-xl border border-forest/25 bg-paper p-4 text-sm">{message}</p>}
    {company ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['External units sold', period.soldUnits], ['External net sales', formatNpr(period.salesMinor)], ['Money collected', formatNpr(period.collectedMinor)], ['Money paid to us', formatNpr(period.remittedMinor)], ['Company fees', formatNpr(period.feesMinor)], ['Customer refunds', formatNpr(period.refundedMinor)], ['Delivered website orders', delivered.length], ['Delivered website order value', formatNpr(delivered.reduce((sum,o) => sum + o.grandTotalMinor,0))]].map(([label,value]) => <div key={label} className="rounded-2xl border border-charcoal/10 bg-paper p-5"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tabular">{value}</p></div>)}
      </div>
      <p className="text-xs text-muted">Figures above use the selected dates. Website order figures use order creation date and current status, and include delivery fees. External sales are entered separately, so website orders must not be entered again as external sales.</p>
      <section className="rounded-2xl bg-forest p-5 text-paper"><h2 className="text-lg">Current company balances · all dates</h2><div className="mt-4 flex flex-wrap gap-8"><p><span className="block text-xs">Allocated units remaining</span><strong className="text-2xl">{balance.remainingUnits}</strong></p><p><span className="block text-xs">Collected money still held</span><strong className="text-2xl">{formatNpr(balance.heldMinor)}</strong></p></div><p className="mt-3 text-xs">Held = collected − remitted − fees − refunded. Stock below is company-held inventory only; website orders use the store warehouse and are reported separately.</p></section>
      <div className="overflow-x-auto rounded-2xl border border-charcoal/10 bg-paper"><div className="p-3"><Button variant="secondary" onClick={()=>download(`${company.id}-stock.csv`,[['Company','SKU','Received','Sold','Returned','Withdrawn','Remaining'],...Object.entries(balance.stock).map(([sku,s])=>[company.name,sku,s.received,s.sold,s.returned,s.withdrawn,s.remaining])])}>Export stock CSV</Button></div><table className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">Allocated inventory by SKU · all dates</caption><thead className="bg-ivory"><tr>{['SKU','Received','Sold','Returned','Withdrawn','Remaining'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{Object.entries(balance.stock).map(([sku,s]) => <tr key={sku} className="border-t border-charcoal/10">{[sku,s.received,s.sold,s.returned,s.withdrawn,s.remaining].map((v,i) => <td key={i} className="p-3">{v}</td>)}</tr>)}</tbody></table>{!Object.keys(balance.stock).length && <p className="p-4 text-sm text-muted">No company stock recorded yet.</p>}</div>
      <details className="rounded-2xl border border-charcoal/15 bg-paper p-5"><summary className="cursor-pointer font-semibold">Edit {company.name}</summary><CompanyForm key={company.id} company={company} pending={pending} onSave={data => execute(() => savePartner(data))} /></details>
      <section className="rounded-2xl border border-charcoal/15 bg-paper p-5"><h2 className="text-lg">Record stock or money</h2><p className="mt-2 text-sm text-muted">Use the company statement, sale or settlement reference. Entries are permanent and audited. Record a compensating entry to correct a mistake.</p><EntryForm key={company.id} company={company} skus={skus} orders={orders.filter(o => [o.salesPartnerId,o.courierPartnerId].includes(company.id))} pending={pending} onSave={entry => execute(() => recordPartnerEntries([entry]))} /></section>
      <details className="rounded-2xl border border-charcoal/15 bg-paper p-5"><summary className="cursor-pointer font-semibold">Import company transactions (JSON)</summary><ImportForm companyId={company.id} pending={pending} onImport={data => execute(() => recordPartnerEntries(data))} /></details>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Transaction report</h2><Button variant="secondary" onClick={() => download(`${company.id}-transactions.csv`, [['Company','Date','Type','SKU','Quantity','Amount NPR','Reference','Website order ID','Note','Recorded by'], ...periodEntries.map(e => [company.name,e.occurredOn,ENTRY_LABELS[e.kind],e.sku,e.quantity,(e.amountMinor/100).toFixed(2),e.reference,e.orderId,e.note,e.actor])])}>Export transactions CSV</Button></div><div className="max-h-[32rem] overflow-auto rounded-2xl border border-charcoal/10 bg-paper"><table className="w-full min-w-[800px] text-left text-sm"><thead className="sticky top-0 bg-ivory"><tr>{['Date','Entry','SKU / units','Amount','Reference','Order','Note'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{periodEntries.map(e => <tr key={e.id} className="border-t border-charcoal/10"><td className="p-3">{e.occurredOn}</td><td className="p-3">{ENTRY_LABELS[e.kind]}</td><td className="p-3">{e.sku ? `${e.sku} / ${e.quantity}` : '—'}</td><td className="p-3">{formatNpr(e.amountMinor)}</td><td className="p-3">{e.reference}</td><td className="p-3">{orders.find(o=>o.id === e.orderId)?.orderNumber ?? e.orderId ?? '—'}</td><td className="p-3">{e.note}</td></tr>)}</tbody></table>{!periodEntries.length && <p className="p-5 text-sm text-muted">No entries in this date range.</p>}</div></section>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Linked website orders</h2><Button variant="secondary" onClick={() => download(`${company.id}-orders.csv`, [['Order','Date','Status','Payment status','Sales company','Courier','External reference','Tracking','Order value NPR','Units'], ...linked.map(o => [o.orderNumber,o.createdAt,o.orderStatus,o.paymentStatus,partners.find(p=>p.id===o.salesPartnerId)?.name,partners.find(p=>p.id===o.courierPartnerId)?.name,o.externalReference,o.trackingNumber,(o.grandTotalMinor/100).toFixed(2),o.items.reduce((s,i)=>s+i.quantity,0)])])}>Export orders CSV</Button></div><div className="max-h-96 overflow-auto rounded-2xl border border-charcoal/10 bg-paper"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr>{['Order','Status','Payment','Value','External reference','Tracking'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{linked.map(o=><tr key={o.id} className="border-t border-charcoal/10">{[o.orderNumber,o.orderStatus,o.paymentStatus,formatNpr(o.grandTotalMinor),o.externalReference || '—',o.trackingNumber || '—'].map((v,i)=><td key={i} className="p-3">{v}</td>)}</tr>)}</tbody></table>{!linked.length && <p className="p-5 text-sm text-muted">No linked website orders in this date range.</p>}</div></section>
    </> : <p className="rounded-xl bg-paper p-6 text-muted">Add or select a company to view its stock, settlements and reports.</p>}
    <section className="rounded-2xl border border-charcoal/15 bg-paper p-5"><h2 className="text-xl">Assign a website order</h2><p className="mt-2 text-sm text-muted">A sales company and courier can be different. New orders automatically inherit the courier assigned to their delivery option.</p><OrderAssignment partners={partners} orders={orders} pending={pending} onSave={data => execute(() => assignOrderPartners(data))} /></section>
  </div>;
}

function CompanyForm({company,pending,onSave}:{company?:Partner;pending:boolean;onSave:(data:Parameters<typeof savePartner>[0])=>void}) {
  const [s,setS]=useState({id:company?.id??'',name:company?.name??'',kind:company?.kind??'courier',contact:company?.contact??'',accountReference:company?.accountReference??'',notes:company?.notes??'',active:company?.active??true});
  return <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();onSave(s);}}>
    <Field label="Company name"><input required className={inputClass} value={s.name} placeholder="Daraz, Pathao, or your courier" onChange={e=>setS({...s,name:e.target.value,...(!company?{id:e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}: {})})}/></Field>
    <Field label="Stable company ID"><input required readOnly={Boolean(company)} pattern="[a-zA-Z0-9_-]+" className={inputClass} value={s.id} onChange={e=>setS({...s,id:e.target.value})}/></Field>
    <Field label="Company type"><select className={inputClass} value={s.kind} onChange={e=>setS({...s,kind:e.target.value as Partner['kind']})}>{['marketplace','courier','distributor','other'].map(k=><option key={k}>{k}</option>)}</select></Field>
    <Field label="Contact"><input className={inputClass} value={s.contact} onChange={e=>setS({...s,contact:e.target.value})}/></Field>
    <Field label="Merchant / account reference"><input className={inputClass} value={s.accountReference} onChange={e=>setS({...s,accountReference:e.target.value})}/></Field>
    <Field label="Notes (no API keys or passwords)"><textarea className={inputClass} value={s.notes} onChange={e=>setS({...s,notes:e.target.value})}/></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.active} onChange={e=>setS({...s,active:e.target.checked})}/>Active company</label><Button type="submit" disabled={pending}>{pending?'Saving…':'Save company'}</Button>
  </form>;
}
type EntryInput = Parameters<typeof recordPartnerEntries>[0][number];
function EntryForm({company,skus,orders,pending,onSave}:{company:Partner;skus:string[];orders:PartnerOrder[];pending:boolean;onSave:(data:EntryInput)=>void}) {
  const [s,setS]=useState({kind:'stock_in' as PartnerEntryKind,sku:skus[0]??'',quantity:'1',amount:'',reference:'',orderId:'',occurredOn:today(),note:''});
  const stock = ['stock_in','stock_out','sale','return'].includes(s.kind);
  const stockOnly = ['stock_in','stock_out'].includes(s.kind);
  return <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e=>{e.preventDefault();onSave({partnerId:company.id,kind:s.kind,sku:stock?s.sku:'',quantity:stock?Number(s.quantity):0,amountMinor:stockOnly?0:Math.round(Number(s.amount)*100),reference:s.reference,orderId:['sale','return'].includes(s.kind)?null:s.orderId||null,occurredOn:s.occurredOn,note:s.note});}}>
    <Field label="Entry type"><select className={inputClass} value={s.kind} onChange={e=>setS({...s,kind:e.target.value as PartnerEntryKind})}>{Object.entries(ENTRY_LABELS).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field>
    <Field label="Date"><input required type="date" className={inputClass} value={s.occurredOn} onChange={e=>setS({...s,occurredOn:e.target.value})}/></Field>
    <Field label="Unique statement / transaction reference"><input required className={inputClass} value={s.reference} onChange={e=>setS({...s,reference:e.target.value})}/></Field>
    {stock && <><Field label="SKU"><input required list="partner-skus" className={inputClass} value={s.sku} onChange={e=>setS({...s,sku:e.target.value})}/><datalist id="partner-skus">{skus.map(sku=><option key={sku} value={sku}/>)}</datalist></Field><Field label="Units"><input type="number" required min="1" step="1" className={inputClass} value={s.quantity} onChange={e=>setS({...s,quantity:e.target.value})}/></Field></>}
    {!stockOnly && <Field label="Total amount, NPR"><input type="number" min="0.01" step="0.01" required className={inputClass} value={s.amount} onChange={e=>setS({...s,amount:e.target.value})}/></Field>}
    {!['sale','return'].includes(s.kind) && <Field label="Related website order (optional)"><select className={inputClass} value={s.orderId} onChange={e=>setS({...s,orderId:e.target.value})}><option value="">Company statement / no order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.orderNumber}</option>)}</select></Field>}
    <Field label="Note"><input className={inputClass} value={s.note} onChange={e=>setS({...s,note:e.target.value})}/></Field><div className="flex items-end"><Button type="submit" disabled={pending||!company.active}>{pending?'Recording…':'Record entry'}</Button></div>
  </form>;
}
function ImportForm({companyId,pending,onImport}:{companyId:string;pending:boolean;onImport:(entries:EntryInput[])=>void}) {
  const [text,setText]=useState(''); const [error,setError]=useState('');
  const preview = useMemo(()=>{try {const parsed=JSON.parse(text);return Array.isArray(parsed)?parsed.length:0;}catch{return 0;}},[text]);
  return <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();try{const parsed=JSON.parse(text);if(!Array.isArray(parsed)||!parsed.length||parsed.length>100)throw new Error('Import 1–100 entries at a time.');setError('');onImport(parsed.map(row=>({...row,partnerId:companyId})));}catch(e){setError(e instanceof Error?e.message:'Invalid JSON.');}}}><p className="text-sm text-muted">Amounts are integer paisa (NPR × 100). All rows are validated and saved together, or none are saved. Keep unique references when importing future company exports.</p><pre className="overflow-x-auto rounded-xl bg-ivory p-3 text-xs">{'[{"kind":"stock_in","sku":"TMG-1000","quantity":10,"amountMinor":0,"reference":"opening-001","orderId":null,"occurredOn":"2026-09-16","note":"Opening stock"}]'}</pre><label className="block text-sm">Transactions JSON<textarea required aria-label="Transactions JSON" rows={7} className={`${inputClass} mt-2 font-mono`} value={text} onChange={e=>setText(e.target.value)}/></label><p className="text-xs text-muted">{preview} rows ready for validation</p>{error&&<p role="alert" className="text-critical">{error}</p>}<Button type="submit" disabled={pending||!preview}>Validate and import</Button></form>;
}
function OrderAssignment({orders,partners,pending,onSave}:{orders:PartnerOrder[];partners:Partner[];pending:boolean;onSave:(data:Parameters<typeof assignOrderPartners>[0])=>void}) {
  const [s,setS]=useState({orderId:'',salesPartnerId:'',courierPartnerId:'',externalReference:'',trackingNumber:''});
  return <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e=>{e.preventDefault();onSave({...s,salesPartnerId:s.salesPartnerId||null,courierPartnerId:s.courierPartnerId||null});}}>
    <Field label="Website order"><select required className={inputClass} value={s.orderId} onChange={e=>{const o=orders.find(o=>o.id===e.target.value);setS({orderId:e.target.value,salesPartnerId:o?.salesPartnerId??'',courierPartnerId:o?.courierPartnerId??'',externalReference:o?.externalReference??'',trackingNumber:o?.trackingNumber??''});}}><option value="">Choose order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.orderNumber}</option>)}</select></Field>
    {(['salesPartnerId','courierPartnerId'] as const).map(key=><Field key={key} label={key==='salesPartnerId'?'Sales company':'Courier company'}><select className={inputClass} value={s[key]} onChange={e=>setS({...s,[key]:e.target.value})}><option value="">{key==='salesPartnerId'?'Direct website sale':'Not assigned'}</option>{partners.filter(p=>p.active||p.id===s[key]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>)}
    <Field label="External order reference"><input className={inputClass} value={s.externalReference} onChange={e=>setS({...s,externalReference:e.target.value})}/></Field><Field label="Courier tracking number"><input className={inputClass} value={s.trackingNumber} onChange={e=>setS({...s,trackingNumber:e.target.value})}/></Field><div className="flex items-end"><Button type="submit" disabled={pending||!s.orderId}>Save order companies</Button></div>
  </form>;
}
