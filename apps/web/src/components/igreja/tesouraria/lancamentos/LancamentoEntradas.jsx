import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{Plus,Edit,Trash2,Download,Search,TrendingUp,DollarSign,FileText,ArrowUpRight,CalendarDays,Filter,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anos=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];
const TZ='America/Sao_Paulo';

const hoje=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>Number(String(v??'').replace(/\D/g,''))/100||0;

const Stat=({icon:Icon,label,value})=>(
 <Card className="border-border bg-card/80">
  <CardContent className="flex items-center gap-3 p-4">
   <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.20)] bg-[hsl(var(--neon-igreja)/.08)]">
    <Icon className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/>
   </div>
   <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-xl font-bold text-[hsl(var(--neon-igreja))]">{value}</p>
   </div>
  </CardContent>
 </Card>
);

export default function LancamentoEntradas(){
 const{user,adminUser}=useAuth(),{toast}=useToast(),mounted=useRef(true);
 const[items,setItems]=useState([]),[tipos,setTipos]=useState([]),[dizimistas,setDizimistas]=useState([]);
 const[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[month,setMonth]=useState('all'),[year,setYear]=useState(String(new Date().getFullYear()));
 const[open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[deleteItem,setDeleteItem]=useState(null),[current,setCurrent]=useState(null);
 const initial={data:hoje(),valor:'',tipo_entrada:'',dizimista_id:'',conferente:'',ofertante:''};
 const[form,setForm]=useState(initial);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const uid=adminUser?.id||user.id;
   const[a,b,c]=await Promise.all([
    supabase.from('igreja_entradas').select('*,igreja_dizimistas(nome)').eq('user_id',uid).order('data',{ascending:false}),
    supabase.from('igreja_tipos_entrada').select('id,entrada').eq('user_id',uid).order('entrada'),
    supabase.from('igreja_dizimistas').select('id,nome').eq('user_id',uid).order('nome')
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(c.error)throw c.error;
   if(mounted.current){
    setItems(a.data||[]);
    setTipos(b.data||[]);
    setDizimistas(c.data||[]);
   }
  }catch(e){
   toast({title:'Erro ao carregar dados',description:e.message,variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,adminUser,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('igreja_entradas_lanc_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_entradas'},load)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const display=i=>i.igreja_dizimistas?.nome||i.ofertante||'IGREJA';

 const filtered=useMemo(()=>items.filter(i=>{
  const d=new Date(i.data),q=search.trim().toLowerCase();
  return(
   (month==='all'||d.getUTCMonth()===Number(month))&&
   (year==='all'||d.getUTCFullYear()===Number(year))&&
   (!q||i.tipo_entrada?.toLowerCase().includes(q)||display(i).toLowerCase().includes(q))
  );
 }),[items,month,year,search]);

 const total=filtered.reduce((s,i)=>s+Number(i.valor||0),0);
 const media=filtered.length?total/filtered.length:0;
 const maior=filtered.reduce((m,i)=>Math.max(m,Number(i.valor||0)),0);

 const reset=()=>{setForm({...initial,data:hoje()});setCurrent(null)};
 const close=()=>{setOpen(false);reset()};

 const save=async()=>{
  if(!form.data||moneyNum(form.valor)<=0||!form.tipo_entrada||!form.conferente){
   toast({title:'Campos obrigatórios',description:'Preencha os campos obrigatórios.',variant:'destructive'});
   return;
  }

  const payload={
   data:form.data,
   valor:moneyNum(form.valor),
   tipo_entrada:form.tipo_entrada,
   dizimista_id:form.tipo_entrada==='DÍZIMO'?form.dizimista_id||null:null,
   conferente:form.conferente,
   ofertante:form.tipo_entrada==='OFERTA'?'IGREJA':form.tipo_entrada==='RENDIMENTO'?'BANCO':null,
   user_id:adminUser?.id||user.id
  };

  const q=current
   ?await supabase.from('igreja_entradas').update(payload).eq('id',current.id)
   :await supabase.from('igreja_entradas').insert(payload);

  if(q.error){
   toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
   return;
  }

  toast({title:'Sucesso',description:current?'Entrada atualizada.':'Entrada registrada.'});
  close();
  load();
 };

 const openDialog=item=>{
  if(item){
   setCurrent(item);
   setForm({
    data:item.data?.slice(0,10)||hoje(),
    valor:money(item.valor),
    tipo_entrada:item.tipo_entrada||'',
    dizimista_id:item.dizimista_id?String(item.dizimista_id):'',
    conferente:item.conferente||'',
    ofertante:item.ofertante||''
   });
  }else reset();
  setOpen(true);
 };

 const remove=async()=>{
  if(!deleteItem)return;
  const{error}=await supabase.from('igreja_entradas').delete().eq('id',deleteItem.id);
  if(error){
   toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
   return;
  }
  toast({title:'Sucesso',description:'Entrada removida.'});
  setDeleteItem(null);
  load();
 };

 const exportar=()=>{
  if(!filtered.length){
   toast({title:'Aviso',description:'Nenhum dado para exportar.',variant:'destructive'});
   return;
  }

  exportToExcel(
   filtered.map(i=>({
    Data:new Date(i.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}),
    Categoria:i.tipo_entrada,
    Descrição:display(i),
    Conferente:i.conferente,
    Valor:Number(i.valor||0)
   })),
   'Lançamento_Entradas',
   'Entradas'
  );
 };

 const clearFilters=()=>{
  setSearch('');
  setMonth('all');
  setYear('all');
 };

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <TrendingUp className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>

      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">
        Tesouraria • Lançamentos
       </p>
       <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--neon-igreja))]">
        Lançamento de Entradas
       </h1>
       <p className="text-sm text-muted-foreground">
        Registre e acompanhe as entradas financeiras da igreja.
       </p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={exportar}>
       <Download className="mr-2 h-4 w-4"/>Excel
      </Button>

      <Button variant="outline" onClick={()=>setSearchOpen(true)}>
       <Search className="mr-2 h-4 w-4"/>Selecionar
      </Button>

      <Button variant="outline" onClick={load}>
       <RefreshCw className="mr-2 h-4 w-4"/>Atualizar
      </Button>

      <Button
       onClick={()=>openDialog()}
       className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
      >
       <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
      </Button>
     </div>
    </div>
   </div>

   <div className="rounded-xl border border-border bg-card/70 p-3">
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_.6fr_.45fr_auto]">

     <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Buscar por tipo ou dizimista..."
       className="h-11 border-border bg-input pl-10"
      />
     </div>

     <Select value={month} onValueChange={setMonth}>
      <SelectTrigger className="h-11 border-border bg-input">
       <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
       <SelectValue placeholder="Mês"/>
      </SelectTrigger>

      <SelectContent className="dark-igreja border-border bg-card">
       <SelectItem value="all">Todos os Meses</SelectItem>
       {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
      </SelectContent>
     </Select>

     <Select value={year} onValueChange={setYear}>
      <SelectTrigger className="h-11 border-border bg-input">
       <SelectValue placeholder="Ano"/>
      </SelectTrigger>

      <SelectContent className="dark-igreja border-border bg-card">
       <SelectItem value="all">Todos</SelectItem>
       {anos.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
     </Select>

     <Button variant="outline" onClick={clearFilters} className="h-11 border-border">
      <Filter className="mr-2 h-4 w-4"/>Limpar
     </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Stat icon={FileText} label="Total de Registros" value={filtered.length}/>
    <Stat icon={DollarSign} label="Total do Período" value={`R$ ${total.toFixed(2)}`}/>
    <Stat icon={ArrowUpRight} label="Média por Registro" value={`R$ ${media.toFixed(2)}`}/>
    <Stat icon={TrendingUp} label="Maior Lançamento" value={`R$ ${maior.toFixed(2)}`}/>
   </div>

   <Card className="overflow-hidden border-border bg-card/70">
    <CardHeader className="border-b border-border bg-muted/20 pb-4">
     <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">
      Lançamentos de Entradas
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-secondary/30">
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoria</th>
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descrição</th>
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Data</th>
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Conferente</th>
         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Valor</th>
         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Ações</th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr><td colSpan="6" className="px-4 py-10 text-center text-muted-foreground">Carregando lançamentos...</td></tr>
        ):filtered.length===0?(
         <tr>
          <td colSpan="6" className="px-4 py-12">
           <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-10 w-10 text-muted-foreground"/>
            <p className="font-semibold">Nenhum lançamento encontrado</p>
            <p className="text-sm text-muted-foreground">Não existem registros para os filtros selecionados.</p>
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
             <Filter className="mr-2 h-4 w-4"/>Limpar Filtros
            </Button>
           </div>
          </td>
         </tr>
        ):filtered.map(i=>(
         <tr key={i.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30">
          <td className="px-4 py-4 font-medium">{i.tipo_entrada}</td>
          <td className="px-4 py-4">{display(i)}</td>
          <td className="px-4 py-4">{new Date(i.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td>
          <td className="px-4 py-4">{i.conferente||'-'}</td>
          <td className="px-4 py-4 text-right font-bold text-[hsl(var(--neon-igreja))]">R$ {Number(i.valor||0).toFixed(2)}</td>

          <td className="px-4 py-4">
           <div className="flex justify-end gap-1">
            <Button
             variant="ghost"
             size="icon"
             onClick={()=>openDialog(i)}
             className="text-[hsl(var(--neon-igreja))]"
            >
             <Edit className="h-4 w-4"/>
            </Button>

            <Button
             variant="ghost"
             size="icon"
             onClick={()=>setDeleteItem(i)}
             className="text-red-400"
            >
             <Trash2 className="h-4 w-4"/>
            </Button>
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={searchOpen}
    onClose={()=>setSearchOpen(false)}
    onSelect={i=>{
     openDialog(i);
     setSearchOpen(false);
    }}
    tableName="igreja_entradas"
    searchField="tipo_entrada"
    displayFields={[
     {key:'data',label:'Data',format:d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})},
     {key:'tipo_entrada',label:'Tipo'},
     {key:'valor',label:'Valor',format:v=>`R$ ${Number(v).toFixed(2)}`}
    ]}
    title="Buscar Entrada"
   />

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar Entrada':'Nova Entrada'}
    description="Preencha os dados do lançamento."
    icon={TrendingUp}
    theme="gold"
    footer={
     <>
      <Button variant="outline" onClick={close}>Cancelar</Button>
      <Button
       onClick={save}
       className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
      >
       Salvar
      </Button>
     </>
    }
   >
    <div className="space-y-5">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Data</Label>
       <Input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className="bg-input"/>
      </div>

      <div className="space-y-2">
       <Label>Valor</Label>
       <Input
        inputMode="decimal"
        value={form.valor}
        onChange={e=>setForm({...form,valor:money(e.target.value)})}
        placeholder="R$ 0,00"
        className="bg-input"
       />
      </div>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Entrada</Label>
      <Select value={form.tipo_entrada} onValueChange={v=>setForm({...form,tipo_entrada:v,dizimista_id:''})}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <ScrollArea className="h-48">
         {[...tipos].sort((a,b)=>a.entrada.localeCompare(b.entrada,'pt-BR')).map(t=>(
          <SelectItem key={t.id} value={t.entrada}>{t.entrada}</SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     {form.tipo_entrada==='DÍZIMO'&&(
      <div className="space-y-2">
       <Label>Dizimista</Label>
       <Select value={form.dizimista_id} onValueChange={v=>setForm({...form,dizimista_id:v})}>
        <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent className="dark-igreja bg-card">
         <ScrollArea className="h-48">
          {[...dizimistas].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(d=>(
           <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>
          ))}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>
     )}

     <div className="space-y-2">
      <Label>Conferente</Label>
      <Select value={form.conferente} onValueChange={v=>setForm({...form,conferente:v})}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <SelectItem value="Laerte">Laerte</SelectItem>
        <SelectItem value="Marcylene">Marcylene</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <AlertDialog open={!!deleteItem} onOpenChange={()=>setDeleteItem(null)}>
    <AlertDialogContent className="dark-igreja">
     <AlertDialogHeader><AlertDialogTitle>Excluir entrada?</AlertDialogTitle></AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={remove} className="bg-red-600">Excluir</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 );
}
