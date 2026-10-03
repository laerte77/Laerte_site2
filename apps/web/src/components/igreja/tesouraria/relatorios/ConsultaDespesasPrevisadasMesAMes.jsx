import React,{useState,useEffect,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Button}from'@/components/ui/button';
import{Download,FileText,Printer,Search,Loader2}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{formatCurrency}from'@/lib/utils';
import{format,parseISO}from'date-fns';
import{generatePDF,exportToExcel}from'@/lib/ExportUtils';
import{useToast}from'@/components/ui/use-toast';

const meses=[
 {val:'1',label:'Janeiro'},{val:'2',label:'Fevereiro'},
 {val:'3',label:'Março'},{val:'4',label:'Abril'},
 {val:'5',label:'Maio'},{val:'6',label:'Junho'},
 {val:'7',label:'Julho'},{val:'8',label:'Agosto'},
 {val:'9',label:'Setembro'},{val:'10',label:'Outubro'},
 {val:'11',label:'Novembro'},{val:'12',label:'Dezembro'}
];

const mesesExtenso=meses.map(m=>m.label);

export default function ConsultaDespesasPrevisadasMesAMes(){
 const{user}=useAuth();
 const{toast}=useToast();

 const[despesasPrevistas,setDespesasPrevistas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);

 const currentDate=new Date();
 const[filterMonth,setFilterMonth]=useState(
  (currentDate.getMonth()+1).toString()
 );
 const[filterYear,setFilterYear]=useState(
  currentDate.getFullYear().toString()
 );
 const[filterTipo,setFilterTipo]=useState('Todos');

 const anos=Array.from(
  {length:5},
  (_,i)=>(currentDate.getFullYear()-2+i).toString()
 );

 const fetchTiposDespesa=async()=>{
  try{
   const{data,error}=await supabase
    .from('igreja_tipos_despesa')
    .select('despesa')
    .eq('user_id',user.id)
    .order('despesa',{ascending:true});

   if(!error)setTiposDespesa((data||[]).map(d=>d.despesa));
  }catch{}
 };

 const fetchDespesasPrevistas=async()=>{
  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('igreja_despesas_previstas')
    .select('*')
    .eq('user_id',user.id)
    .order('vencimento',{ascending:true});

   if(error)throw error;

   setDespesasPrevistas(data||[]);
  }catch{
   toast({
    title:'Erro',
    description:'Erro ao buscar despesas previstas',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 };

 useEffect(()=>{
  if(user){
   fetchTiposDespesa();
   fetchDespesasPrevistas();
  }
 },[user]);

 const filteredData=useMemo(()=>{
  return despesasPrevistas.filter(item=>{
   if(!item.vencimento)return false;

   const date=parseISO(item.vencimento);

   const monthMatches=
    filterMonth==='Todos'||
    (date.getMonth()+1).toString()===filterMonth;

   const yearMatches=
    filterYear==='Todos'||
    date.getFullYear().toString()===filterYear;

   const tipoMatches=
    filterTipo==='Todos'||
    item.despesa===filterTipo;

   return monthMatches&&yearMatches&&tipoMatches;
  });
 },[
  despesasPrevistas,
  filterMonth,
  filterYear,
  filterTipo
 ]);

 const groupedData=useMemo(()=>{
  const groups={};

  filteredData.forEach(item=>{
   const date=parseISO(item.vencimento);
   const key=`${date.getFullYear()}-${date.getMonth()}`;

   if(!groups[key]){
    groups[key]={
     items:[],
     total:0,
     month:date.getMonth(),
     year:date.getFullYear()
    };
   }

   groups[key].items.push(item);
   groups[key].total+=Number(item.valor)||0;
  });

  return Object.values(groups).sort((a,b)=>{
   if(a.year!==b.year)return a.year-b.year;
   return a.month-b.month;
  });
 },[filteredData]);

 const totalValor=useMemo(
  ()=>filteredData.reduce(
   (acc,curr)=>acc+(Number(curr.valor)||0),0
  ),
  [filteredData]
 );

 const handleExportExcel=()=>{
  if(!filteredData.length){
   toast({
    title:'Aviso',
    description:'Não há dados para exportar'
   });
   return;
  }

  const exportData=filteredData.map(d=>({
   'Data Vencimento':format(parseISO(d.vencimento),'dd/MM/yyyy'),
   'Tipo da Despesa':d.despesa,
   'Valor da Despesa':Number(d.valor)
  }));

  exportToExcel(
   exportData,
   `Despesas_Previstas_${filterMonth}_${filterYear}`
  );
 };

 const handleExportPDF=()=>{
  if(!filteredData.length){
   toast({
    title:'Aviso',
    description:'Não há dados para exportar'
   });
   return;
  }

  const headers=[
   'Data Vencimento',
   'Tipo da Despesa',
   'Valor da Despesa'
  ];

  const rows=filteredData.map(d=>[
   format(parseISO(d.vencimento),'dd/MM/yyyy'),
   d.despesa,
   formatCurrency(d.valor)
  ]);

  rows.push([
   'TOTAL',
   '',
   formatCurrency(totalValor)
  ]);

  generatePDF(
   `Despesas Previstas - ${filterMonth}/${filterYear}`,
   headers,
   rows,
   `Despesas_Previstas_${filterMonth}_${filterYear}`
  );
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <Search className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>

      <h1 className="text-2xl font-bold text-foreground">
       Despesas Previstas Mês a Mês
      </h1>

      <p className="text-sm text-muted-foreground">
       Filtre e analise as despesas previstas da igreja.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      onClick={handleExportExcel}
      variant="outline"
      className="text-emerald-500 border-emerald-500/50"
     >
      <Download className="w-4 h-4 mr-2"/>
      Excel
     </Button>

     <Button
      onClick={handleExportPDF}
      variant="outline"
      className="text-destructive border-destructive/50"
     >
      <FileText className="w-4 h-4 mr-2"/>
      PDF
     </Button>

     <Button
      onClick={()=>window.print()}
      variant="outline"
      className="text-primary border-primary/50"
     >
      <Printer className="w-4 h-4 mr-2"/>
      Imprimir
     </Button>
    </div>
   </div>

   <Card className="bg-card border-border/60">
    <CardHeader className="border-b border-border/60">
     <CardTitle>Filtros de Pesquisa</CardTitle>
    </CardHeader>

    <CardContent>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Mês
       </label>

       <Select
        value={filterMonth}
        onValueChange={setFilterMonth}
       >
        <SelectTrigger className="bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="Todos">
          Todos os Meses
         </SelectItem>

         {meses.map(m=>(
          <SelectItem key={m.val} value={m.val}>
           {m.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Ano
       </label>

       <Select
        value={filterYear}
        onValueChange={setFilterYear}
       >
        <SelectTrigger className="bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="Todos">
          Todos os Anos
         </SelectItem>

         {anos.map(a=>(
          <SelectItem key={a} value={a}>
           {a}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Tipo de Despesa
       </label>

       <Select
        value={filterTipo}
        onValueChange={setFilterTipo}
       >
        <SelectTrigger className="bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="Todos">
          Todos os Tipos
         </SelectItem>

         {tiposDespesa.map(t=>(
          <SelectItem key={t} value={t}>
           {t}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

     </div>
    </CardContent>
   </Card>

   <Card className="bg-card border-border/60 overflow-hidden">
    <CardContent className="p-0">

     {loading?(
      <div className="flex justify-center items-center p-12">
       <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--neon-igreja))]"/>
      </div>
     ):(
      <div className="responsive-table-wrapper">
       <Table>

        <TableHeader className="bg-muted/50">
         <TableRow>
          <TableHead>Data Vencimento</TableHead>
          <TableHead>Tipo da Despesa</TableHead>
          <TableHead className="text-right">
           Valor da Despesa
          </TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>

         {!filteredData.length?(
          <TableRow>
           <TableCell
            colSpan={3}
            className="h-24 text-center text-muted-foreground"
           >
            Nenhuma despesa prevista encontrada.
           </TableCell>
          </TableRow>
         ):(
          groupedData.map(group=>(
           <React.Fragment
            key={`${group.year}-${group.month}`}
           >

            {group.items.map(item=>(
             <TableRow
              key={item.id}
              className="hover:bg-primary/5"
             >
              <TableCell className="font-medium">
               {format(
                parseISO(item.vencimento),
                'dd/MM/yyyy'
               )}
              </TableCell>

              <TableCell>
               {item.despesa}
              </TableCell>

              <TableCell className="text-right font-medium text-destructive">
               {formatCurrency(item.valor)}
              </TableCell>
             </TableRow>
            ))}

            {(filterMonth==='Todos'||filterYear==='Todos')&&(
             <TableRow className="bg-muted/30 font-bold">
              <TableCell
               colSpan={2}
               className="text-right uppercase text-muted-foreground"
              >
               {mesesExtenso[group.month]} {group.year}:
              </TableCell>

              <TableCell className="text-right text-destructive">
               {formatCurrency(group.total)}
              </TableCell>
             </TableRow>
            )}

           </React.Fragment>
          ))
         )}

         {filteredData.length>0&&(
          <TableRow className="bg-muted/50 font-bold border-t-2">
           <TableCell
            colSpan={2}
            className="text-right uppercase text-muted-foreground"
           >
            Total no Período:
           </TableCell>

           <TableCell className="text-right text-destructive text-lg">
            {formatCurrency(totalValor)}
           </TableCell>
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
