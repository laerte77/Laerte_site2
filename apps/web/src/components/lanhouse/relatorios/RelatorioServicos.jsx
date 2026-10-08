import React,{useState,useEffect}from'react';
import{FileText,RefreshCw,Filter,Receipt}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useIsMounted,withIsMountedCheck,handleSupabaseError}from'@/lib/errorHandlingUtils';
import{useToast}from'@/components/ui/use-toast';

const RelatorioServicos=()=>{
 const{toast}=useToast(),{user}=useAuth(),isMounted=useIsMounted();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true);

 const fetchData=async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('lm_lanc_servicos').select('*, lm_servicos(servico)').eq('user_id',user.id);
   if(error)throw error;
   const sorted=(data||[]).sort((a,b)=>(a.lm_servicos?.servico||'').localeCompare(b.lm_servicos?.servico||''));
   withIsMountedCheck(()=>setData(sorted),isMounted);
  }catch(e){
   withIsMountedCheck(()=>toast({title:'Erro',description:handleSupabaseError(e),variant:'destructive'}),isMounted);
  }finally{
   withIsMountedCheck(()=>setLoading(false),isMounted);
  }
 };

 useEffect(()=>{fetchData()},[user]);

 const total=data.reduce((s,x)=>s+(Number(x.valor)||0),0);

 return <div className="space-y-6">

  <Card className="border-cyan-500/20">
   <CardContent className="p-5">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
     <div className="flex gap-3 items-center">
      <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
       <FileText className="w-7 h-7 text-cyan-400"/>
      </div>
      <div>
       <p className="text-xs uppercase tracking-wider text-cyan-400">Relatórios • LM Impressões</p>
       <h1 className="text-2xl font-bold">Relatório de Serviços</h1>
       <p className="text-sm text-muted-foreground">Consulta dos serviços lançados.</p>
      </div>
     </div>
     <Button variant="outline" onClick={fetchData} disabled={loading} className="text-cyan-400 border-cyan-500/40">
      <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>Atualizar
     </Button>
    </div>
   </CardContent>
  </Card>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   <Card className="border-cyan-500/20">
    <CardContent className="p-5 flex justify-between items-center">
     <div><p className="text-xs uppercase text-muted-foreground">Serviços Lançados</p><p className="text-2xl font-bold mt-1">{data.length}</p></div>
     <Receipt className="w-6 h-6 text-cyan-400"/>
    </CardContent>
   </Card>
   <Card className="border-cyan-500/20">
    <CardContent className="p-5 flex justify-between items-center">
     <div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1 text-emerald-500">R$ {total.toFixed(2).replace('.',',')}</p></div>
     <Receipt className="w-6 h-6 text-emerald-500"/>
    </CardContent>
   </Card>
  </div>

  <Card className="border-cyan-500/20">
   <CardHeader>
    <CardTitle className="flex items-center gap-2">
     <Filter className="w-4 h-4 text-cyan-400"/>Resultados
     <Badge variant="outline" className="ml-auto">{data.length} registros</Badge>
    </CardTitle>
   </CardHeader>

   <CardContent className="p-0">
    {loading?<div className="p-8 text-center text-muted-foreground">Carregando...</div>:
    !data.length?<div className="p-12 text-center text-muted-foreground">Nenhum serviço lançado.</div>:
    <div className="responsive-table-wrapper">
     <Table>
      <TableHeader>
       <TableRow>
        <TableHead>Serviço</TableHead>
        <TableHead>Data</TableHead>
        <TableHead className="text-right">Valor</TableHead>
       </TableRow>
      </TableHeader>
      <TableBody>
       {data.map(x=>
        <TableRow key={x.id} className="hover:bg-cyan-500/5">
         <TableCell className="font-medium">{x.lm_servicos?.servico||'-'}</TableCell>
         <TableCell>{x.data?new Date(x.data).toLocaleDateString('pt-BR'):'-'}</TableCell>
         <TableCell className="text-right font-bold text-emerald-500">R$ {Number(x.valor||0).toFixed(2).replace('.',',')}</TableCell>
        </TableRow>
       )}
      </TableBody>
     </Table>
    </div>}
   </CardContent>
  </Card>

 </div>;
};

export default RelatorioServicos;
