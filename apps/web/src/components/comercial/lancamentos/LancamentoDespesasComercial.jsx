import React,{useState,useEffect,useCallback}from'react';
import{Receipt,Plus,RefreshCw,Loader2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Textarea}from'@/components/ui/textarea';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalComercialPadrao from'../ModalComercialPadrao';

const GREEN='hsl(var(--neon-comercial))';
const FORM_ID='form-nova-despesa-comercial';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseValor=v=>{
 const value=String(v||'').trim().replace(/\s/g,'');
 if(!value)return 0;
 const normalized=value.includes(',')?value.replace(/\./g,'').replace(',','.'):value;
 return Number(normalized);
};
const brDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const initial={data:today(),valor:'',tipo_despesa_id:'',categoria:'fixa',fornecedor_id:'',forma_pagamento:'',observacoes:''};

export default function LancamentoDespesasComercial(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[form,setForm]=useState(initial);
 const[tipos,setTipos]=useState([]);
 const[fornecedores,setFornecedores]=useState([]);
 const[rows,setRows]=useState([]);
 const[modalOpen,setModalOpen]=useState(false);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);

 const carregar=useCallback(async()=>{
  if(!user){setLoading(false);return}
  setLoading(true);
  const[t,f,r]=await Promise.all([
   supabase.from('comercial_tipos_despesas').select('id,nome').eq('user_id',user.id).eq('ativo',true).order('nome'),
   supabase.from('comercial_fornecedores').select('id,nome').eq('user_id',user.id).eq('ativo',true).order('nome'),
   supabase.from('comercial_despesas').select('*').eq('user_id',user.id).order('data_despesa',{ascending:false}).limit(100)
  ]);
  const error=t.error||f.error||r.error;
  if(error)toast({title:'Erro ao carregar despesas',description:error.message,variant:'destructive'});
  setTipos(t.data||[]);
  setFornecedores(f.data||[]);
  setRows(r.data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{carregar()},[carregar]);

 const set=(key,value)=>setForm(old=>({...old,[key]:value}));
 const tipoNome=id=>tipos.find(t=>t.id===id)?.nome||'Tipo não informado';
 const fornecedorNome=id=>fornecedores.find(f=>f.id===id)?.nome||'—';

 const abrirModal=()=>{
  setForm({...initial,data:today()});
  setModalOpen(true);
 };

 const salvar=async e=>{
  e.preventDefault();
  if(!user||saving)return;

  const valorNumerico=parseValor(form.valor);

  if(!form.data||!form.tipo_despesa_id||!Number.isFinite(valorNumerico)||!(valorNumerico>0)||!form.forma_pagamento){
   toast({title:'Confira os campos',description:'Informe data, valor válido, tipo, classificação e forma de pagamento.',variant:'destructive'});
   return;
  }

  setSaving(true);
  const payload={
   user_id:user.id,
   data_despesa:form.data,
   valor:valorNumerico,
   tipo_despesa_id:form.tipo_despesa_id,
   categoria:form.categoria,
   descricao:tipoNome(form.tipo_despesa_id),
   fornecedor_id:form.fornecedor_id||null,
   forma_pagamento:form.forma_pagamento,
   observacoes:form.observacoes.trim()||null,
   status:'pendente'
  };

  const{error}=await supabase.from('comercial_despesas').insert(payload);

  if(error){
   toast({title:'Erro ao salvar despesa',description:error.message,variant:'destructive'});
  }else{
   toast({title:'Despesa registrada',description:'O lançamento foi salvo com sucesso.'});
   setModalOpen(false);
   setForm({...initial,data:today()});
   await carregar();
  }
  setSaving(false);
 };

 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
   <div className="flex items-center gap-3">
    <div className="rounded-xl border p-3" style={{borderColor:'hsl(var(--neon-comercial)/.3)',color:GREEN}}><Receipt/></div>
    <div>
     <p className="text-xs font-semibold uppercase tracking-widest" style={{color:GREEN}}>Lançamentos</p>
     <h1 className="text-2xl font-bold text-white">Despesas</h1>
     <p className="text-sm text-muted-foreground">Registre e organize as despesas do negócio.</p>
    </div>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={carregar} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button onClick={abrirModal} className="font-bold text-black" style={{background:GREEN}}><Plus className="mr-2 h-4 w-4"/>Registrar despesa</Button>
   </div>
  </div>

  <ModalComercialPadrao
   open={modalOpen}
   onClose={()=>!saving&&setModalOpen(false)}
   title="Registrar despesa"
   description="Preencha os dados para registrar uma nova despesa do negócio."
   icon={Receipt}
   footer={
    <>
     <Button type="button" variant="outline" onClick={()=>setModalOpen(false)} disabled={saving}>Cancelar</Button>
     <Button type="submit" form={FORM_ID} disabled={saving||!tipos.length} className="font-bold text-black" style={{background:GREEN}}>
      {saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Plus className="mr-2 h-4 w-4"/>}
      Salvar despesa
     </Button>
    </>
   }
  >
   <form id={FORM_ID} onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2">
     <Label>Data *</Label>
     <Input type="date" required value={form.data} onChange={e=>set('data',e.target.value)}/>
    </div>

    <div className="space-y-2">
     <Label>Valor (R$) *</Label>
     <Input type="text" inputMode="decimal" required value={form.valor} onChange={e=>set('valor',e.target.value)} placeholder="Digite o valor"/>
    </div>

    <div className="space-y-2">
     <Label>Tipo da despesa *</Label>
     <select required value={form.tipo_despesa_id} onChange={e=>set('tipo_despesa_id',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
      <option value="">Selecione o tipo</option>
      {tipos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
     </select>
     {!tipos.length&&<p className="text-xs text-amber-400">Cadastre um tipo antes de lançar uma despesa.</p>}
    </div>

    <div className="space-y-2">
     <Label>Classificação *</Label>
     <select required value={form.categoria} onChange={e=>set('categoria',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
      <option value="fixa">Fixa</option>
      <option value="variavel">Variável</option>
     </select>
    </div>

    <div className="space-y-2">
     <Label>Fornecedor (opcional)</Label>
     <select value={form.fornecedor_id} onChange={e=>set('fornecedor_id',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
      <option value="">Sem fornecedor</option>
      {fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
     </select>
    </div>

    <div className="space-y-2">
     <Label>Forma de pagamento *</Label>
     <select required value={form.forma_pagamento} onChange={e=>set('forma_pagamento',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
      <option value="">Selecione</option>
      {['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Transferência','Boleto','Outro'].map(v=><option key={v} value={v}>{v}</option>)}
     </select>
    </div>

    <div className="space-y-2 sm:col-span-2">
     <Label>Observações (opcional)</Label>
     <Textarea rows={3} value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} placeholder="Informações adicionais..."/>
    </div>

    <div className="rounded-xl border border-[hsl(var(--neon-comercial)/.3)] bg-[hsl(var(--neon-comercial)/.06)] p-4 sm:col-span-2">
     <p className="text-sm text-gray-400">Valor da despesa</p>
     <p className="text-2xl font-bold" style={{color:GREEN}}>{money(parseValor(form.valor))}</p>
    </div>
   </form>
  </ModalComercialPadrao>

  <Card className="border-border bg-card">
   <CardHeader><CardTitle style={{color:GREEN}}>Despesas recentes</CardTitle></CardHeader>
   <CardContent className="overflow-x-auto p-0">
    <table className="w-full min-w-[850px] text-sm">
     <thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
      <th className="p-3">Data</th>
      <th className="p-3">Tipo</th>
      <th className="p-3">Classificação</th>
      <th className="p-3">Fornecedor</th>
      <th className="p-3">Pagamento</th>
      <th className="p-3 text-right">Valor</th>
     </tr></thead>
     <tbody>
      {loading?<tr><td colSpan={6} className="p-8 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr>
      :rows.length?rows.map(r=><tr key={r.id} className="border-b border-border">
       <td className="p-3">{brDate(r.data_despesa)}</td>
       <td className="p-3">{tipos.find(t=>t.id===r.tipo_despesa_id)?.nome||r.descricao||'—'}</td>
       <td className="p-3 capitalize">{r.categoria==='fixa'?'Fixa':r.categoria==='variavel'?'Variável':'Antiga'}</td>
       <td className="p-3">{fornecedorNome(r.fornecedor_id)}</td>
       <td className="p-3">{r.forma_pagamento||'—'}</td>
       <td className="p-3 text-right font-semibold">{money(r.valor)}</td>
      </tr>)
      :<tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma despesa cadastrada.</td></tr>}
     </tbody>
    </table>
   </CardContent>
  </Card>
 </div>;
}
