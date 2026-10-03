import React,{useState,useEffect,useMemo,useCallback}from'react';
import{Download,RefreshCw,CheckCircle,UserMinus,Users,WalletCards,Clock,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Badge}from'@/components/ui/badge';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{exportToExcel}from'@/lib/ExportUtils';

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const money=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL',
 minimumFractionDigits:2,
 maximumFractionDigits:2
}).format(fromCents(toCents(v)));

const dateBR=v=>{
 if(!v)return'—';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${m[3]}/${m[2]}/${m[1]}`:new Date(v).toLocaleDateString('pt-BR');
};

const StatCard=({label,value,icon:Icon,type='blue',note})=>{
 const styles={
  blue:{
   border:'border-blue-500/20',
   bg:'from-blue-500/10 to-blue-700/10',
   icon:'bg-blue-500/10',
   text:'text-blue-400'
  },
  green:{
   border:'border-emerald-500/20',
   bg:'from-emerald-500/10 to-emerald-700/10',
   icon:'bg-emerald-500/10',
   text:'text-emerald-400'
  },
  red:{
   border:'border-red-500/20',
   bg:'from-red-500/10 to-red-700/10',
   icon:'bg-red-500/10',
   text:'text-red-400'
  }
 };

 const s=styles[type];

 return(
  <Card className={`${s.border} bg-gradient-to-br ${s.bg}`}>
   <CardContent className="p-4">
    <div className="flex items-center gap-3">
     <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.icon}`}>
      <Icon className={`h-5 w-5 ${s.text}`}/>
     </div>

     <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
       {label}
      </p>

      <p className={`mt-1 truncate text-xl font-bold ${s.text}`}>
       {value}
      </p>

      {note&&(
       <p className="mt-1 text-xs text-muted-foreground">
        {note}
       </p>
      )}
     </div>
    </div>
   </CardContent>
  </Card>
 );
};

