import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Search,Edit,WalletCards}from'lucide-react';
import{format}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';

const TZ='America/Sao_Paulo',RED='hsl(0 84% 60%)';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const formatDateDisplay=v=>{
 if(!v)return'-';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return`${m[3]}/${m[2]}/${m[1]}`;
 const d=new Date(v);
 return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(d);
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const initial=()=>({
 data:getBRDate(),
 despesa:'',
 valor:'',
 categoria:'',
 forma_pagamento:'Débito',
 parcelas:1,
 cartao_id:'',
 responsavel_id:''
});

const Despesas=()=>{
 const{user}=useAuth(),{toast}=useToast(),{isOnline,checkPending}=useOnlineStatus(),mounted=useRef(true);
 const[loading,setLoading]=useState(true),[despesas,setDespesas]=useState([]),[filtered,setFiltered]=useState([]);
 const[search,setSearch]=useState(''),[month,setMonth]=useState(String(new Date().getMonth())),[year,setYear]=useState(String(new Date().getFullYear()));
 const[open,setOpen]=useState(false),[tipos,setTipos]=useState([]),[cartoes,setCartoes]=useState([]),[usuarios,setUsuarios]=useState([]);
 const[editing,setEditing]=useState(null),[form,setForm]=useState(initial);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchTipos=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('tipos_despesa').select('nome_despesa,categoria').eq('user_id',user.id).order('nome_despesa');
  if(!mounted.current)return;
  if(!error)setTipos(data||[]);
 },[user]);

 const fetchCartoes=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('pessoal_cartoes').select('id,nome').eq('user_id',user.id).order('nome');
  if(!error&&mounted.current)setCartoes(data||[]);
 },[user]);

 const fetchUsuarios=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('pessoal_cartao_usuarios').select('id,nome').eq('user_id',user.id).order('nome');
  if(!error&&mounted.current)setUsuarios(data||[]);
 },[user]);

 const fetchDespesas=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const ini=format(new Date(+year,+month,1),'yyyy-MM-dd'),fim=format(new Date(+year,+month+1,0),'yyyy-MM-dd');
   const{data,error}=await supabase.from('despesas').select('*').eq('user_id',user.id).gte('data',ini).lte('data',fim).order('data',{ascending:false});
   if(error)throw error;
   if(mounted.current){setDespesas(data||[]);setFiltered(data||[])}
  }catch(e){if(mounted.current)toast({title:'Erro',description:'Não foi possível carregar as despesas.',variant:'destructive'})}
  finally{if(mounted.current)setLoading(false)}
 },[user,month,year,toast]);

 useEffect(()=>{fetchDespesas();fetchTipos();fetchCartoes();fetchUsuarios()},[fetchDespesas,fetchTipos,fetchCartoes,fetchUsuarios]);

 useEffect(()=>{
  const q=search.toLowerCase();
  setFiltered(despesas.filter(x=>x.despesa?.toLowerCase().includes(q)||x.categoria?.toLowerCase().includes(q)));
 },[search,despesas]);

 const reset=useCallback(()=>{setForm(initial());setEditing(null)},[]);
 const closeModal=useCallback(()=>{setOpen(false);reset()},[reset]);

 const openDialog=item=>{
  if(item){
   setEditing(item.id);
   setForm({
    data:String(item.data||'').slice(0,10)||getBRDate(),
    despesa:item.despesa||'',
    valor:money(Number(item.valor||0)*100),
    categoria:item.categoria||'',
    forma_pagamento:item.forma_pagamento||'Débito',
    parcelas:item.parcelas||1,
    cartao_id:item.cartao_id||'',
    responsavel_id:item.responsavel_id||''
   });
  }else reset();
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  const valor=moneyNum(form.valor);

  if(!form.data||!form.despesa||valor<=0){
   toast({title:'Campos obrigatórios',description:'Preencha todos os campos obrigatórios.',variant:'destructive'});
   return;
  }

  if(form.forma_pagamento==='Crédito'&&!form.cartao_id){
   toast({title:'Cartão obrigatório',description:'Selecione o cartão de crédito utilizado.',variant:'destructive'});
   return;
  }

  try{
   const payload={
    user_id:user.id,data:form.data,despesa:form.despesa,valor,categoria:form.categoria,
    forma_pagamento:form.forma_pagamento,parcelas:Math.max(1,parseInt(form.parcelas,10)||1),
    cartao_id:form.forma_pagamento==='Crédito'?form.cartao_id:null,
    responsavel_id:form.forma_pagamento==='Crédito'?(form.responsavel_id||null):null
   };

   if(!isOnline&&!editing){
    await saveOfflineData('pessoal_despesas',payload);
    toast({title:'Salvo offline',description:'Despesa salva localmente.'});
    reset();checkPending();return;
   }

   if(editing){
    if(!isOnline){
     toast({title:'Offline',description:'Edição offline não permitida.',variant:'destructive'});
     return;
    }
    const{error}=await supabase.from('despesas').update(payload).eq('id',editing);
    if(error)throw error;
    toast({title:'Sucesso',description:'Despesa atualizada com sucesso.'});
   }else{
    const{error}=await supabase.from('despesas').insert([payload]);
    if(error)throw error;
    toast({title:'Sucesso',description:'Despesa registrada com sucesso.'});
   }

   reset();
   if(isOnline)fetchDespesas();
  }catch(e){
   toast({title:'Erro',description:e.message||'Falha ao salvar despesa.',variant:'destructive'})
  }
 };

 const del=async id=>{
  if(!isOnline){
   toast({title:'Offline',description:'Exclusão offline não permitida.',variant:'destructive'});
   return;
  }
  try{
   const{error}=await supabase.from('despesas').delete().eq('id',id);
   if(error)throw error;
   toast({title:'Sucesso',description:'Despesa removida.'});
   fetchDespesas();
  }catch(e){toast({title:'Erro',description:'Falha ao remover despesa.',variant:'destructive'})}
 };

 const total=filtered.reduce((a,x)=>a+Number(x.valor||0),0);
 const responsavel=id=>usuarios.find(x=>x.id===id)?.nome||'';
 const moeda=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-6">
   <OfflineIndicator/>

   <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">Finanças Pessoais</p>
     <h1 className="mt-1 text-3xl font-bold tracking-tight">Despesas</h1>
     <p className="text-sm text-muted-foreground">Gerencie seus gastos mensais (A-Z).</p>
    </div>

    <Button className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]" onClick={()=>openDialog()}>
     <Plus className="mr-2 h-4 w-4"/>Nova Despesa
    </Button>
   </div>

   <Dialog open={open} onOpenChange={v=>v?setOpen(true):closeModal()}>
    <DialogContent
     onInteractOutside={e=>e.preventDefault()}
     onPointerDownOutside={e=>e.preventDefault()}
     onEscapeKeyDown={e=>e.preventDefault()}
     className="dark-pessoal w-[calc(100%-2rem)] max-w-[680px] overflow-hidden rounded-2xl border-0 bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]"
     style={{border:'1px solid hsl(0 84% 60% / .28)'}}
    >
     <DialogHeader
      className="px-6 py-5 pr-14"
      style={{borderBottom:'1px solid hsl(0 84% 60% / .15)',background:'hsl(0 84% 60% / .045)'}}
     >
      <div className="flex items-center gap-3">
       <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{border:'1px solid hsl(0 84% 60% / .24)',background:'hsl(0 84% 60% / .10)'}}>
        <WalletCards className="h-5 w-5" style={{color:RED}}/>
       </div>
       <div>
        <DialogTitle className="text-xl font-bold">{editing?'Editar Despesa':'Nova Despesa'}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
         {editing?'Atualize os dados da despesa.':'Preencha os dados da nova despesa.'}
        </DialogDescription>
       </div>
      </div>
     </DialogHeader>

     <form onSubmit={save} className="max-h-[calc(100vh-180px)] overflow-y-auto">
      <div className="space-y-5 px-6 py-6">

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
         <Label>Data</Label>
         <Input type="date" name="data" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required className="h-11 rounded-xl bg-input" style={{'--tw-ring-color':'hsl(0 84% 60% / .25)'}}/>
        </div>

        <div className="space-y-2">
         <Label>Valor</Label>
         <Input type="text" inputMode="numeric" name="valor" value={form.valor} onChange={e=>setForm({...form,valor:money(e.target.value)})} required placeholder="R$ 0,00" className="h-11 rounded-xl bg-input font-semibold tabular-nums"/>
        </div>
       </div>

       <div className="space-y-2">
        <Label>Descrição (Tipo de Despesa)</Label>
        <Select value={form.despesa} onValueChange={v=>{const t=tipos.find(x=>x.nome_despesa===v);setForm({...form,despesa:v,categoria:t?.categoria||''})}}>
         <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
         <SelectContent className="dark-pessoal rounded-xl bg-card"><ScrollArea className="h-48">{tipos.map(t=><SelectItem key={t.nome_despesa} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea></SelectContent>
        </Select>
       </div>

       <div className="space-y-2">
        <Label>Categoria</Label>
        <Input value={form.categoria||'Selecione um tipo'} readOnly className="h-11 rounded-xl bg-muted text-muted-foreground"/>
       </div>

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
         <Label>Pagamento</Label>
         <Select value={form.forma_pagamento} onValueChange={v=>setForm({...form,forma_pagamento:v})}>
          <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
          <SelectContent className="dark-pessoal rounded-xl bg-card">
           <SelectItem value="Dinheiro">Dinheiro</SelectItem>
           <SelectItem value="Débito">Débito</SelectItem>
           <SelectItem value="Crédito">Crédito</SelectItem>
           <SelectItem value="Pix">Pix</SelectItem>
           <SelectItem value="Boleto">Boleto</SelectItem>
          </SelectContent>
         </Select>
        </div>

        <div className="space-y-2">
         <Label>Parcelas</Label>
         <Input type="number" name="parcelas" min="1" value={form.parcelas} onChange={e=>setForm({...form,parcelas:e.target.value})} className="h-11 rounded-xl bg-input"/>
        </div>
       </div>

       {form.forma_pagamento==='Crédito'&&(
        <div className="space-y-5 rounded-xl p-4" style={{border:'1px solid hsl(0 84% 60% / .14)',background:'hsl(0 84% 60% / .025)'}}>
         <div className="space-y-2">
          <Label>Cartão de Crédito</Label>
          {cartoes.length===0?
           <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhum cartão cadastrado. Cadastre um cartão em Cadastros → Cartões de Crédito.</p>:
           <Select value={form.cartao_id} onValueChange={v=>setForm({...form,cartao_id:v})}>
            <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o cartão"/></SelectTrigger>
            <SelectContent className="dark-pessoal rounded-xl bg-card"><ScrollArea className="h-40">{cartoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent>
           </Select>
          }
         </div>

         <div className="space-y-2">
          <Label>Responsável pela Compra</Label>
          {usuarios.length===0?
           <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.</p>:
           <Select value={form.responsavel_id||'nenhum'} onValueChange={v=>setForm({...form,responsavel_id:v==='nenhum'?'':v})}>
            <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o responsável"/></SelectTrigger>
            <SelectContent className="dark-pessoal rounded-xl bg-card">
             <ScrollArea className="h-40">
              <SelectItem value="nenhum">— Sem responsável —</SelectItem>
              {usuarios.map(u=><SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
             </ScrollArea>
            </SelectContent>
           </Select>
          }
         </div>
        </div>
       )}
      </div>

      <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4">
       <Button type="button" variant="outline" onClick={closeModal} className="h-10 rounded-xl border-border px-5">Cancelar</Button>
       <Button type="submit" className="h-10 rounded-xl px-6 font-semibold text-white transition-all hover:opacity-90" style={{background:RED,boxShadow:'0 0 18px hsl(0 84% 60% / .22)'}}>
        {editing?'Salvar Alterações':'Salvar Despesa'}
       </Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <div className="grid gap-4 md:grid-cols-4">
    <Card className="col-span-1 border-border md:col-span-3">
     <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
      <div className="flex w-full flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 bg-input"/></div>
      <div className="flex w-full gap-2 md:w-auto">
       <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-[140px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card">{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i)}>{format(new Date(2024,i,1),'MMMM',{locale:ptBR})}</SelectItem>)}</SelectContent></Select>
       <Select value={year} onValueChange={setYear}><SelectTrigger className="w-[100px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card">{[2023,2024,2025,2026].map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
      </div>
     </CardContent>
    </Card>

    <Card className="border-red-200/20 bg-gradient-to-br from-red-500/10 to-red-400/10">
     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-500">Total no Período</CardTitle></CardHeader>
     <CardContent><div className="text-2xl font-bold text-red-500">{moeda.format(total)}</div></CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?
         <TableRow><TableCell colSpan={7} className="py-8 text-center">Carregando...</TableCell></TableRow>:
        filtered.length===0?
         <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma despesa encontrada.</TableCell></TableRow>:
        filtered.map(item=><TableRow key={item.id} className="transition-colors hover:bg-muted/50">
         <TableCell className="font-medium">{item.despesa}</TableCell>
         <TableCell><Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">{item.categoria||'OUTROS'}</Badge></TableCell>
         <TableCell>{formatDateDisplay(item.data)}</TableCell>
         <TableCell className="text-sm text-muted-foreground">{item.forma_pagamento}{item.cartao_id&&cartoes.find(c=>c.id===item.cartao_id)?` • ${cartoes.find(c=>c.id===item.cartao_id).nome}`:''}</TableCell>
         <TableCell>{item.responsavel_id?<Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400">{responsavel(item.responsavel_id)}</Badge>:<span className="italic text-muted-foreground">—</span>}</TableCell>
         <TableCell className="text-right font-bold text-red-500">{moeda.format(Number(item.valor||0))}</TableCell>
         <TableCell>
          <div className="flex justify-center gap-2">
           <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" onClick={()=>openDialog(item)}><Edit className="h-4 w-4"/></Button>
           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={()=>del(item.id)}><Trash2 className="h-4 w-4"/></Button>
          </div>
         </TableCell>
        </TableRow>)
        }
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 );
};

export default Despesas;
