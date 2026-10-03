import React,{useState,useEffect,useCallback}from'react';
import{Heart,PlusCircle,Edit,Trash2,Search}from'lucide-react';
import{format,parseISO}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardContent}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const LancamentoCasamentos=()=>{
 const{user}=useAuth(),{toast}=useToast();

 const[casamentos,setCasamentos]=useState([]);
 const[membros,setMembros]=useState([]);
 const[filtered,setFiltered]=useState([]);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[open,setOpen]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[search,setSearch]=useState('');
 const[data,setData]=useState('');
 const[membroId,setMembroId]=useState('');

 const fetchCasamentos=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const{data:result,error}=await supabase
    .from('igreja_casamentos')
    .select('*, membro:igreja_membros(nome_completo)')
    .order('data',{ascending:false});

   if(error)throw error;
   setCasamentos(result||[]);
  }catch(error){
   toast({
    title:'Erro ao buscar casamentos',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 const fetchMembros=useCallback(async()=>{
  if(!user)return;

  try{
   const{data:result,error}=await supabase
    .from('igreja_membros')
    .select('id,nome_completo')
    .order('nome_completo',{ascending:true});

   if(error)throw error;
   setMembros(result||[]);
  }catch(error){
   toast({
    title:'Erro ao buscar membros',
    description:error.message,
    variant:'destructive'
   });
  }
 },[user,toast]);

 useEffect(()=>{
  fetchCasamentos();
  fetchMembros();
 },[fetchCasamentos,fetchMembros]);

 useEffect(()=>{
  const term=search.trim().toLowerCase();

  setFiltered(
   casamentos.filter(item=>
    (item.membro?.nome_completo||'').toLowerCase().includes(term)
   )
  );
 },[search,casamentos]);

 useEffect(()=>{
  if(!user)return;

  const channel=supabase
   .channel('igreja_casamentos_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'igreja_casamentos'
    },
    fetchCasamentos
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchCasamentos]);

 const reset=()=>{
  setData('');
  setMembroId('');
  setEditingId(null);
 };

 const openCreate=()=>{
  reset();
  setOpen(true);
 };

 const openEdit=item=>{
  setEditingId(item.id);
  setData(item.data||'');
  setMembroId(item.membro_id||'');
  setOpen(true);
 };

 const close=()=>{
  setOpen(false);
  reset();
 };

 const save=async()=>{
  if(!data||!membroId){
   toast({
    title:'Campos obrigatórios',
    description:'Informe a data e o membro.',
    variant:'destructive'
   });
   return;
  }

  setSaving(true);

  try{
   const payload={
    data,
    membro_id:membroId,
    user_id:user.id
   };

   if(editingId){
    const{error}=await supabase
     .from('igreja_casamentos')
     .update(payload)
     .eq('id',