const RelatorioDevedores=()=>{
 const{toast}=useToast();
 const{user}=useAuth();

 const[devedores,setDevedores]=useState([]);
 const[loading,setLoading]=useState(true);

 const[filters,setFilters]=useState({
  dataInicio:'',
  dataFim:'',
  pesquisa:''
 });

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('pessoal_devedores')
   .select('*')
   .eq('user_id',user.id)
   .order('data_vencimento',{ascending:false});

  if(error){
   toast({
    title:'Erro ao buscar devedores',
    variant:'destructive'
   });
  }else{
   setDevedores(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('relatorio_pessoal_devedores_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_devedores'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filteredDevedores=useMemo(()=>{
  const pesquisa=filters.pesquisa.trim().toLowerCase();

  return devedores
   .filter(d=>{
    const data=String(d.data_vencimento||'').slice(0,10);

    if(filters.dataInicio&&data<filters.dataInicio)return false;
    if(filters.dataFim&&data>filters.dataFim)return false;

    if(
     pesquisa&&
     !String(d.pessoa||'').toLowerCase().includes(pesquisa)
    ){
     return false;
    }

    return true;
   })
   .sort(
    (a,b)=>
     new Date(b.data_vencimento)-new Date(a.data_vencimento)
   );
 },[devedores,filters]);

 const totalReceberCents=useMemo(
  ()=>filteredDevedores
   .filter(d=>d.status!=='PAGO')
   .reduce(
    (sum,d)=>sum+toCents(d.valor),
    0
   ),
  [filteredDevedores]
 );

 const totalPagoCents=useMemo(
  ()=>filteredDevedores
   .filter(d=>d.status==='PAGO')
   .reduce(
    (sum,d)=>sum+toCents(d.valor),
    0
   ),
  [filteredDevedores]
 );

 const totalGeralCents=useMemo(
  ()=>filteredDevedores.reduce(
   (sum,d)=>sum+toCents(d.valor),
   0
  ),
  [filteredDevedores]
 );

 const pendentes=filteredDevedores.filter(
  d=>d.status!=='PAGO'
 ).length;

 const calculateDaysRemaining=dateString=>{
  const dueDate=new Date(dateString);
  const today=new Date();

  today.setHours(0,0,0,0);
  dueDate.setHours(0,0,0,0);

  const days=Math.ceil(
   (dueDate.getTime()-today.getTime())/(1000*3600*24)
  );

  if(days<0)return`Vencido há ${Math.abs(days)} dias`;
  if(days===0)return'Vence hoje';
  return`Faltam ${days} dias`;
 };

 const toggleStatus=async(id,currentStatus)=>{
  const newStatus=currentStatus==='PAGO'?'PENDENTE':'PAGO';

  const{error}=await supabase
   .from('pessoal_devedores')
   .update({status:newStatus})
   .eq('id',id)
   .eq('user_id',user.id);

  if(error){
   toast({
    title:'Erro ao atualizar status',
    variant:'destructive'
   });
   return;
  }

  toast({
   title:'Status atualizado com sucesso!'
  });

  fetchData();
 };

 const handleExport=()=>{
  if(!filteredDevedores.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filteredDevedores.map(d=>({
    Pessoa:d.pessoa||'-',
    Vencimento:dateBR(d.data_vencimento),
    'Dias Restantes':d.status==='PAGO'
     ?'-'
     :calculateDaysRemaining(d.data_vencimento),
    Status:d.status||'PENDENTE',
    Valor:fromCents(toCents(d.valor))
   })),
   'Relatorio_Devedores',
   'Devedores'
  );
 };

 const clearFilters=()=>{
  setFilters({
   dataInicio:'',
   dataFim:'',
   pesquisa:''
  });
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
      <Users className="h-5 w-5 text-blue-400"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-blue-400">
       Relatórios
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Devedores
      </h1>

      <p className="text-sm text-muted-foreground">
       Consulte e acompanhe seus valores a receber.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!filteredDevedores.length}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={fetchData}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="grid gap-4 p-4 md:grid-cols-3">

     <div className="space-y-2">
      <Label className="text-xs">Data inicial</Label>

      <Input
       type="date"
       value={filters.dataInicio}
       onChange={e=>setFilters(prev=>({
        ...prev,
        dataInicio:e.target.value
       }))}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Data final</Label>

      <Input
       type="date"
       value={filters.dataFim}
       onChange={e=>setFilters(prev=>({
        ...prev,
        dataFim:e.target.value
       }))}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Pesquisar pessoa</Label>

      <div className="relative">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        value={filters.pesquisa}
        onChange={e=>setFilters(prev=>({
         ...prev,
         pesquisa:e.target.value
        }))}
        placeholder="Nome do devedor..."
        className="bg-input pl-9"
       />
      </div>
     </div>
    </CardContent>

    <div className="flex justify-end border-t border-border/50 px-4 py-3">
     <Button
      variant="ghost"
      size="sm"
      onClick={clearFilters}
     >
      Limpar filtros
     </Button>
    </div>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
     label="Total a Receber"
     value={money(fromCents(totalReceberCents))}
     icon={WalletCards}
     type="blue"
    />

    <StatCard
     label="Total Recebido"
     value={money(fromCents(totalPagoCents))}
     icon={CheckCircle}
     type="green"
    />

    <StatCard
     label="Total Geral"
     value={money(fromCents(totalGeralCents))}
     icon={Users}
     type="blue"
    />

    <StatCard
     label="Pendentes"
     value={pendentes}
     icon={Clock}
     type="red"
    />
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-blue-400">
      Valores a Receber
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Pessoa</TableHead>
         <TableHead>Vencimento</TableHead>
         <TableHead>Prazo</TableHead>
         <TableHead>Status</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-right">Ação</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):filteredDevedores.length===0?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-10 text-center text-muted-foreground"
          >
           <UserMinus className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           Nenhum devedor encontrado.
          </TableCell>
         </TableRow>
        ):(
         filteredDevedores.map(devedor=>{
          const pago=devedor.status==='PAGO';

          return(
           <TableRow
            key={devedor.id}
            className="hover:bg-blue-500/5"
           >
            <TableCell className="font-medium">
             {devedor.pessoa||'—'}
            </TableCell>

            <TableCell className="text-sm">
             {dateBR(devedor.data_vencimento)}
            </TableCell>

            <TableCell className={`text-sm ${
             pago
              ?'text-muted-foreground'
              :'text-blue-400'
            }`}>
             {pago
              ?'—'
              :calculateDaysRemaining(devedor.data_vencimento)}
            </TableCell>

            <TableCell>
             {pago?(
              <Badge
               variant="outline"
               className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              >
               Pago
              </Badge>
             ):(
              <Badge
               variant="outline"
               className="border-red-500/30 bg-red-500/10 text-red-400"
              >
               Pendente
              </Badge>
             )}
            </TableCell>

            <TableCell className={`text-right font-semibold ${
             pago
              ?'text-emerald-400'
              :'text-blue-400'
            }`}>
             {money(devedor.valor)}
            </TableCell>

            <TableCell className="text-right">
             <Button
              size="sm"
              variant="ghost"
              onClick={()=>toggleStatus(
               devedor.id,
               devedor.status
              )}
              className={
               pago
                ?'text-amber-400 hover:bg-amber-500/10'
                :'text-emerald-400 hover:bg-emerald-500/10'
              }
             >
              <CheckCircle className="mr-2 h-4 w-4"/>
              {pago?'Marcar Pendente':'Marcar Pago'}
             </Button>
            </TableCell>
           </TableRow>
          );
         })
        )}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default RelatorioDevedores;
