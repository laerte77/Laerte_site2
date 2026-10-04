import React,{useState,useEffect,useCallback,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import{Users,DollarSign,RefreshCw,AlertCircle,Edit,Trash2,CalendarClock,UserCheck,UserMinus,Search,Filter}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{formatCurrency}from'@/lib/utils';
import{useToast}from'@/hooks/use-toast';

export default function ConsultaTodosDizimistas(){
 const{user}=useAuth(),{toast}=useToast();
 const[loading,setLoading]=useState(true),[error,setError]=useState(null);
 const[filtroPeriodo,setFiltroPeriodo]=useState('12'),[filtroStatus,setFiltroStatus]=useState('Todos'),[data,setData]=useState([]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);

  try{
   const cutoff=format(subMonths(new Date(),parseInt(filtroPeriodo,10)),'yyyy-MM-dd');

   const{data:dizimistas,error:a}=await supabase
    .from('igreja_dizimistas')
    .select('id,nome,telefone')
    .eq('user_id',user.id);

   if(a)throw a;

   const{data:entradas,error:b}=await supabase
    .from('igreja_entradas')
    .select('dizimista_id,valor,data')
    .eq('user_id',user.id)
    .not('dizimista_id','is',null);

   if(b)throw b;

   const processado=(dizimistas||[]).map(d=>{
    const contribs=(entradas||[]).filter(e=>e.dizimista_id===d.id);
    const total=contribs.reduce((s,x)=>s+Number(x.valor||0),0);
    const recentes=contribs.filter(x=>new Date(x.data)>=new Date(cutoff));
    const datas=contribs.map(x=>new Date(x.data));
    const last=datas.length?new Date(Math.max(...datas)):null;

    return{
     id:d.id,
     nome:d.nome,
     telefone:d.telefone,
     valorTotal:total,
     ultimaContribuicao:last?format(last,'yyyy-MM-dd'):null,
     status:recentes.length?'Ativo':'Inativo'
    };
   }).sort((a,b)=>a.nome.localeCompare(b.nome));

   setData(processado);
  }catch(e){
   setError(e.message);
  }finally{
   setLoading(false);
  }
 },[user,filtroPeriodo]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filtered=useMemo(
  ()=>filtroStatus==='Todos'?data:data.filter(x=>x.status===filtroStatus),
  [data,filtroStatus]
 );

 const ativos=data.filter(x=>x.status==='Ativo').length;
 const inativos=data.filter(x=>x.status==='Inativo').length;
 const totalHistorico=data.reduce((s,x)=>s+x.valorTotal,0);

 const action=(tipo,item)=>toast({
  title:'Ação em desenvolvimento',
  description:`A funcionalidade de ${tipo} para ${item.nome} será implementada em breve.`
 });

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <Users className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>
      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Consultas • Tesouraria</p>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">Todos os Dizimistas</h1>
       <p className="text-sm text-muted-foreground">Lista completa e análise geral dos dizimistas.</p>
      </div>
     </div>

     <Button variant="outline" onClick={fetchData} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-[hsl(var(--neon-igreja))]"/>Filtros</CardTitle>
    </CardHeader>

    <CardContent className="p-4">
     <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Select value={filtroStatus} onValueChange={setFiltroStatus}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Status"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <SelectItem value="Todos">Todos</SelectItem>
        <SelectItem value="Ativo">Ativos</SelectItem>
        <SelectItem value="Inativo">Inativos</SelectItem>
       </SelectContent>
      </Select>

      <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Período"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <SelectItem value="3">Últimos 3 meses</SelectItem>
        <SelectItem value="6">Últimos 6 meses</SelectItem>
        <SelectItem value="12">Últimos 12 meses</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase text-muted-foreground">Total Cadastrados</p><p className="mt-1 text-2xl font-bold">{data.length}</p></div><Users className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase text-muted-foreground">Total Histórico</p><p className="mt-1 text-2xl font-bold text-[hsl(var(--neon-igreja))]">{formatCurrency(totalHistorico)}</p></div><DollarSign className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-emerald-400">{ativos}</p></div><UserCheck className="h-5 w-5 text-emerald-400"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase text-muted-foreground">Inativos</p><p className="mt-1 text-2xl font-bold text-red-400">{inativos}</p></div><UserMinus className="h-5 w-5 text-red-400"/></div></CardContent></Card>
   </div>

   {error?(
    <Card className="border-red-500/30 bg-red-500/10">
     <CardContent className="flex flex-col items-center gap-2 p-8 text-red-400">
      <AlertCircle className="h-8 w-8"/>
      <p>Erro ao carregar dados: {error}</p>
     </CardContent>
    </Card>
   ):(
    <Card className="overflow-hidden border-border bg-card/70">
     <CardHeader className="border-b border-border bg-muted/20 pb-3">
      <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Relação Completa</CardTitle>
     </CardHeader>

     <CardContent className="p-0">
      {loading?(
       <div className="p-6"><div className="h-12 animate-pulse rounded-md bg-muted"/><div className="mt-2 h-12 animate-pulse rounded-md bg-muted"/><div className="mt-2 h-12 animate-pulse rounded-md bg-muted"/></div>
      ):(
       <div className="overflow-x-auto">
        <Table>
         <TableHeader className="bg-secondary/30">
          <TableRow>
           <TableHead>Nome</TableHead>
           <TableHead className="text-right">Total Histórico</TableHead>
           <TableHead className="text-center">Última Contribuição</TableHead>
           <TableHead className="text-center">Status</TableHead>
           <TableHead className="text-center">Ações</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>
          {!filtered.length?(
           <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum dizimista encontrado.</TableCell></TableRow>
          ):filtered.map(x=>(
           <TableRow key={x.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
            <TableCell className="font-medium">{x.nome}</TableCell>
            <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(x.valorTotal)}</TableCell>
            <TableCell className="text-center text-muted-foreground">{x.ultimaContribuicao?<div className="flex items-center justify-center gap-2"><CalendarClock className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/>{format(parseISO(x.ultimaContribuicao),'dd/MM/yyyy')}</div>:'-'}</TableCell>
            <TableCell className="text-center"><Badge className={x.status==='Ativo'?'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400':'border border-red-500/30 bg-red-500/10 text-red-400'}>{x.status}</Badge></TableCell>
            <TableCell className="text-center">
             <div className="flex justify-center gap-1">
              <Button variant="ghost" size="icon" onClick={()=>action('editar',x)} className="text-[hsl(var(--neon-igreja))]"><Edit className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" onClick={()=>action('excluir',x)} className="text-red-400"><Trash2 className="h-4 w-4"/></Button>
             </div>
            </TableCell>
           </TableRow>
          ))}

          {filtered.length>0&&(
           <TableRow className="bg-secondary/30 font-bold">
            <TableCell className="text-right">Total da visão:</TableCell>
            <TableCell className="text-right text-emerald-400">{formatCurrency(filtered.reduce((s,x)=>s+x.valorTotal,0))}</TableCell>
            <TableCell colSpan={3}/>
           </TableRow>
          )}
         </TableBody>
        </Table>
       </div>
      )}
     </CardContent>
    </Card>
   )}

  </div>
 );
}
