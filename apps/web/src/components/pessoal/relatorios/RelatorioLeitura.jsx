import React,{useState,useEffect,useMemo,useCallback}from'react';
import{Search,Download,RefreshCw,BookOpen,BookMarked,CheckCircle2,Clock}from'lucide-react';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Progress}from'@/components/ui/progress';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{exportToExcel}from'@/lib/ExportUtils';

const moneyPercent=v=>`${Math.round(Math.min(100,Math.max(0,v)))}%`;

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
  amber:{
   border:'border-amber-500/20',
   bg:'from-amber-500/10 to-amber-700/10',
   icon:'bg-amber-500/10',
   text:'text-amber-400'
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

const RelatorioLeitura=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[leituras,setLeituras]=useState([]);
 const[livros,setLivros]=useState([]);
 const[filtro,setFiltro]=useState('');
 const[loading,setLoading]=useState(true);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const[leiturasRes,livrosRes]=await Promise.all([
   supabase
    .from('leituras')
    .select('*')
    .eq('user_id',user.id),

   supabase
    .from('livros')
    .select('*')
    .eq('user_id',user.id)
  ]);

  if(leiturasRes.error){
   toast({
    title:'Erro ao buscar leituras',
    description:leiturasRes.error.message,
    variant:'destructive'
   });
  }else{
   setLeituras(leiturasRes.data||[]);
  }

  if(livrosRes.error){
   toast({
    title:'Erro ao buscar livros',
    description:livrosRes.error.message,
    variant:'destructive'
   });
  }else{
   setLivros(livrosRes.data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_relatorio_leitura_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'leituras'
    },
    fetchData
   )
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'livros'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const dadosRelatorio=useMemo(()=>{
  const busca=filtro.trim().toLowerCase();

  return livros
   .map(livro=>{
    const leiturasDoLivro=leituras.filter(
     l=>l.livro===livro.nome_livro
    );

    const capitulosLidos=leiturasDoLivro.reduce(
     (sum,item)=>sum+Number(item.capitulos_lidos||0),
     0
    );

    const totalCapitulos=Number(livro.capitulos||0);
    const restantes=Math.max(
     0,
     totalCapitulos-capitulosLidos
    );

    const progresso=totalCapitulos>0
     ?Math.min(100,(capitulosLidos/totalCapitulos)*100)
     :0;

    const status=
     progresso>=100
      ?'Finalizado'
      :progresso>0
       ?'Parcial'
       :'Não Iniciado';

    return{
     id:livro.id,
     nome_livro:livro.nome_livro,
     total_capitulos:totalCapitulos,
     lidos:capitulosLidos,
     restantes,
     progresso,
     status
    };
   })
   .filter(item=>
    item.nome_livro
     .toLowerCase()
     .includes(busca)
   );
 },[livros,leituras,filtro]);

 const totalLivros=livros.length;
 const livrosFinalizados=dadosRelatorio.filter(
  item=>item.status==='Finalizado'
 ).length;

 const totalCapitulos=dadosRelatorio.reduce(
  (sum,item)=>sum+item.total_capitulos,
  0
 );

 const totalLidos=dadosRelatorio.reduce(
  (sum,item)=>sum+item.lidos,
  0
 );

 const progressoGeral=totalCapitulos>0
  ?(totalLidos/totalCapitulos)*100
  :0;

 const handleExport=()=>{
  if(!dadosRelatorio.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   dadosRelatorio.map(item=>({
    Livro:item.nome_livro,
    'Total de Capítulos':item.total_capitulos,
    Lidos:item.lidos,
    Restantes:item.restantes,
    Progresso:`${Math.round(item.progresso)}%`,
    Status:item.status
   })),
   'Relatorio_Leitura',
   'Leitura'
  );
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <BookOpen className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Relatórios
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Leitura
      </h1>

      <p className="text-sm text-muted-foreground">
       Acompanhe o progresso dos seus livros e capítulos.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!dadosRelatorio.length}
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
    <CardContent className="p-4">
     <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       value={filtro}
       onChange={e=>setFiltro(e.target.value)}
       placeholder="Pesquisar por livro..."
       className="bg-input pl-9"
      />
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
     label="Livros"
     value={totalLivros}
     icon={BookOpen}
    />

    <StatCard
     label="Capítulos Lidos"
     value={totalLidos}
     icon={BookMarked}
     type="blue"
    />

    <StatCard
     label="Finalizados"
     value={livrosFinalizados}
     icon={CheckCircle2}
     type="green"
    />

    <StatCard
     label="Progresso Geral"
     value={moneyPercent(progressoGeral)}
     icon={Clock}
     type="amber"
    />
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
       <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
        Progresso de Leitura
       </CardTitle>

       <p className="text-sm text-muted-foreground">
        {totalLidos} de {totalCapitulos} capítulos registrados.
       </p>
      </div>

      <span className="text-lg font-bold text-[hsl(var(--neon-pessoal))]">
       {moneyPercent(progressoGeral)}
      </span>
     </div>

     <Progress
      value={progressoGeral}
      className="mt-3 h-2"
     />
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Livro</TableHead>
         <TableHead>Total Cap.</TableHead>
         <TableHead>Lidos</TableHead>
         <TableHead>Restantes</TableHead>
         <TableHead className="min-w-[220px]">Progresso</TableHead>
         <TableHead>Status</TableHead>
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
        ):dadosRelatorio.length===0?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-10 text-center text-muted-foreground"
          >
           Nenhum dado de leitura encontrado.
          </TableCell>
         </TableRow>
        ):(
         dadosRelatorio.map(item=>(
          <TableRow
           key={item.id}
           className="hover:bg-blue-500/5"
          >
           <TableCell className="font-medium">
            {item.nome_livro}
           </TableCell>

           <TableCell>
            {item.total_capitulos}
           </TableCell>

           <TableCell className="font-semibold text-[hsl(var(--neon-pessoal))]">
            {item.lidos}
           </TableCell>

           <TableCell className="text-muted-foreground">
            {item.restantes}
           </TableCell>

           <TableCell>
            <div className="flex items-center gap-3">
             <Progress
              value={item.progresso}
              className="h-2 flex-1"
             />

             <span className="w-10 text-right text-xs font-medium text-muted-foreground">
              {Math.round(item.progresso)}%
             </span>
            </div>
           </TableCell>

           <TableCell>
            {item.status==='Finalizado'?(
             <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
             >
              Finalizado
             </Badge>
            ):item.status==='Parcial'?(
             <Badge
              variant="outline"
              className="border-blue-500/30 bg-blue-500/10 text-blue-400"
             >
              Parcial
             </Badge>
            ):(
             <Badge
              variant="outline"
              className="border-border bg-muted/30 text-muted-foreground"
             >
              Não Iniciado
             </Badge>
            )}
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default RelatorioLeitura;
