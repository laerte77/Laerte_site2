import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{motion}from'framer-motion';
import{Helmet}from'react-helmet';
import{User,Lock,Mail,ArrowLeft,UserPlus,Shield,Church,Printer,Gamepad2,AlertCircle,CheckCircle2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{Checkbox}from'@/components/ui/checkbox';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{verifyUserSystemStatus}from'@/lib/userVerificationUtils';

const modules=[
 {id:'pessoal',name:'Pessoal',icon:User},
 {id:'lm-impressoes',name:'LM Impressões',icon:Printer},
 {id:'igreja',name:'Igreja',icon:Church},
 {id:'entretenimento',name:'Entretenimento',icon:Gamepad2}
];

const Register=()=>{
 const navigate=useNavigate(),{toast}=useToast();
 const{user:adminUser,session:adminSession}=useAuth();
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[masterPassword,setMasterPassword]=useState('');
 const[selectedModules,setSelectedModules]=useState([]),[loading,setLoading]=useState(false),[formError,setFormError]=useState(''),[formSuccess,setFormSuccess]=useState('');

 const handleModuleChange=id=>{
  setFormError('');
  setSelectedModules(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 };

 const handleRegister=async e=>{
  e.preventDefault();setFormError('');setFormSuccess('');
  if(!email||!password||!masterPassword)return setFormError('Preencha todos os campos obrigatórios.');
  if(password.length<6)return setFormError('A senha do novo usuário deve ter no mínimo 6 caracteres.');
  setLoading(true);
  try{
   const status=await verifyUserSystemStatus(email);
   if(status.existsInSystemTable){setFormError('Este e-mail já está cadastrado no sistema.');return;}
   const{error:masterError}=await supabase.auth.signInWithPassword({email:adminUser.email,password:masterPassword});
   if(masterError){setFormError('Senha do administrador inválida.');return}
   const{data:newUser,error:signUpError}=await supabase.auth.signUp({email,password,options:{data:{allowed_modules:selectedModules}}});
   await supabase.auth.setSession(adminSession);
   if(signUpError){let msg=signUpError.message;if(msg.includes('already registered'))msg='E-mail já está em uso.';throw new Error(msg)}
   if(newUser?.user){
    const now=new Date().toISOString(),initialModules=selectedModules;
    const{error:dbError}=await supabase.from('usuarios_sistema').insert([{id:newUser.user.id,email:newUser.user.email,modulos_acesso:initialModules,criado_em:now,atualizado_em:now}]);
    if(dbError&&dbError.code!=='23505')throw new Error('Erro ao criar perfil de sistema para o usuário.');
    await supabase.from('profiles').update({allowed_modules:initialModules}).eq('id',newUser.user.id);
   }
   setFormSuccess('Novo usuário cadastrado com sucesso! O sistema foi sincronizado.');
   toast({title:'Sucesso!',description:'Usuário cadastrado com sucesso.',className:'bg-[hsl(var(--neon-cyan))] text-[hsl(var(--background))] border-none'});
   setTimeout(()=>navigate('/pessoal/dashboard/admin/gerenciar-usuarios'),2000);
  }catch(err){
   console.error('[Register] Erro durante o cadastro:',err);
   setFormError(err.message||'Falha ao realizar o cadastro. Tente novamente.');
   toast({title:'Erro no Cadastro',description:err.message,variant:'destructive'});
  }finally{setLoading(false)}
 };

 return <>
  <Helmet><title>Cadastro - Sistema Empresarial</title><meta name="description" content="Cadastre um novo usuário no sistema"/></Helmet>

  <main className="flex min-h-screen items-center justify-center bg-gradient-professional p-4 text-[hsl(var(--text-primary))]">
   <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-10"/>

   <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} transition={{duration:.4}} className="z-10 w-full max-w-lg motion-reduce:transform-none">
    <Button type="button" variant="ghost" onClick={()=>navigate(-1)} disabled={loading} aria-label="Voltar" className="absolute left-4 top-4 text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--card-bg))] hover:text-[hsl(var(--text-primary))]">
     <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true"/>Voltar
    </Button>

    <div className="rounded-2xl border neon-border-cyan bg-[hsl(var(--card-bg))]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
     <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[hsl(var(--neon-cyan))]/30 bg-[hsl(var(--neon-cyan))]/10 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)]">
       <UserPlus className="h-10 w-10 text-[hsl(var(--neon-cyan))]" aria-hidden="true"/>
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">Cadastrar Novo Usuário</h1>
      <p className="mt-2 text-sm text-[hsl(var(--text-secondary))] sm:text-base">Crie uma nova conta e defina os módulos permitidos</p>
     </div>

     {formError&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mb-6 flex items-start gap-3 rounded-lg border border-[hsl(var(--destructive))]/50 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]" role="alert"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true"/><span>{formError}</span></motion.div>}

     {formSuccess&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mb-6 flex items-start gap-3 rounded-lg border border-[hsl(var(--neon-cyan))]/50 bg-[hsl(var(--neon-cyan))]/10 px-4 py-3 text-sm text-[hsl(var(--neon-cyan))]" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true"/><span>{formSuccess}</span></motion.div>}

     <form onSubmit={handleRegister} className="space-y-6">
      <fieldset className="rounded-lg border border-[hsl(var(--border-dark))] bg-[hsl(var(--background))]/30 p-4">
       <legend className="px-2 text-sm font-medium text-[hsl(var(--text-secondary))]">Dados do Novo Usuário</legend>
       <div className="space-y-4 pt-2">
        {[['email','Email do Novo Usuário',email,setEmail,Mail],['password','Senha do Novo Usuário (mínimo 6 char)',password,setPassword,Lock]].map(([type,placeholder,value,setter,Icon])=><div className="relative" key={type}>
         <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" aria-hidden="true"/>
         <Input type={type} placeholder={placeholder} value={value} onChange={e=>{setter(e.target.value);setFormError('')}} className="pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--neon-cyan))]" disabled={loading||formSuccess} required/>
        </div>)}
       </div>
      </fieldset>

      <div>
       <Label className="mb-3 block text-base font-semibold text-[hsl(var(--text-secondary))]">Módulos Iniciais (Opcional)</Label>
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {modules.map(({id,name,icon:Icon})=><div key={id} className="flex items-center space-x-3 rounded-lg border border-[hsl(var(--border-dark))] bg-[hsl(var(--input-bg))] p-3 transition-[border-color,background-color] duration-200 hover:border-[hsl(var(--neon-cyan))]/50 motion-reduce:transition-none">
         <Checkbox id={id} onCheckedChange={()=>handleModuleChange(id)} disabled={loading||formSuccess} className="border-[hsl(var(--text-tertiary))] data-[state=checked]:bg-[hsl(var(--neon-cyan))] data-[state=checked]:text-[hsl(var(--background))]"/>
         <label htmlFor={id} className="flex cursor-pointer items-center text-sm font-medium text-[hsl(var(--text-primary))]"><Icon className="mr-2 h-4 w-4 text-[hsl(var(--text-tertiary))]" aria-hidden="true"/>{name}</label>
        </div>)}
       </div>
       <p className="mt-2 text-xs text-[hsl(var(--text-tertiary))]">Se nenhum módulo for selecionado, a conta iniciará vazia e os módulos poderão ser adicionados posteriormente pelo painel administrativo.</p>
      </div>

      <fieldset className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 p-4">
       <legend className="flex items-center px-2 text-sm font-medium text-[hsl(var(--destructive))]"><Shield className="mr-2 h-4 w-4" aria-hidden="true"/>Autorização do Administrador</legend>
       <div className="space-y-4 pt-2">
        <div className="relative"><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" aria-hidden="true"/><Input type="email" placeholder="Email do Administrador" value={adminUser?.email||''} className="pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] opacity-70" disabled/></div>
        <div className="relative"><Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" aria-hidden="true"/><Input type="password" placeholder="Sua Senha de Administrador" value={masterPassword} onChange={e=>{setMasterPassword(e.target.value);setFormError('')}} className="pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--destructive))]" disabled={loading||formSuccess} required/></div>
       </div>
      </fieldset>

      <Button type="submit" disabled={loading||formSuccess} className="min-h-11 w-full bg-[hsl(var(--neon-cyan))] text-base font-bold text-[hsl(var(--background))] shadow-[0_0_15px_hsl(var(--neon-cyan)/0.4)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[hsl(var(--neon-cyan))]/90 hover:-translate-y-px motion-reduce:transition-none motion-reduce:transform-none">
       {loading?'Processando Cadastro...':'Cadastrar Usuário'}
      </Button>
     </form>
    </div>
   </motion.div>
  </main>
 </>;
};

export default Register;
