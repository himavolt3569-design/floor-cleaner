import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function load(file, imports = {}) {
  let source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [from,to] of Object.entries(imports)) source=source.replace(from,pathToFileURL(to).href);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const {summarizeLedger,validateLedgerBalance,csvCell}=await load('src/lib/partners/ledger.ts');
const {normalizeNepalAddress}=await load('src/lib/location/nepal-address.ts',{'../../config/nepal':`${process.cwd()}/src/config/nepal.ts`});
const e=(kind,quantity,amountMinor=0,sku='TMG-1000')=>({id:crypto.randomUUID(),partnerId:'test',kind,quantity,amountMinor,sku,reference:'test',orderId:null,occurredOn:'2026-09-16',note:'',actor:'test',createdAt:''});
const ledger=[e('stock_in',10),e('sale',4,300000),e('return',1,75000),e('stock_out',2),e('collection',0,300000,''),e('refund',0,75000,''),e('fee',0,25000,''),e('remittance',0,150000,'')];
assert.equal(summarizeLedger(ledger).remainingUnits,5);
assert.equal(summarizeLedger(ledger).soldUnits,3);
assert.equal(summarizeLedger(ledger).salesMinor,225000);
assert.equal(summarizeLedger(ledger).heldMinor,50000);
assert.doesNotThrow(()=>validateLedgerBalance(ledger));
assert.throws(()=>validateLedgerBalance([...ledger,e('sale',6,450000)]),/stock/);
assert.throws(()=>validateLedgerBalance([...ledger,e('return',4,300000)]),/Returned/);
assert.throws(()=>validateLedgerBalance([...ledger,e('remittance',0,50001,'')]),/collected/);
assert.equal(summarizeLedger([e('stock_in',10),e('stock_in',5,0,'TMG-500')]).stock['TMG-500'].remaining,5);
assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
assert.equal(csvCell('hello, "world"'),'"hello, ""world"""');
const address=normalizeNepalAddress({country_code:'np',county:'Kathmandu District',state:'Bagmati Province',city:'Kathmandu Metropolitan City',suburb:'Ward 16',neighbourhood:'Thamel',road:'Tridevi Marg'});
assert.equal(address.province,'Bagmati');assert.equal(address.district,'Kathmandu');assert.equal(address.area,'Thamel');assert.equal(address.ward,'16');
assert.equal(normalizeNepalAddress({country_code:'np',county:'Kaski',state:'Gandaki Province'}).province,'Gandaki');
assert.equal(normalizeNepalAddress({country_code:'np',county:'Unknown District'}).district,'');
assert.throws(()=>normalizeNepalAddress({country_code:'in'}),/outside Nepal/);
console.log('PASS: 18 ledger, CSV and location assertions');
