import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,Crown,Search,Filter,Download,FileText,Printer,ChevronDown,ChevronUp,User,Shield,AlertTriangle,X}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardHeader,CardTitle,CardContent,CardFooter}from'@/components/ui/card';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{exportToExcel,generatePDF,printContent}from'@/lib/ExportUtils';
import{Helmet}from'react-helmet';

const getInitials=name=>{
 if(!name)return'D';
 const p=name.trim().split(/\s+/);
 if(p.length===1)return p[0].slice(0,2).toUpperCase();
 return`${p[0][0]}${p[p.length-1][0]}`.toUpperCase();
};

const getFunctionNames=(m,funcoes)=>{
 const ids=m?.funcoes_multiplas?.funcoes_ids;
 if(Array.isArray(ids)&&ids.length){
  const nomes=ids.map(id=>funcoes.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);
  if(nomes.length)return nomes.join(', ');
 }
 return m?.funcoes_exercidas||m?.igreja_funcoes?.nome_funcao||'-';
};

const Skeleton=()=>(
 <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
  <div className="h-5 w-40 rounded bg-muted motion-safe:animate-pulse"/>
  <div className="space-y-3">
   <div className="h-14 rounded-lg bg-muted motion-safe:animate-pulse"/>
   <div className="h-14 rounded-lg bg-muted motion-safe:animate-pulse"/>
  </div>
 </div>
);

