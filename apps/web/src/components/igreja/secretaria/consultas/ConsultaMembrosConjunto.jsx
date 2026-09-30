import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,Music,Download,FileText,Printer,UserMinus,Layers,Search,Filter,ChevronDown,ChevronUp}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardHeader,CardTitle,CardContent}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Badge}from'@/components/ui/badge';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{exportToExcel,generatePDF,printContent}from'@/lib/ExportUtils';
import{Helmet}from'react-helmet';

const ConsultaMembrosConjunto=()=>{
 const{toast}=useToast();
 const[allMembros,setAllMembros]=useState([]);
 const[conjuntosBase,setConjuntosBase]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filterStatus,setFilterStatus]=useState('ATIVO');
 const[filterConjunto,setFilterConjunto]=useState('todos');
 const[searchTerm,setSearchTerm]=useState('');
 const[showFilters,setShowFilters]=useState(true);

 const fetchData=useCallback(async()=>{
  setLoading(true);
  try{
   const[conjuntosRes,membrosRes]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select(`
      id,
      nome_completo,
      conjunto_id,
      participa_conjunto,
      status,
      cargo:cargos_igreja(nome_cargo)
    `).order('nome_completo',{ascending:true})
   ]);

   if(conjuntosRes.error)throw conjuntosRes.error;
   if(membrosRes.error)throw membrosRes.error;

   setConjuntosBase(conjuntosRes.data||[]);
   setAllMembros(membrosRes.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',description:error.message,variant:'destructive'});
  }finally{
   setLoading(false);
  }
 },[toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filteredData=useMemo(()=>{
  const term=searchTerm.toLowerCase().trim();

  const membrosFiltrados=allMembros.filter(m=>{
   const statusMatch=filterStatus==='todos'||(m.status||'ATIVO')===filterStatus;
   const conjuntoMatch=filterConjunto==='todos'||String(m.conjunto_id)===filterConjunto;
   const searchMatch=!term||(m.nome_completo||'').toLowerCase().includes(term);
   return statusMatch&&conjuntoMatch&&searchMatch;
  });

  let total=0;

  const grouped=conjuntosBase.map(conjunto=>{
   const mems=membrosFiltrados.filter(
    m=>m.participa_conjunto===true&&String(m.conjunto_id)===String(conjunto.id)
   );

   total+=mems.length;

   return{
    ...conjunto,
    membros:mems,
    isSemConjunto:false
   };
  });

  const semConjunto=membrosFiltrados.filter(
   m=>m.participa_conjunto===false||!m.conjunto_id
  );

  if(semConjunto.length>0&&filterConjunto==='todos'){
   grouped.push({
    id:'sem-conjunto',
    nome_conjunto:'SEM CONJUNTO',
    membros:semConjunto,
    isSemConjunto:true
   });
   total+=semConjunto.length;
  }

  return{
   conjuntos:grouped,
   totalMembros:total,
   totalConjuntos:conjuntosBase.length,
   totalComConjunto:grouped.filter(c=>!c.isSemConjunto&&c.membros.length>0).length
  };
 },[allMembros,conjuntosBase,filterStatus,filterConjunto,searchTerm]);

 const handleExportExcel=()=>{
  const exportData=filteredData.conjuntos.flatMap(c=>
   c.membros.map(m=>({
    Conjunto:c.nome_conjunto,
    Membro:m.nome_completo,
    Cargo:m.cargo?.nome_cargo||'-',
    Status:m.status||'ATIVO'
   }))
  );

  if(!exportData.length){
   toast({title:'Nenhum dado',description:'Não há membros para exportar.',variant:'destructive'});
   return;
  }

  exportToExcel(exportData,'Membros_por_Conjunto','Membros');
 };

 const handleGeneratePDF=()=>{
  const body=filteredData.conjuntos.flatMap(c=>
   c.membros.map(m=>[
    c.nome_conjunto,
    m.nome_completo,
    m.cargo?.nome_cargo||'-',
    m.status||'ATIVO'
   ])
  );

  if(!body.length){
   toast({title:'Nenhum dado',description:'Não há membros para gerar PDF.',variant:'destructive'});
   return;
  }

  generatePDF(
   'Membros por Conjunto',
   ['Conjunto','Membro','Cargo','Status'],
   body,
   'membros_conjunto'
  );
 };

 return <div className="dark-igreja text-foreground">
  <Helmet><title>Membros por Conjunto | Secretaria</title></Helmet>

  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="space-y-5 md:space-y-6"
  >

   <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

    <div className="flex items-center gap-3">

     <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 md:h-16 md:w-16">
      <Music className="h-7 w-7 text-primary md:h-8 md:w-8"/>
     </div>

     <div>
      <h2 className="text-2xl font-bold text-primary md:text-3xl">
       Membros por Conjunto
      </h2>
      <p className="text-sm text-muted-foreground md:text-base">
       Visualize a distribuição dos membros entre os conjuntos da igreja.
      </p>
     </div>

    </div>

    <div className="flex flex-wrap items-center gap-2">

     <Select value={filterStatus} onValueChange={setFilterStatus}>
      <SelectTrigger className="w-36 border-border bg-card font-bold">
       <SelectValue placeholder="Status"/>
      </SelectTrigger>

      <SelectContent className="dark-igreja">
       <SelectItem value="todos">Todos</SelectItem>
       <SelectItem value="ATIVO">Ativos</SelectItem>
       <SelectItem value="INATIVO">Inativos</SelectItem>
      </SelectContent>
     </Select>

     <Button
      variant="outline"
      size="sm"
      onClick={handleExportExcel}
      className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
     >
      <Download className="mr-2 h-4 w-4"/>Excel
     </Button>

     <Button
      variant="outline"
      size="sm"
      onClick={handleGeneratePDF}
      className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
     >
      <FileText className="mr-2 h-4 w-4"/>PDF
     </Button>

     <Button
      variant="default"
      size="sm"
      onClick={printContent}
     >
      <Printer className="mr-2 h-4 w-4"/>Imprimir
     </Button>

    </div>
   </div>

   <Card className="border-border bg-card shadow-lg">

    <CardHeader className="border-b border-border pb-3">

     <CardTitle className="flex items-center justify-between text-base">

      <div className="flex items-center font-bold">
       <Filter className="mr-2 h-4 w-4 text-primary"/>
       Filtros Avançados
      </div>

      <Button
       variant="ghost"
       size="sm"
       onClick={()=>setShowFilters(!showFilters)}
       className="h-8 w-8 p-0"
       aria-label={showFilters?'Ocultar filtros':'Mostrar filtros'}
      >
       {showFilters?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
      </Button>

     </CardTitle>

    </CardHeader>

    <AnimatePresence>
     {showFilters&&
      <motion.div
       initial={{height:0,opacity:0}}
       animate={{height:'auto',opacity:1}}
       exit={{height:0,opacity:0}}
       transition={{duration:.25}}
      >

       <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">

        <div className="relative">
         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
         <Input
          placeholder="Buscar membro..."
          value={searchTerm}
          onChange={e=>setSearchTerm(e.target.value)}
          className="border-input bg-background/50 pl-9"
         />
        </div>

        <Select value={filterConjunto} onValueChange={setFilterConjunto}>
         <SelectTrigger className="border-input bg-background/50">
          <SelectValue placeholder="Conjunto"/>
         </SelectTrigger>

         <SelectContent className="dark-igreja max-h-[240px]">
          <SelectItem value="todos">Todos os Conjuntos</SelectItem>

          {conjuntosBase.map(c=>
           <SelectItem key={c.id} value={String(c.id)}>
            {c.nome_conjunto}
           </SelectItem>
          )}

         </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border border-border bg-muted/20 px-4 py-2">
         <Users className="mr-3 h-5 w-5 text-primary"/>

         <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
           Membros Listados
          </p>

          <p className="text-xl font-bold leading-none">
           {filteredData.totalMembros}
          </p>
         </div>
        </div>

       </CardContent>

      </motion.div>
     }
    </AnimatePresence>

   </Card>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
     <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <Layers className="h-5 w-5 text-primary"/>
     </div>

     <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
       Conjuntos
      </p>
      <p className="text-xl font-bold">
       {filteredData.totalConjuntos}
      </p>
     </div>
    </div>

    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
     <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <Music className="h-5 w-5 text-primary"/>
     </div>

     <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
       Conjuntos com Membros
      </p>
      <p className="text-xl font-bold">
       {filteredData.totalComConjunto}
      </p>
     </div>
    </div>

    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
     <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <Users className="h-5 w-5 text-primary"/>
     </div>

     <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
       Registros
      </p>
      <p className="text-xl font-bold">
       {filteredData.totalMembros}
      </p>
     </div>
    </div>

   </div>

   {loading?

    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">

     <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent motion-safe:animate-spin"/>

     <p className="mt-4 text-sm text-muted-foreground">
      Carregando conjuntos...
     </p>

    </div>

   :filteredData.conjuntos.length===0?

    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">

     <div className="mb-4 rounded-full bg-muted p-6">
      <Music className="h-12 w-12 text-muted-foreground"/>
     </div>

     <h3 className="text-xl font-bold">
      Nenhum conjunto encontrado
     </h3>

     <p className="mt-2 max-w-md text-sm text-muted-foreground">
      Ajuste os filtros para visualizar os membros por conjunto.
     </p>

    </div>

   :
    <div className="print-content grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

     {filteredData.conjuntos.map(conjunto=>{

      const vazio=conjunto.membros.length===0;

      return <Card
       key={conjunto.id}
       className={`group overflow-hidden bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-md ${
        conjunto.isSemConjunto
         ?'border-amber-500/30'
         :'border-border hover:border-primary'
       }`}
      >

       <CardHeader
        className={`border-b pb-3 ${
         conjunto.isSemConjunto
          ?'border-amber-500/20 bg-amber-500/5'
          :'border-border bg-muted/20'
        }`}
       >

        <CardTitle className="flex items-center justify-between gap-3">

         <div className={`flex min-w-0 items-center gap-2 ${
          conjunto.isSemConjunto?'text-amber-600':'text-foreground'
         }`}>

          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
           conjunto.isSemConjunto?'bg-amber-500/10':'bg-primary/10'
          }`}>

           {conjunto.isSemConjunto
            ?<UserMinus className="h-4 w-4 text-amber-600"/>
            :<Music className="h-4 w-4 text-primary"/>
           }

          </div>

          <span className="truncate text-base font-bold">
           {conjunto.nome_conjunto}
          </span>

         </div>

         <Badge
          variant="outline"
          className={`shrink-0 ${
           conjunto.isSemConjunto
            ?'border-amber-500/30 text-amber-600'
            :'border-primary/30 text-primary'
          }`}
         >
          {conjunto.membros.length}
         </Badge>

        </CardTitle>

       </CardHeader>

       <CardContent className="p-0">

        {vazio?

         <div className="flex flex-col items-center justify-center px-4 py-10 text-center">

          <Music className="h-8 w-8 text-muted-foreground/40"/>

          <p className="mt-3 text-sm text-muted-foreground">
           Nenhum membro vinculado a este conjunto
           {filterStatus!=='todos'&&' para o filtro selecionado'}.
          </p>

         </div>

        :

         <ScrollArea className="h-[300px] w-full">

          <div className="divide-y divide-border">

           {conjunto.membros.map((membro,index)=>{

            const inactive=(membro.status||'ATIVO')==='INATIVO';

            return <div
             key={membro.id}
             className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5"
            >

             <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              inactive
               ?'border-red-500/30 bg-red-500/10 text-red-500'
               :'border-primary/20 bg-primary/10 text-primary'
             }`}>
              {index+1}
             </div>

             <div className="min-w-0 flex-1">

              <p className={`truncate text-sm font-bold ${
               inactive?'text-red-500':'text-foreground'
              }`}>
               {membro.nome_completo}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2">

               {membro.cargo?.nome_cargo&&
                <span className="truncate text-[10px] font-medium text-muted-foreground">
                 {membro.cargo.nome_cargo}
                </span>
               }

               {inactive&&
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-500">
                 INATIVO
                </span>
               }

              </div>

             </div>

             <Users className="h-4 w-4 shrink-0 text-muted-foreground"/>

            </div>;
           })}

          </div>

         </ScrollArea>

        }

       </CardContent>

      </Card>;
     })}

    </div>
   }

  </motion.div>
 </div>;
};

export default ConsultaMembrosConjunto;
