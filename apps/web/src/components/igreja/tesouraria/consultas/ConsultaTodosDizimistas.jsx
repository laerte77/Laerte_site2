import React,{useState,useEffect,useCallback,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import KPICard from'@/components/ui/KPICard';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{Users,DollarSign,RefreshCw,AlertCircle,Edit,Trash2,CalendarClock,UserCheck,UserMinus,Search}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{formatCurrency}from'@/lib/utils';
import{useToast}from'@/hooks/use-toast';

export default function ConsultaTodosDizimistas(){
 const{user}=useAuth();
 const{toast}=useToast();

 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);
 const[filtroPeriodo,setFiltroPeriodo]=useState('12');
 const[filtroStatus,setFiltroStatus]=useState('Todos');
 const[data,setData]=useState([]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);

  try{
   const months=parseInt(filtroPeriodo,10);
   const cutoffDate=format(subMonths(new Date(),months),'yyyy-MM-dd');

   const{data:dizimistas,error:dizError}=await supabase
    .from('igreja_dizimistas')
    .select('id,nome,telefone')
    .eq('user_id',user.id);

   if(dizError)throw dizError;

   const{data:entradas,error:entError}=await supabase
    .from('igreja_entradas')
    .select('dizimista_id,valor,data')
    .eq('user_id',user.id)
    .not('dizimista_id','is',null);

   if(entError)throw entError;

   const processado=dizimistas.map(d=>{
    const contribs=entradas.filter(e=>e.dizimista_id===d.id);
    const valorTotal=contribs.reduce((a,c)=>a+Number(c.valor),0);

    const recentes=contribs.filter(
     c=>new Date(c.data)>=new Date(cutoffDate)
    );

    const datas=contribs.map(c=>new Date(c.data));
    const ultimaData=datas.length?new Date(Math.max(...datas)):null;

    return{
     id:d.id,
     nome:d.nome,
     telefone:d.telefone,
     valorTotal,
     ultimaContribuicao:ultimaData?format(ultimaData,'yyyy-MM-dd'):null,
     status:recentes.length?'Ativo':'Inativo'
    };
   }).sort((a,b)=>a.nome.localeCompare(b.nome));

   setData(processado);
  }catch(err){
   setError(err.message);
  }finally{
   setLoading(false);
  }
 },[user,filtroPeriodo]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filteredData=useMemo(
  ()=>filtroStatus==='Todos'?data:data.filter(d=>d.status===filtroStatus),
  [data,filtroStatus]
 );

 const kpis=useMemo(()=>{
  const totalDizimistas=data.length;
  const totalValor=data.reduce((a,c)=>a+c.valorTotal,0);
  const ativos=data.filter(d=>d.status==='Ativo').length;
  const inativos=data.filter(d=>d.status==='Inativo').length;

  return{totalDizimistas,totalValor,ativos,inativos};
 },[data]);

 const subtotals=useMemo(
  ()=>filteredData.reduce((a,c)=>a+c.valorTotal,0),
  [filteredData]
 );

 const handleAction=(action,item)=>{
  toast({
   title:'Ação em desenvolvimento',
   description:`A funcionalidade de ${action} para ${item.nome} será implementada em breve!`
  });
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <Users className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Consultas • Tesouraria
      </p>
      <h1 className="text-2xl font-bold text-foreground">
       Todos os Dizimistas
      </h1>
      <p className="text-sm text-muted-foreground">
       Lista completa e análise geral dos dizimistas.
      </p>
     </div>
    </div>

    <Button
     variant="outline"
     onClick={fetchData}
     disabled={loading}
     className="border-[hsl(var(--neon-igreja))]/40"
    >
     <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>
     Atualizar
    </Button>
   </div>

   <Card className="bg-card border-border/60">
    <CardHeader>
     <CardTitle className="text-lg">Filtros da consulta</CardTitle>
    </CardHeader>

    <CardContent>
     <div className="flex flex-col md:flex-row gap-4">

      <div className="flex items-center gap-2 text-muted-foreground">
       <Search className="w-4 h-4"/>
       <span className="text-sm font-medium">Filtros</span>
      </div>

      <Select value={filtroStatus} onValueChange={setFiltroStatus}>
       <SelectTrigger className="w-full md:w-[180px] bg-input">
        <SelectValue placeholder="Status"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="Todos">Todos</SelectItem>
        <SelectItem value="Ativo">Ativos</SelectItem>
        <SelectItem value="Inativo">Inativos</SelectItem>
       </SelectContent>
      </Select>

      <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
       <SelectTrigger className="w-full md:w-[240px] bg-input">
        <SelectValue placeholder="Período"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="3">Últimos 3 meses</SelectItem>
        <SelectItem value="6">Últimos 6 meses</SelectItem>
        <SelectItem value="12">Últimos 12 meses</SelectItem>
       </SelectContent>
      </Select>

     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard
     title="Total Cadastrados"
     value={kpis.totalDizimistas}
     icon={Users}
     colorScheme="igreja"
     label="Geral"
    />

    <KPICard
     title="Total Geral"
     value={kpis.totalValor}
     icon={DollarSign}
     colorScheme="igreja"
     label="Volume histórico"
     isCurrency
    />

    <KPICard
     title="Ativos"
     value={kpis.ativos}
     icon={UserCheck}
     colorScheme="igreja"
     label={`No período (${filtroPeriodo}M)`}
    />

    <KPICard
     title="Inativos"
     value={kpis.inativos}
     icon={UserMinus}
     colorScheme="igreja"
     label={`Sem contribuição (${filtroPeriodo}M)`}
    />
   </div>

   {error?(
    <Card className="border-destructive/30 bg-destructive/10">
     <CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-destructive">
      <AlertCircle className="w-8 h-8"/>
      <p>Erro ao carregar dados: {error}</p>
     </CardContent>
    </Card>
   ):(
    <Card className="bg-card border-border/60 overflow-hidden">
     <CardHeader className="border-b border-border/60">
      <CardTitle className="text-lg">
       Relação Completa
      </CardTitle>
     </CardHeader>

     <CardContent className="p-0">
      {loading?(
       <div className="p-6">
        <LoadingSkeleton count={5} height="h-12"/>
       </div>
      ):(
       <div className="responsive-table-wrapper">
        <Table className="neon-zebra-table">
         <TableHeader className="bg-muted/50">
          <TableRow>
           <TableHead>Nome</TableHead>
           <TableHead className="text-right">Total Histórico</TableHead>
           <TableHead className="text-center">Última Contribuição</TableHead>
           <TableHead className="text-center">Status</TableHead>
           <TableHead className="text-center">Ações</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>
          {!filteredData.length?(
           <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
             Nenhum dizimista encontrado para o filtro selecionado.
            </TableCell>
           </TableRow>
          ):filteredData.map(item=>(
           <TableRow key={item.id} className="hover:bg-primary/5">

            <TableCell className="font-medium">
             {item.nome}
            </TableCell>

            <TableCell className="text-right font-semibold text-emerald-500">
             {formatCurrency(item.valorTotal)}
            </TableCell>

            <TableCell className="text-center text-muted-foreground">
             {item.ultimaContribuicao?(
              <div className="flex items-center justify-center gap-2">
               <CalendarClock className="w-4 h-4 text-[hsl(var(--neon-igreja))]"/>
               {format(parseISO(item.ultimaContribuicao),'dd/MM/yyyy')}
              </div>
             ):'-'}
            </TableCell>

            <TableCell className="text-center">
             <Badge className={
              item.status==='Ativo'
               ?'badge-ativo'
               :'badge-inativo'
             }>
              {item.status}
             </Badge>
            </TableCell>

            <TableCell className="text-center">
             <div className="flex justify-center gap-1">
              <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-primary hover:bg-primary/20"
               onClick={()=>handleAction('editar',item)}
              >
               <Edit className="w-4 h-4"/>
              </Button>

              <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-destructive hover:bg-destructive/20"
               onClick={()=>handleAction('excluir',item)}
              >
               <Trash2 className="w-4 h-4"/>
              </Button>
             </div>
            </TableCell>

           </TableRow>
          ))}

          {filteredData.length>0&&(
           <TableRow className="bg-muted/50 font-bold border-t">
            <TableCell className="text-right">
             Total da Visão:
            </TableCell>

            <TableCell className="text-right text-emerald-500">
             {formatCurrency(subtotals)}
            </TableCell>

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