const ConsultaDirigentesConjunto=()=>{
 const{toast}=useToast();

 const[conjuntosBase,setConjuntosBase]=useState([]);
 const[allDirigentes,setAllDirigentes]=useState([]);
 const[funcoes,setFuncoes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filterStatus,setFilterStatus]=useState('ATIVO');
 const[searchTerm,setSearchTerm]=useState('');
 const[filterConjunto,setFilterConjunto]=useState('todos');
 const[showFilters,setShowFilters]=useState(true);
 const[selectedDirigente,setSelectedDirigente]=useState(null);

 const fetchData=useCallback(async()=>{
  setLoading(true);
  try{
   const[conjRes,dirRes,funcRes]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select(`
      *,
      conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
      dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
      cargo:cargos_igreja(nome_cargo),
      igreja_classes(nome_classe),
      igreja_funcoes(nome_funcao)
    `).eq('is_dirigente',true).order('nome_completo',{ascending:true}),
    supabase.from('igreja_funcoes').select('*').order('nome_funcao',{ascending:true})
   ]);

   if(conjRes.error)throw conjRes.error;
   if(dirRes.error)throw dirRes.error;
   if(funcRes.error)throw funcRes.error;

   setConjuntosBase(conjRes.data||[]);
   setAllDirigentes(dirRes.data||[]);
   setFuncoes(funcRes.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',description:error.message,variant:'destructive'});
  }finally{
   setLoading(false);
  }
 },[toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const dirigentesFiltrados=useMemo(()=>allDirigentes.filter(d=>{
  const statusMatch=filterStatus==='todos'||(d.status||'ATIVO')===filterStatus;
  const term=searchTerm.toLowerCase().trim();
  const nome=(d.nome_completo||'').toLowerCase();
  const conjunto=(d.dirige_conjunto?.nome_conjunto||'').toLowerCase();
  const searchMatch=!term||nome.includes(term)||conjunto.includes(term);
  const conjuntoMatch=filterConjunto==='todos'||String(d.dirige_conjunto_id)===filterConjunto;
  return statusMatch&&searchMatch&&conjuntoMatch;
 }),[allDirigentes,filterStatus,searchTerm,filterConjunto]);

 const conjuntos=useMemo(()=>conjuntosBase.map(c=>({
  ...c,
  dirigentes:dirigentesFiltrados.filter(d=>String(d.dirige_conjunto_id)===String(c.id))
 })).filter(c=>c.dirigentes.length>0),[conjuntosBase,dirigentesFiltrados]);

 const totalDirigentes=dirigentesFiltrados.length;

 const handleExportExcel=()=>{
  const data=conjuntos.flatMap(c=>c.dirigentes.map(d=>({
   Conjunto:c.nome_conjunto,
   Dirigente:d.nome_completo,
   'Função/Cargo':d.cargo?.nome_cargo||getFunctionNames(d,funcoes),
   Status:d.status||'ATIVO'
  })));

  if(!data.length){
   toast({title:'Sem dados',description:'Não há dirigentes para exportar.',variant:'destructive'});
   return;
  }

  exportToExcel(data,'Dirigentes_por_Conjunto','Dirigentes');
 };

 const handleGeneratePDF=()=>{
  const body=conjuntos.flatMap(c=>c.dirigentes.map(d=>[
   c.nome_conjunto,
   d.nome_completo,
   d.cargo?.nome_cargo||getFunctionNames(d,funcoes),
   d.status||'ATIVO'
  ]));

  if(!body.length){
   toast({title:'Sem dados',description:'Não há dirigentes para exportar.',variant:'destructive'});
   return;
  }

  generatePDF(
   'Dirigentes por Conjunto',
   ['Conjunto','Dirigente','Função/Cargo','Status'],
   body,
   'dirigentes_conjunto'
  );
 };

 return <div className="dark-igreja text-foreground">
  <Helmet><title>Dirigentes por Conjunto | Secretaria</title></Helmet>

  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5 md:space-y-6">

   <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

    <div className="flex items-center gap-3">
     <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 md:h-16 md:w-16">
      <Crown className="h-7 w-7 text-primary md:h-8 md:w-8"/>
     </div>

     <div>
      <h2 className="text-2xl font-bold text-primary md:text-3xl">Dirigentes por Conjunto</h2>
      <p className="text-sm text-muted-foreground md:text-base">
       Consulte os dirigentes responsáveis por cada conjunto.
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

     <Button variant="default" size="sm" onClick={printContent}>
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
      >
       <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">

        <div className="relative">
         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
         <Input
          placeholder="Buscar dirigente ou conjunto..."
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

        <div className="flex items-center rounded-lg border border-border bg-muted/20 px-4 text-sm font-semibold text-muted-foreground">
         <Users className="mr-2 h-4 w-4 text-primary"/>
         {totalDirigentes} {totalDirigentes===1?'dirigente encontrado':'dirigentes encontrados'}
        </div>

       </CardContent>
      </motion.div>
     }
    </AnimatePresence>

   </Card>

   {loading?

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
     {Array(6).fill(0).map((_,i)=><Skeleton key={i}/>)}
    </div>

   :conjuntos.length===0?

    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">

     <div className="mb-4 rounded-full bg-muted p-6">
      <Crown className="h-12 w-12 text-muted-foreground"/>
     </div>

     <h3 className="text-xl font-bold">Nenhum dirigente encontrado</h3>

     <p className="mt-2 max-w-md text-sm text-muted-foreground">
      Ajuste os filtros para visualizar os dirigentes por conjunto.
     </p>

    </div>

   :
    <div className="print-content grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

     {conjuntos.map(conjunto=>
      <Card
       key={conjunto.id}
       className="group overflow-hidden border-border bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:border-primary"
      >

       <CardHeader className="border-b border-border bg-muted/20 pb-3">

        <CardTitle className="flex items-center justify-between gap-3">

         <div className="flex min-w-0 items-center gap-2">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
           <Users className="h-4 w-4 text-primary"/>
          </div>

          <span className="truncate text-base font-bold">
           {conjunto.nome_conjunto}
          </span>

         </div>

         <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
          {conjunto.dirigentes.length} {conjunto.dirigentes.length===1?'Dirigente':'Dirigentes'}
         </Badge>

        </CardTitle>

       </CardHeader>

       <CardContent className="space-y-3 p-3">

        {conjunto.dirigentes.map(d=>{
         const inactive=(d.status||'ATIVO')==='INATIVO';
         const funcao=getFunctionNames(d,funcoes);

         return <motion.div
          key={d.id}
          whileHover={{scale:1.005}}
          className={`cursor-pointer rounded-xl border p-3 transition-colors ${
           inactive
            ?'border-red-500/30 bg-red-500/5'
            :'border-border bg-background/40 hover:border-primary/40 hover:bg-primary/5'
          }`}
          onClick={()=>setSelectedDirigente({...d,_conjunto:conjunto})}
         >

          <div className="flex items-start gap-3">

           <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
            inactive
             ?'border-red-500/30 bg-red-500/10 text-red-500'
             :'border-primary/20 bg-primary/10 text-primary'
           }`}>
            {getInitials(d.nome_completo)}
           </div>

           <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-2">

             <div className="min-w-0">

              <p className={`truncate text-sm font-bold ${
               inactive?'text-red-500':'text-foreground'
              }`}>
               {d.nome_completo}
              </p>

              <div className="mt-1 flex flex-wrap gap-1.5">

               {d.cargo?.nome_cargo&&
                <Badge className="border-primary/20 bg-primary/10 text-[10px] text-primary">
                 <Shield className="mr-1 h-3 w-3"/>
                 {d.cargo.nome_cargo}
                </Badge>
               }

               {inactive&&
                <Badge className="border-red-500/20 bg-red-500/10 text-[10px] text-red-500">
                 <AlertTriangle className="mr-1 h-3 w-3"/>
                 INATIVO
                </Badge>
               }

              </div>

             </div>

             <Crown className="h-4 w-4 shrink-0 text-primary"/>

            </div>

            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
             {funcao}
            </p>

           </div>
          </div>

         </motion.div>
        })}

       </CardContent>

       <CardFooter className="border-t border-border bg-muted/10 px-3 py-2 text-[10px] font-medium text-muted-foreground">
        Clique no dirigente para visualizar seus dados.
       </CardFooter>

      </Card>
     )}

    </div>
   }

  </motion.div>

  <Dialog
   open={!!selectedDirigente}
   onOpenChange={open=>{if(!open)setSelectedDirigente(null)}}
  >

   <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">

    {selectedDirigente&&
     <div className="max-h-[90vh] overflow-y-auto">

      <DialogHeader className="border-b border-border bg-card px-6 py-5">

       <DialogTitle className="flex items-center gap-3 text-xl text-primary md:text-2xl">

        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
         <User className="h-5 w-5 text-primary"/>
        </div>

        Ficha do Dirigente

       </DialogTitle>

      </DialogHeader>

      <div className="space-y-5 p-5 md:p-6">

       <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">

        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-secondary text-2xl font-bold text-primary">
         {getInitials(selectedDirigente.nome_completo)}
        </div>

        <h2 className="text-2xl font-bold">
         {selectedDirigente.nome_completo}
        </h2>

        <div className="mt-3 flex flex-wrap justify-center gap-2">

         <Badge className={
          selectedDirigente.status==='INATIVO'
           ?'border-red-500/30 bg-red-500/10 text-red-500'
           :'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
         }>
          {selectedDirigente.status||'ATIVO'}
         </Badge>

         {selectedDirigente.cargo?.nome_cargo&&
          <Badge variant="outline" className="border-primary/30 text-primary">
           <Shield className="mr-1 h-3 w-3"/>
           {selectedDirigente.cargo.nome_cargo}
          </Badge>
         }

        </div>
       </div>

       <div>

        <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">
         Dados do Dirigente
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

         {[
          ['Nome Completo',selectedDirigente.nome_completo],
          ['Conjunto que Dirige',selectedDirigente._conjunto?.nome_conjunto||selectedDirigente.dirige_conjunto?.nome_conjunto||'-'],
          ['Cargo',selectedDirigente.cargo?.nome_cargo||'-'],
          ['Função/Funções',getFunctionNames(selectedDirigente,funcoes)],
          ['Classe da EBD',selectedDirigente.igreja_classes?.nome_classe||'-'],
          ['É Dirigente','Sim'],
          ['Status',selectedDirigente.status||'ATIVO']
         ].map(([label,value])=>
          <div key={label} className="rounded-lg border border-border bg-background/40 p-3">

           <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
           </span>

           <span className="mt-1 block font-semibold">
            {value}
           </span>

          </div>
         )}

        </div>
       </div>

      </div>

      <DialogFooter className="border-t border-border bg-muted/10 px-5 py-4">

       <Button variant="outline" onClick={()=>setSelectedDirigente(null)}>
        <X className="mr-2 h-4 w-4"/>
        Fechar
       </Button>

      </DialogFooter>

     </div>
    }

   </DialogContent>
  </Dialog>

 </div>;
};

export default ConsultaDirigentesConjunto;
