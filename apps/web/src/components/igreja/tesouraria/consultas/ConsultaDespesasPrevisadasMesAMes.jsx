import React,{useState,useEffect,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Button}from'@/components/ui/button';
import{Download,FileText,Printer,Search,Loader2,Filter,CalendarClock,DollarSign}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{formatCurrency}from'@/lib/utils';
import{format,parseISO}from'date-fns';
import{generatePDF,exportToExcel}from'@/lib/ExportUtils';
import{useToast}from'@/components/ui/use-toast';

const meses=[
 {val:'1',label:'Janeiro'},{val:'2',label:'Fevereiro'},{val:'3',label:'Março'},
 {val:'4',label:'Abril'},{val:'5',label:'Maio'},{val:'6',label:'Junho'},
 {val:'7',label:'Julho'},{val:'8',label:'Agosto'},{val:'9',label:'Setembro'},
 {val:'10',label:'Outubro'},{val:'11',label:'Novembro'},{val:'12',label:'Dezembro'}
];

export default function ConsultaDespesasPrevisadasMesAMes(){
 const{user}=useAuth(),{toast}=useToast();
 const[despesas,setDespesas]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const now=new Date();
 const[filterMonth,setFilterMonth]=useState(String(now.getMonth()+1));
 const[filterYear,setFilterYear]=useState(String(now.getFullYear()));
 const[filterTipo,setFilterTipo]=useState('Todos');

 const anos=Array.from({length:5},(_,i)=>String(now.getFullYear()-2+i));

 useEffect(()=>{
  if(!user)return;

  const load=async()=>{
   setLoading(true);

   try{
    const[a,b]=await Promise.all([
     supabase.from('igreja_despesas_previstas').select('*').eq('user_id',user.id).order('vencimento',{ascending:true}),
     supabase.from('igreja_tipos_despesa').select('despesa').eq('user_id',user.id).order('despesa',{ascending:true})
    ]);

    if(a.error)throw a.error;
    if(b.error)throw b.error;

    setDespesas(a.data||[]);
    setTipos((b.data||[]).map(x=>x.despesa));
   }catch(e){
    toast({title:'Erro',description:e.message,variant:'destructive'});
   }finally{
    setLoading(false);
   }
  };

  load();
 },[user,toast]);

 const filtered=useMemo(()=>despesas.filter(item=>{
  if(!item.vencimento)return false;

  const d=parseISO(item.vencimento);
  return(
   (filterMonth==='Todos'||String(d.getMonth()+1)===filterMonth)&&
   (filterYear==='Todos'||String(d.getFullYear())===filterYear)&&
   (filterTipo==='Todos'||item.despesa===filterTipo)
  );
 }),[despesas,filterMonth,filterYear,filterTipo]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);

 const grouped=useMemo(()=>{
  const groups={};

  filtered.forEach(x=>{
   const d=parseISO(x.vencimento),key=`${d.getFullYear()}-${d.getMonth()}`;

   if(!groups[key])
    groups[key]={items:[],total:0,month:d.getMonth(),year:d.getFullYear()};

   groups[key].items.push(x);
   groups[key].total+=Number(x.valor||0);
  });

  return Object.values(groups).sort((a,b)=>
   a.year-b.year||a.month-b.month
  );
 },[filtered]);

 const exportExcel=()=>{
  if(!filtered.length){
   toast({title:'Aviso',description:'Não há dados para exportar.',variant:'destructive'});
   return;
  }

  exportToExcel(
   filtered.map(x=>({
    'Data Vencimento':format(parseISO(x.vencimento),'dd/MM/yyyy'),
    'Tipo da Despesa':x.despesa,
    'Valor da Despesa':Number(x.valor)
   })),
   `Despesas_Previstas_${filterMonth}_${filterYear}`
  );
 };

 const exportPDF=()=>{
  if(!filtered.length){
   toast({title:'Aviso',description:'Não há dados para exportar.',variant:'destructive'});
   return;
  }

  generatePDF(
   `Despesas Previstas - ${filterMonth}/${filterYear}`,
   ['Data Vencimento','Tipo da Despesa','Valor da Despesa'],
   [
    ...filtered.map(x=>[
     format(parseISO(x.vencimento),'dd/MM/yyyy'),
     x.despesa,
     formatCurrency(x.valor)
    ]),
    ['TOTAL','',formatCurrency(total)]
   ],
   `Despesas_Previstas_${filterMonth}_${filterYear}`
  );
 };

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <CalendarClock className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>

      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Consultas • Tesouraria</p>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">Despesas Previstas Mês a Mês</h1>
       <p className="text-sm text-muted-foreground">Filtre e analise as despesas previstas da igreja.</p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={exportExcel}>
       <Download className="mr-2 h-4 w-4"/>Excel
      </Button>

      <Button variant="outline" onClick={exportPDF}>
       <FileText className="mr-2 h-4 w-4"/>PDF
      </Button>

      <Button variant="outline" onClick={()=>window.print()}>
       <Printer className="mr-2 h-4 w-4"/>Imprimir
      </Button>
     </div>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-[hsl(var(--neon-igreja))]"/>Filtros</CardTitle>
    </CardHeader>

    <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
     <Select value={filterMonth} onValueChange={setFilterMonth}>
      <SelectTrigger className="bg-input"><SelectValue placeholder="Mês"/></SelectTrigger>
      <SelectContent className="dark-igreja bg-card">
       {meses.map(m=><SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
      </SelectContent>
     </Select>

     <Select value={filterYear} onValueChange={setFilterYear}>
      <SelectTrigger className="bg-input"><SelectValue placeholder="Ano"/></SelectTrigger>
      <SelectContent className="dark-igreja bg-card">
       {anos.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}
      </SelectContent>
     </Select>

     <Select value={filterTipo} onValueChange={setFilterTipo}>
      <SelectTrigger className="bg-input"><SelectValue placeholder="Tipo"/></SelectTrigger>
      <SelectContent className="dark-igreja bg-card">
       <SelectItem value="Todos">Todos os Tipos</SelectItem>
       {tipos.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
     </Select>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    <Card><CardContent className="flex items-center gap-3 p-4"><CalendarClock className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Registros</p><p className="text-2xl font-bold">{filtered.length}</p></div></CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><DollarSign className="h-6 w-6 text-red-400"/><div><p className="text-[11px] uppercase text-muted-foreground">Total Previsto</p><p className="text-2xl font-bold text-red-400">{formatCurrency(total)}</p></div></CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><Search className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Tipos</p><p className="text-2xl font-bold">{new Set(filtered.map(x=>x.despesa)).size}</p></div></CardContent></Card>
   </div>

   <Card className="overflow-hidden border-border bg-card/70">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Despesas previstas</CardTitle>
    </CardHeader>

    <CardContent className="p-0">

     {loading?(
      <div className="flex items-center justify-center p-12">
       <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--neon-igreja))]"/>
      </div>
     ):(
      <div className="overflow-x-auto">
       <Table>

        <TableHeader className="bg-secondary/30">
         <TableRow>
          <TableHead>Data Vencimento</TableHead>
          <TableHead>Tipo da Despesa</TableHead>
          <TableHead className="text-right">Valor</TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>

         {!filtered.length?(
          <TableRow>
           <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            Nenhuma despesa prevista encontrada.
           </TableCell>
          </TableRow>
         ):(
          grouped.map(group=>(
           <React.Fragment key={`${group.year}-${group.month}`}>

            {group.items.map(item=>(
             <TableRow key={item.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
              <TableCell className="font-medium">
               <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/>
                {format(parseISO(item.vencimento),'dd/MM/yyyy')}
               </div>
              </TableCell>

              <TableCell>{item.despesa}</TableCell>

              <TableCell className="text-right font-bold text-red-400">
               {formatCurrency(item.valor)}
              </TableCell>
             </TableRow>
            ))}

            <TableRow className="bg-secondary/20">
             <TableCell colSpan={2} className="text-right font-semibold text-muted-foreground">
              {meses[group.month].label} {group.year}
             </TableCell>
             <TableCell className="text-right font-bold text-red-400">
              {formatCurrency(group.total)}
             </TableCell>
            </TableRow>

           </React.Fragment>
          ))
         )}

         {filtered.length>0&&(
          <TableRow className="bg-secondary/30 font-bold">
           <TableCell colSpan={2} className="text-right">Total no Período:</TableCell>
           <TableCell className="text-right text-lg text-red-400">{formatCurrency(total)}</TableCell>
          </TableRow>
         )}

        </TableBody>
       </Table>
      </div>
     )}

    </CardContent>
   </Card>

  </div>
 );
}
