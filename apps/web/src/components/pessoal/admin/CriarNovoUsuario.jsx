import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{
 UserPlus,Save,X,AlertCircle,CheckCircle2,Loader2,ChevronRight
}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Checkbox}from'@/components/ui/checkbox';
import{Switch}from'@/components/ui/switch';
import{useToast}from'@/components/ui/use-toast';
import{createUserWithModules}from'@/lib/adminUtils';
import{verifyUserSystemStatus}from'@/lib/userVerificationUtils';
import{normalizeEmail}from'@/lib/normalizeEmail';
import{Card,CardContent,CardHeader,CardTitle,CardDescription,CardFooter}from'@/components/ui/card';
import SubModuleSelectionModal from'./SubModuleSelectionModal';

const AVAILABLE_MODULES=[
 {id:'pessoal',label:'Pessoal'},
 {id:'igreja',label:'Igreja',submodules:['Tesouraria','Secretaria']},
 {id:'lm-impressoes',label:'Lanhouse'},
 {id:'entretenimento',label:'Entretenimento'},
 {id:'barbearia',label:'Barbearia'}
];

const CriarNovoUsuario=()=>{
 const navigate=useNavigate();
 const{toast}=useToast();

 const[loading,setLoading]=useState(false);
 const[formError,setFormError]=useState('');
 const[formSuccess,setFormSuccess]=useState('');
 const[subModalConfig,setSubModalConfig]=useState({isOpen:false,module:null});

 const[formData,setFormData]=useState({
  email:'',
  password:'',
  confirmPassword:'',
  modules:[],
  sharingPreferences:{}
 });

 const getBaseModuleId=mod=>
  typeof mod==='string'?mod.split(':')[0]:mod;

 const hasModule=moduleId=>
  formData.modules.some(
   mod=>getBaseModuleId(mod)===moduleId
  );

 const getSelectedSubmodules=moduleId=>
  formData.modules
   .filter(
    mod=>getBaseModuleId(mod)===moduleId&&mod.includes(':')
   )
   .map(mod=>{
    const sub=mod.split(':')[1];
    return sub.charAt(0).toUpperCase()+sub.slice(1);
   });

 const handleModuleToggle=moduleDef=>{
  setFormError('');

  if(hasModule(moduleDef.id)){
   setFormData(prev=>({
    ...prev,
    modules:prev.modules.filter(
     mod=>getBaseModuleId(mod)!==moduleDef.id
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

  setFormData(prev=>{
   const sharing={...prev.sharingPreferences};

   if(sharing[moduleDef.id]===undefined){
    sharing[moduleDef.id]=true;
   }

   return{
    ...prev,
    modules:[...prev.modules,moduleDef.id],
    sharingPreferences:sharing
   };
  });
 };

 const handleSubModuleConfirm=(selectedSubModules,realtime)=>{
  const moduleDef=subModalConfig.module;

  if(!moduleDef||!selectedSubModules?.length)return;

  const modules=selectedSubModules.map(
   sub=>`${moduleDef.id}:${sub.toLowerCase()}`
  );

  setFormData(prev=>{
   const sharing={...prev.sharingPreferences};

   if(sharing[moduleDef.id]===undefined){
    sharing[moduleDef.id]=true;
   }

   sharing[`${moduleDef.id}_realtime`]=realtime;

   const cleaned=prev.modules.filter(
    mod=>getBaseModuleId(mod)!==moduleDef.id
   );

   return{
    ...prev,
    modules:[...cleaned,...modules],
    sharingPreferences:sharing
   };
  });

  setSubModalConfig({
   isOpen:false,
   module:null
  });
 };

 const handleSharingToggle=(moduleId,value)=>{
  setFormData(prev=>({
   ...prev,
   sharingPreferences:{
    ...prev.sharingPreferences,
    [moduleId]:value
   }
  }));
 };

 const validateForm=()=>{
  if(!formData.email||!formData.email.includes('@')){
   setFormError('Insira um e-mail válido.');
   return false;
  }

  if(formData.password.length<6){
   setFormError('A senha deve ter pelo menos 6 caracteres.');
   return false;
  }

  if(formData.password!==formData.confirmPassword){
   setFormError('As senhas não coincidem.');
   return false;
  }

  if(!formData.modules.length){
   setFormError('Selecione pelo menos um módulo de acesso.');
   return false;
  }

  return true;
 };

 const handleSubmit=async e=>{
  e.preventDefault();

  setFormError('');
  setFormSuccess('');

  if(!validateForm())return;

  setLoading(true);

  const email=normalizeEmail(formData.email);

  try{
   const status=await verifyUserSystemStatus(email);

   if(status.existsInSystemTable){
    setFormError('Este e-mail já está cadastrado no sistema.');
    setLoading(false);
    return;
   }

   await createUserWithModules(
    email,
    formData.password,
    formData.modules,
    formData.sharingPreferences
   );

   setFormSuccess(
    `Usuário criado com sucesso! Módulos: ${formData.modules.join(', ')}.`
   );

   toast({
    title:'Sucesso!',
    description:'Usuário cadastrado corretamente com acessos e preferências.',
    className:'bg-green-500 text-white border-none'
   });

   setTimeout(()=>{
    navigate('/pessoal/dashboard/admin/gerenciar-usuarios');
   },2500);
  }catch(error){
   let message=
    error.message||
    'Ocorreu um erro inesperado ao criar o usuário.';

   if(
    message.includes('already registered')||
    message.includes('unique constraint')
   ){
    message='Este e-mail já está em uso por outro usuário.';
   }

   setFormError(message);

   toast({
    title:'Falha na Criação',
    description:message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 };

 return(
  <div className="dark-pessoal mx-auto max-w-3xl space-y-4">

   <div className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-5">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
     <UserPlus className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
    </div>

    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
      Administração
     </p>

     <h1 className="text-2xl font-bold tracking-tight">
      Criar Novo Usuário
     </h1>

     <p className="text-sm text-muted-foreground">
      Cadastre um usuário e defina seus módulos e permissões.
     </p>
    </div>
   </div>

   <Card className="border-border bg-card">
    <form onSubmit={handleSubmit}>

     <CardHeader className="border-b border-border/50">
      <CardTitle>Dados do Usuário</CardTitle>
      <CardDescription>
       Preencha os dados de acesso e configure os módulos.
      </CardDescription>
     </CardHeader>

     <CardContent className="space-y-6 p-5">

      {formError&&(
       <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0"/>
        <span>{formError}</span>
       </div>
      )}

      {formSuccess&&(
       <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0"/>
        <span>{formSuccess}</span>
       </div>
      )}

      <div className="space-y-2">
       <Label htmlFor="email">E-mail</Label>

       <Input
        id="email"
        type="email"
        placeholder="usuario@exemplo.com"
        value={formData.email}
        onChange={e=>{
         setFormData(prev=>({
          ...prev,
          email:e.target.value
         }));
         setFormError('');
        }}
        required
        disabled={loading||!!formSuccess}
        className="bg-input"
       />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
       <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>

        <Input
         id="password"
         type="password"
         placeholder="Mínimo 6 caracteres"
         value={formData.password}
         onChange={e=>{
          setFormData(prev=>({
           ...prev,
           password:e.target.value
          }));
          setFormError('');
         }}
         required
         disabled={loading||!!formSuccess}
         className="bg-input"
        />
       </div>

       <div className="space-y-2">
        <Label htmlFor="confirmPassword">
         Confirmar Senha
        </Label>

        <Input
         id="confirmPassword"
         type="password"
         placeholder="Confirme a senha"
         value={formData.confirmPassword}
         onChange={e=>{
          setFormData(prev=>({
           ...prev,
           confirmPassword:e.target.value
          }));
          setFormError('');
         }}
         required
         disabled={loading||!!formSuccess}
         className="bg-input"
        />
       </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
       <div>
        <h2 className="text-lg font-semibold">
         Módulos de Acesso
        </h2>
        <p className="text-sm text-muted-foreground">
         Selecione os módulos disponíveis para o usuário.
        </p>
       </div>

       <div className="grid gap-3 sm:grid-cols-2">
        {AVAILABLE_MODULES.map(module=>{
         const isAllowed=hasModule(module.id);
         const selectedSubs=getSelectedSubmodules(module.id);

         return(
          <div
           key={module.id}
           className={`rounded-xl border p-4 transition-colors ${
            isAllowed
             ?'border-[hsl(var(--neon-pessoal)/.30)] bg-[hsl(var(--neon-pessoal)/.05)]'
             :'border-border bg-muted/20'
           }`}
          >
           <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
             <Checkbox
              id={`module-${module.id}`}
              checked={isAllowed}
              onCheckedChange={()=>handleModuleToggle(module)}
              disabled={loading||!!formSuccess}
             />

             <div>
              <Label
               htmlFor={`module-${module.id}`}
               className="cursor-pointer font-medium"
              >
               {module.label}
              </Label>

              {isAllowed&&selectedSubs.length>0&&(
               <p className="mt-1 text-[11px] text-[hsl(var(--neon-pessoal))]">
                Acesso: {selectedSubs.join(', ')}
               </p>
              )}
             </div>
            </div>

            {isAllowed&&module.submodules&&(
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
           </div>

           {isAllowed&&(
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
             <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Compartilhar dados
             </span>

             <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${
               formData.sharingPreferences[module.id]===false
                ?'text-red-400'
                :'text-muted-foreground'
              }`}>
               NÃO
              </span>

              <Switch
               checked={formData.sharingPreferences[module.id]!==false}
               onCheckedChange={value=>handleSharingToggle(
                module.id,
                value
               )}
               disabled={loading||!!formSuccess}
              />

              <span className={`text-[10px] font-bold ${
               formData.sharingPreferences[module.id]!==false
                ?'text-emerald-400'
                :'text-muted-foreground'
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
     </CardContent>

     <CardFooter className="flex justify-between border-t border-border p-5">
      <Button
       type="button"
       variant="outline"
       onClick={()=>navigate(
        '/pessoal/dashboard/admin/gerenciar-usuarios'
       )}
       disabled={loading}
      >
       <X className="mr-2 h-4 w-4"/>
       Cancelar
      </Button>

      <Button
       type="submit"
       disabled={loading||!!formSuccess}
       className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
      >
       {loading?(
        <>
         <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
         Salvando...
        </>
       ):(
        <>
         <Save className="mr-2 h-4 w-4"/>
         Salvar Usuário
        </>
       )}
      </Button>
     </CardFooter>
    </form>
   </Card>

   {subModalConfig.module&&(
    <SubModuleSelectionModal
     isOpen={subModalConfig.isOpen}
     onClose={()=>setSubModalConfig({
      isOpen:false,
      module:null
     })}
     moduleName={subModalConfig.module.label}
     availableSubModules={subModalConfig.module.submodules||[]}
     initialSelected={getSelectedSubmodules(
      subModalConfig.module.id
     )}
     initialRealtime={
      formData.sharingPreferences[
       `${subModalConfig.module.id}_realtime`
      ]||false
     }
     onConfirm={handleSubModuleConfirm}
    />
   )}
  </div>
 );
};

export default CriarNovoUsuario;
