import React,{useState,useEffect,useMemo,useCallback}from'react';
import{
 Edit,Trash,Users,Loader2,AlertTriangle,ShieldAlert,ChevronRight,
 UserPlus,RefreshCw,Search
}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Checkbox}from'@/components/ui/checkbox';
import{Switch}from'@/components/ui/switch';
import{Badge}from'@/components/ui/badge';
import{
 Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,
 DialogFooter,DialogClose
}from'@/components/ui/dialog';
import{
 AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,
 AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,
 AlertDialogTitle,AlertDialogTrigger
}from'@/components/ui/alert-dialog';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{getAllUsers,updateUserModules,deleteUser}from'@/lib/adminUtils';
import{useNavigate}from'react-router-dom';
import SubModuleSelectionModal from'./SubModuleSelectionModal';

const AVAILABLE_MODULES=[
 {id:'pessoal',label:'Pessoal'},
 {id:'igreja',label:'Igreja',submodules:['Tesouraria','Secretaria']},
 {id:'lm-impressoes',label:'Lanhouse'},
 {id:'entretenimento',label:'Entretenimento'},
 {id:'barbearia',label:'Barbearia'}
];

const getBaseModuleId=mod=>
 typeof mod==='string'?mod.split(':')[0]:mod;

const hasModule=(modulesArray,modId)=>
 modulesArray.some(mod=>{
  if(typeof mod==='string'){
   return getBaseModuleId(mod).toLowerCase()===modId.toLowerCase();
  }

  if(typeof mod==='object'&&mod&&!Array.isArray(mod)){
   return Object.keys(mod)
    .some(key=>key.toLowerCase()===modId.toLowerCase());
  }

  return false;
 });

const getSelectedSubmodules=(modulesArray,modId)=>{
 const matches=modulesArray
  .filter(
   mod=>
    typeof mod==='string'&&
    getBaseModuleId(mod).toLowerCase()===modId.toLowerCase()&&
    mod.includes(':')
  )
  .map(mod=>{
   const sub=mod.split(':')[1];
   return sub.charAt(0).toUpperCase()+sub.slice(1);
  });

 if(matches.length)return matches;

 for(const mod of modulesArray){
  if(typeof mod==='object'&&mod&&!Array.isArray(mod)){
   const key=Object.keys(mod).find(
    k=>k.toLowerCase()===modId.toLowerCase()
   );

   if(key&&Array.isArray(mod[key])&&mod[key].length){
    return mod[key];
   }
  }
 }

 return[];
};

