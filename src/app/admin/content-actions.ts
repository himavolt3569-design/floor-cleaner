"use server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { requireDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COPY_DEFAULTS } from "@/lib/content/copy";
export async function saveCopyOverrides(input: Record<string,string>) {
  try {
    const user=await requireSuperAdmin();
    const values=z.record(z.string().refine(k=>Object.hasOwn(COPY_DEFAULTS,k)),z.string().max(3000)).parse(input);
    const db=requireDb(); const batch=db.batch();
    batch.set(db.collection('siteSettings').doc('site'),{copyOverrides:values,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    batch.set(db.collection('orderEvents').doc(),{type:'website_copy_updated',actor:user.email,createdAt:FieldValue.serverTimestamp()});
    await batch.commit(); revalidatePath('/');revalidatePath('/admin/content');return {ok:true};
  }catch{return {ok:false,error:'Could not save website text. Check your session and values.'};}
}
export async function saveProductCopy(input:{id:string;name:string;description:string;shortDescription:string}) {
  try {
    const user=await requireSuperAdmin();
    const {id,...data}=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/),name:z.string().trim().min(2).max(160),description:z.string().trim().min(2).max(3000),shortDescription:z.string().trim().min(2).max(600)}).parse(input);
    const db=requireDb();const batch=db.batch();batch.update(db.collection('products').doc(id),{...data,updatedAt:FieldValue.serverTimestamp()});batch.set(db.collection('orderEvents').doc(),{type:'product_copy_updated',productId:id,actor:user.email,createdAt:FieldValue.serverTimestamp()});await batch.commit();revalidatePath('/');revalidatePath('/admin/content');return {ok:true};
  }catch{return {ok:false,error:'Could not save the product description.'};}
}
