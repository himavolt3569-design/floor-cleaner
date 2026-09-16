"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COPY_DEFAULTS } from "@/lib/content/copy";
import { saveCopyOverrides } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/Button";
export function CopyEditor({ overrides = {} }: { overrides?: Record<string,string> }) {
  const [values,setValues] = useState(overrides); const [search,setSearch] = useState(''); const [lang,setLang] = useState('en'); const [message,setMessage] = useState(''); const [pending,start] = useTransition(); const router=useRouter();
  const fields=Object.entries(COPY_DEFAULTS).filter(([key,value])=> key.startsWith(`${lang}.`) && !/^en\.(hero|intro|why)\./.test(key) && !/^en\.product\.(name|description)$/.test(key) && `${key} ${value}`.toLowerCase().includes(search.toLowerCase()));
  return <form className="space-y-5" onSubmit={e=>{e.preventDefault();start(async()=>{const result=await saveCopyOverrides(values);setMessage(result.ok?'Website labels and translations saved.':result.error??'Could not save.');if(result.ok)router.refresh();});}}>
    <p className="text-sm text-muted">Edit navigation, section headings, buttons, FAQ labels, and Nepali translations. English hero, introduction and brand copy are in Page copy & contact. English product descriptions are in Products & images.</p>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Language<select className="ml-3 rounded-lg border bg-paper p-2" value={lang} onChange={e=>setLang(e.target.value)}><option value="en">English</option><option value="ne">Nepali</option></select></label><input aria-label="Search website text" placeholder="Find a label or section…" className="min-w-0 flex-1 rounded-lg border bg-paper p-2" value={search} onChange={e=>setSearch(e.target.value)}/><Button type="submit" disabled={pending}>{pending?'Saving…':'Save labels & translations'}</Button></div>
    {message&&<p role="status" className="text-sm text-forest">{message}</p>}
    <div className="grid gap-4 xl:grid-cols-2">{fields.map(([key,fallback])=><label key={key} className="rounded-xl border border-charcoal/10 bg-paper p-4 text-xs text-muted">{key.split('.').slice(1).join(' / ')}<textarea rows={fallback.length>100?3:2} maxLength={3000} className="mt-2 w-full rounded-lg border bg-ivory p-3 text-sm text-charcoal" value={values[key]??fallback} onChange={e=>setValues({...values,[key]:e.target.value})}/></label>)}</div>
  </form>;
}