const GerenciarUsuarios=()=>{
 const{toast}=useToast();
 const navigate=useNavigate();

 const[users,setUsers]=useState([]);
 const[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');

 const[isEditOpen,setEditOpen]=useState(false);
 const[editingUser,setEditingUser]=useState(null);
 const[editFormData,setEditFormData]=useState({
  modules:[],
  sharingPreferences:{}
 });
 const[saving,setSaving]=useState(false);

 const[subModalConfig,setSubModalConfig]=useState({
  isOpen:false,
  module:null
 });

 const[deletingId,setDeletingId]=useState(null);
 const[forceDeleteData,setForceDeleteData]=useState({
  isOpen:false,
  user:null,
  tables:[]
 });
 const[isForceDeleting,setIsForceDeleting]=useState(false);

 const fetchUsers=useCallback(async()=>{
  setLoading(true);

  try{
   const response=await getAllUsers();

   if(response.success){
    setUsers(response.users||[]);
   }
  }catch(error){
   toast({
    title:'Erro ao buscar usuários',
    description:error.message||'Falha na comunicação com o servidor.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[toast]);

 useEffect(()=>{
  fetchUsers();
 },[fetchUsers]);

 const filteredUsers=useMemo(()=>{
  const term=search.trim().toLowerCase();

  if(!term)return users;

  return users.filter(user=>{
   const email=String(user.email||'').toLowerCase();

   const modules=Array.isArray(user.modulos_acesso)
    ?JSON.stringify(user.modulos_acesso).toLowerCase()
    :'';

   return email.includes(term)||modules.includes(term);
  });
 },[users,search]);

 const handleEditClick=user=>{
  setEditingUser(user);

  const normalized=[];

  if(Array.isArray(user.modulos_acesso)){
   user.modulos_acesso.forEach(mod=>{
    if(typeof mod==='string'){
     normalized.push(mod);
    }else if(typeof mod==='object'&&mod&&!Array.isArray(mod)){
     const key=Object.keys(mod)[0];

     if(Array.isArray(mod[key])&&mod[key].length){
      mod[key].forEach(sub=>{
       normalized.push(
        `${key.toLowerCase()}:${sub.toLowerCase()}`
       );
      });
     }else{
      normalized.push(key.toLowerCase());
     }
    }
   });
  }

  setEditFormData({
   modules:normalized,
   sharingPreferences:user.data_sharing_preferences||{}
  });

  setEditOpen(true);
 };

 const handleModuleToggle=moduleDef=>{
  const modId=moduleDef.id;
  const allowed=hasModule(editFormData.modules,modId);

  if(allowed){
   setEditFormData(prev=>({
    ...prev,
    modules:prev.modules.filter(
     mod=>getBaseModuleId(mod).toLowerCase()!==modId.toLowerCase()
    )
   }));
   return;
  }

  if(moduleDef.submodules?.length){
   setSubModalConfig({
    isOpen:true,
    module:moduleDef
   });
   return;
  }

  setEditFormData(prev=>{
   const sharing={...prev.sharingPreferences};

   if(sharing[modId]===undefined){
    sharing[modId]=true;
   }

   return{
    ...prev,
    modules:[...prev.modules,modId],
    sharingPreferences:sharing
   };
  });
 };

 const handleSubModuleConfirm=(selectedSubModules,realtime)=>{
  const moduleDef=subModalConfig.module;

  if(!moduleDef||!selectedSubModules?.length)return;

  const newModules=selectedSubModules.map(
   sub=>`${moduleDef.id}:${sub.toLowerCase()}`
  );

  setEditFormData(prev=>{
   const modules=prev.modules.filter(
    mod=>getBaseModuleId(mod).toLowerCase()!==moduleDef.id.toLowerCase()
   );

   const sharing={...prev.sharingPreferences};

   if(sharing[moduleDef.id]===undefined){
    sharing[moduleDef.id]=true;
   }

   sharing[`${moduleDef.id}_realtime`]=realtime;

   return{
    ...prev,
    modules:[...modules,...newModules],
    sharingPreferences:sharing
   };
  });

  setSubModalConfig({
   isOpen:false,
   module:null
  });
 };

 const handleSharingToggle=(moduleId,value)=>{
  setEditFormData(prev=>({
   ...prev,
   sharingPreferences:{
    ...prev.sharingPreferences,
    [moduleId]:value
   }
  }));
 };

 const handleEditSubmit=async e=>{
  e.preventDefault();
  setSaving(true);

  try{
   await updateUserModules(
    editingUser.id,
    editingUser.email,
    null,
    editFormData.modules,
    editFormData.sharingPreferences
   );

   toast({
    title:'Sucesso!',
    description:'Permissões atualizadas com sucesso.',
    className:'bg-green-500 text-white border-none'
   });

   setEditOpen(false);
   fetchUsers();
  }catch(error){
   toast({
    title:'Erro ao atualizar',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setSaving(false);
  }
 };

 const handleInitialDelete=async user=>{
  setDeletingId(user.id);

  try{
   const response=await deleteUser(user.id,false);

   if(response.status===409){
    setForceDeleteData({
     isOpen:true,
     user,
     tables:response.tables||[]
    });
   }else if(response.success){
    toast({
     title:'Sucesso!',
     description:'Usuário excluído permanentemente.',
     className:'bg-green-500 text-white border-none'
    });
    fetchUsers();
   }
  }catch(error){
   toast({
    title:'Erro ao excluir',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setDeletingId(null);
  }
 };

 const executeForceDelete=async()=>{
  if(!forceDeleteData.user)return;

  setIsForceDeleting(true);

  try{
   const response=await deleteUser(
    forceDeleteData.user.id,
    true
   );

   if(response.success){
    toast({
     title:'Sucesso!',
     description:'Usuário e dados vinculados excluídos permanentemente.',
     className:'bg-green-500 text-white border-none'
    });

    setForceDeleteData({
     isOpen:false,
     user:null,
     tables:[]
    });

    fetchUsers();
   }
  }catch(error){
   toast({
    title:'Erro ao excluir dados',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setIsForceDeleting(false);
  }
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <Users className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Administração
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Gerenciar Usuários
      </h1>

      <p className="text-sm text-muted-foreground">
       Visualize, edite acessos e gerencie compartilhamentos.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={fetchUsers}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>navigate('/pessoal/dashboard/admin/criar-usuario')}
      className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
     >
      <UserPlus className="mr-2 h-4 w-4"/>
      Novo Usuário
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="p-4">
     <div className="relative max-w-lg">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Pesquisar por e-mail ou módulo..."
       className="bg-input pl-9"
      />
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-2">
    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Usuários cadastrados
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
       {users.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Resultado atual
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold">
       {filteredUsers.length}
      </p>
     </CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
      Usuários
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left font-semibold text-muted-foreground">
          E-mail
         </th>
         <th className="p-4 text-left font-semibold text-muted-foreground">
          Módulos & Compartilhamento
         </th>
         <th className="w-28 p-4 text-right font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan={3} className="p-12 text-center text-muted-foreground">
           <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin"/>
           Carregando usuários...
          </td>
         </tr>
        ):filteredUsers.length===0?(
         <tr>
          <td colSpan={3} className="p-12 text-center text-muted-foreground">
           <Users className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           Nenhum usuário encontrado.
          </td>
         </tr>
        ):(
         filteredUsers.map(user=>{
          const safeModules=Array.isArray(user.modulos_acesso)
           ?user.modulos_acesso
           :[];

          const displayModules={};

          safeModules.forEach(mod=>{
           if(typeof mod==='string'){
            if(mod.includes(':')){
             const[base,sub]=mod.split(':');

             if(!displayModules[base]){
              displayModules[base]=[];
             }

             displayModules[base].push(
              sub.charAt(0).toUpperCase()+sub.slice(1)
             );
            }else{
             if(!displayModules[mod]){
              displayModules[mod]=[];
             }
            }
           }else if(
            typeof mod==='object'&&
            mod&&!Array.isArray(mod)
           ){
            const key=Object.keys(mod)[0];

            if(!displayModules[key]){
             displayModules[key]=[];
            }

            if(Array.isArray(mod[key])){
             displayModules[key].push(...mod[key]);
            }
           }
          });

          return(
           <tr
            key={user.id}
            className="border-b border-border last:border-0 hover:bg-muted/20"
           >
            <td className="p-4 align-top font-medium">
             {user.email}
            </td>

            <td className="p-4">
             <div className="flex flex-wrap gap-2">
              {Object.keys(displayModules).length?(
               Object.entries(displayModules).map(
                ([modName,subs])=>{
                 const details=subs.length
                  ?` (${subs.join(', ')})`
                  :'';

                 const sharingKey=
                  modName
                   .toLowerCase()
                   .replace('-','_');

                 const shared=
                  user.data_sharing_preferences?.[
                   sharingKey
                  ]!==false;

                 return(
                  <div
                   key={modName}
                   className="max-w-[180px] rounded-lg border border-border/50 bg-background/40 p-1.5"
                  >
                   <Badge
                    variant="outline"
                    className="w-full justify-center border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.05)] text-[10px] uppercase tracking-wider text-[hsl(var(--neon-pessoal))]"
                   >
                    <span className="truncate">
                     {modName}
                     {details}
                    </span>
                   </Badge>

                   <span className={`mt-1 block rounded px-1 py-0.5 text-center text-[9px] font-bold tracking-widest ${
                    shared
                     ?'bg-emerald-500/10 text-emerald-400'
                     :'bg-red-500/10 text-red-400'
                   }`}>
                    COMPART.: {shared?'SIM':'NÃO'}
                   </span>
                  </div>
                 );
                }
               )
              ):(
               <Badge
                variant="destructive"
                className="uppercase"
               >
                Acesso restrito
               </Badge>
              )}
             </div>
            </td>

            <td className="p-4 align-top">
             <div className="flex items-center justify-end gap-1">

              <Button
               variant="ghost"
               size="icon"
               onClick={()=>handleEditClick(user)}
               disabled={deletingId===user.id}
               className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
               title="Gerenciar permissões"
              >
               <Edit className="h-4 w-4"/>
              </Button>

              <AlertDialog>
               <AlertDialogTrigger asChild>
                <Button
                 variant="ghost"
                 size="icon"
                 disabled={deletingId===user.id}
                 className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                 title="Excluir usuário"
                >
                 {deletingId===user.id?(
                  <Loader2 className="h-4 w-4 animate-spin"/>
                 ):(
                  <Trash className="h-4 w-4"/>
                 )}
                </Button>
               </AlertDialogTrigger>

               <AlertDialogContent className="dark-pessoal border-border bg-card">
                <AlertDialogHeader>
                 <AlertDialogTitle className="text-red-400">
                  Excluir Usuário
                 </AlertDialogTitle>

                 <AlertDialogDescription>
                  Tem certeza que deseja excluir{' '}
                  <strong>{user.email}</strong>?
                  O sistema verificará se existem dados vinculados.
                 </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                 <AlertDialogCancel>
                  Cancelar
                 </AlertDialogCancel>

                 <AlertDialogAction
                  onClick={()=>handleInitialDelete(user)}
                  className="bg-red-600 text-white hover:bg-red-700"
                 >
                  Sim, Continuar
                 </AlertDialogAction>
                </AlertDialogFooter>
               </AlertDialogContent>
              </AlertDialog>
             </div>
            </td>
           </tr>
          );
         })
        )}
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <Dialog
    open={isEditOpen}
    onOpenChange={setEditOpen}
   >
    <DialogContent className="dark-pessoal flex max-h-[90vh] flex-col border-border bg-card sm:max-w-[600px]">
     <DialogHeader>
      <DialogTitle className="text-[hsl(var(--neon-pessoal))]">
       Editar Permissões
      </DialogTitle>

      <DialogDescription>
       Ajuste os módulos e compartilhamentos de{' '}
       {editingUser?.email}.
      </DialogDescription>
     </DialogHeader>

     <form
      onSubmit={handleEditSubmit}
      className="flex min-h-0 flex-1 flex-col"
     >
      <div className="flex-1 space-y-4 overflow-y-auto py-2 pr-1">

       <div className="space-y-2">
        <Label>E-mail</Label>

        <Input
         value={editingUser?.email||''}
         disabled
         className="bg-muted text-muted-foreground"
        />
       </div>

       <div className="space-y-3 border-t border-border pt-4">
        <div>
         <h3 className="font-semibold">
          Módulos & Compartilhamento
         </h3>

         <p className="text-sm text-muted-foreground">
          Defina os acessos e o compartilhamento de dados.
         </p>
        </div>

        {AVAILABLE_MODULES.map(module=>{
         const allowed=hasModule(
          editFormData.modules,
          module.id
         );

         const shared=
          editFormData.sharingPreferences[module.id]!==false;

         const selectedSubs=allowed
          ?getSelectedSubmodules(
           editFormData.modules,
           module.id
          )
          :[];

         return(
          <div
           key={module.id}
           className={`rounded-xl border p-3 ${
            allowed
             ?'border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.04)]'
             :'border-border bg-muted/20'
           }`}
          >
           <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
             <Checkbox
              id={`edit-${module.id}`}
              checked={allowed}
              onCheckedChange={()=>handleModuleToggle(module)}
             />

             <div>
              <Label
               htmlFor={`edit-${module.id}`}
               className="cursor-pointer font-medium"
              >
               {module.label}
              </Label>

              {selectedSubs.length>0&&(
               <p className="mt-1 text-[10px] text-[hsl(var(--neon-pessoal))]">
                Acesso: {selectedSubs.join(', ')}
               </p>
              )}
             </div>
            </div>

            <div className="flex items-center gap-2">
             {allowed&&module.submodules&&(
              <Button
               type="button"
               variant="ghost"
               size="sm"
               className="h-7 px-2 text-xs"
               onClick={()=>setSubModalConfig({
                isOpen:true,
                module
               })}
              >
               Alterar
               <ChevronRight className="ml-1 h-3 w-3"/>
              </Button>
             )}

             <Badge
              variant="outline"
              className={
               allowed
                ?'border-blue-500/30 bg-blue-500/10 text-blue-400'
                :'border-red-500/30 bg-red-500/10 text-red-400'
              }
             >
              {allowed?'LIBERADO':'RESTRITO'}
             </Badge>
            </div>
           </div>

           {allowed&&(
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
             <div className="flex items-center text-xs text-muted-foreground">
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-[hsl(var(--neon-pessoal))]"/>
              Compartilhar dados com ADM Mestre?
             </div>

             <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${
               shared?'text-muted-foreground':'text-red-400'
              }`}>
               NÃO
              </span>

              <Switch
               checked={shared}
               onCheckedChange={value=>
                handleSharingToggle(
                 module.id,
                 value
                )
               }
              />

              <span className={`text-[10px] font-bold ${
               shared?'text-emerald-400':'text-muted-foreground'
              }`}>
               SIM
              </span>
             </div>
            </div>
           )}
          </div>
         );
        })}
       </div>
      </div>

      <DialogFooter className="mt-3 border-t border-border/50 pt-4">
       <DialogClose asChild>
        <Button
         type="button"
         variant="outline"
         disabled={saving}
        >
         Cancelar
        </Button>
       </DialogClose>

       <Button
        type="submit"
        disabled={saving}
        className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
       >
        {saving&&(
         <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
        )}
        Salvar Alterações
       </Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   {subModalConfig.module&&(
    <SubModuleSelectionModal
     isOpen={subModalConfig.isOpen}
     onClose={()=>setSubModalConfig({
      isOpen:false,
      module:null
     })}
     moduleName={subModalConfig.module.label}
     availableSubModules={
      subModalConfig.module.submodules||[]
     }
     initialSelected={getSelectedSubmodules(
      editFormData.modules,
      subModalConfig.module.id
     )}
     initialRealtime={
      editFormData.sharingPreferences[
       `${subModalConfig.module.id}_realtime`
      ]||false
     }
     onConfirm={handleSubModuleConfirm}
    />
   )}

   <AlertDialog
    open={forceDeleteData.isOpen}
    onOpenChange={open=>{
     if(!isForceDeleting){
      setForceDeleteData(prev=>({
       ...prev,
       isOpen:open
      }));
     }
    }}
   >
    <AlertDialogContent className="dark-pessoal border-red-500/40 bg-card">
     <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-red-400">
       <AlertTriangle className="h-5 w-5"/>
       Dados relacionados encontrados
      </AlertDialogTitle>

      <AlertDialogDescription className="space-y-4 pt-2">
       <p>
        O usuário{' '}
        <strong>{forceDeleteData.user?.email}</strong>{' '}
        possui dados relacionados nas seguintes tabelas:
       </p>

       <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
        <ul className="space-y-1 text-xs text-muted-foreground">
         {forceDeleteData.tables.map(table=>(
          <li key={table}>
           • {table}
          </li>
         ))}
        </ul>
       </div>

       <p className="font-medium text-red-400">
        Deseja remover todos os dados vinculados antes de
        excluir o usuário? Esta ação é irreversível.
       </p>
      </AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel
       disabled={isForceDeleting}
      >
       Cancelar
      </AlertDialogCancel>

      <Button
       onClick={executeForceDelete}
       disabled={isForceDeleting}
       variant="destructive"
      >
       {isForceDeleting?(
        <>
         <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
         Processando...
        </>
       ):(
        <>
         <Trash className="mr-2 h-4 w-4"/>
         Remover Tudo e Deletar
        </>
       )}
      </Button>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </div>
 );
};

export default GerenciarUsuarios;
