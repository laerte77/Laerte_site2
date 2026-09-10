import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Save, X, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { createUserWithModules } from '@/lib/adminUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { verifyUserSystemStatus } from '@/lib/userVerificationUtils';
import { normalizeEmail } from '@/lib/normalizeEmail';
import SubModuleSelectionModal from './SubModuleSelectionModal';

const AVAILABLE_MODULES = [
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'igreja', label: 'Igreja', submodules: ['Tesouraria', 'Secretaria'] },
  { id: 'lm-impressoes', label: 'Lanhouse' },
  { id: 'entretenimento', label: 'Entretenimento' },
  { id: 'barbearia', label: 'Barbearia' }
];

const CriarNovoUsuario = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  const [subModalConfig, setSubModalConfig] = useState({ isOpen: false, module: null });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    modules: [],
    sharingPreferences: {}
  });

  const getBaseModuleId = (modString) => typeof modString === 'string' ? modString.split(':')[0] : modString;

  const hasModule = (moduleId) => {
    return formData.modules.some(m => getBaseModuleId(m) === moduleId);
  };

  const getSelectedSubmodules = (moduleId) => {
      return formData.modules
        .filter(m => getBaseModuleId(m) === moduleId && m.includes(':'))
        .map(m => {
            const sub = m.split(':')[1];
            return sub.charAt(0).toUpperCase() + sub.slice(1);
        });
  };

  const handleModuleToggle = (moduleDef) => {
    setFormError('');
    const moduleId = moduleDef.id;
    const isCurrentlySelected = hasModule(moduleId);

    if (isCurrentlySelected) {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.filter(m => getBaseModuleId(m) !== moduleId)
      }));
    } else {
      if (moduleDef.submodules && moduleDef.submodules.length > 0) {
          setSubModalConfig({ isOpen: true, module: moduleDef });
      } else {
          setFormData(prev => {
            const newSharing = { ...prev.sharingPreferences };
            if (newSharing[moduleId] === undefined) {
               newSharing[moduleId] = true;
            }
            return {
              ...prev,
              modules: [...prev.modules, moduleId],
              sharingPreferences: newSharing
            };
          });
      }
    }
  };

  const handleSubModuleConfirm = (selectedSubModules, realtime) => {
      const moduleDef = subModalConfig.module;
      if (!moduleDef || !selectedSubModules || selectedSubModules.length === 0) return;

      const newModStrings = selectedSubModules.map(sub => `${moduleDef.id}:${sub.toLowerCase()}`);

      setFormData(prev => {
          const newSharing = { ...prev.sharingPreferences };
          if (newSharing[moduleDef.id] === undefined) {
              newSharing[moduleDef.id] = true;
          }
          newSharing[`${moduleDef.id}_realtime`] = realtime;
          
          const cleanedModules = prev.modules.filter(m => getBaseModuleId(m) !== moduleDef.id);
          
          return {
              ...prev,
              modules: [...cleanedModules, ...newModStrings],
              sharingPreferences: newSharing
          };
      });
      setSubModalConfig({ isOpen: false, module: null });
  };

  const handleSharingToggle = (moduleId, value) => {
    setFormData(prev => ({
      ...prev,
      sharingPreferences: {
        ...prev.sharingPreferences,
        [moduleId]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      setFormError('Insira um e-mail válido.');
      return false;
    }
    if (formData.password.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('As senhas não coincidem.');
      return false;
    }
    if (formData.modules.length === 0) {
      setFormError('Selecione pelo menos um módulo de acesso.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!validateForm()) return;

    setLoading(true);
    const normEmail = normalizeEmail(formData.email);

    try {
      const status = await verifyUserSystemStatus(normEmail);
      if (status.existsInSystemTable) {
         setFormError('Este e-mail já está cadastrado no sistema.');
         setLoading(false);
         return;
      }

      await createUserWithModules(normEmail, formData.password, formData.modules, formData.sharingPreferences);
      
      setFormSuccess(`Usuário criado com sucesso! Módulos: ${formData.modules.join(', ')}.`);
      toast({
        title: 'Sucesso!',
        description: 'Usuário cadastrado corretamente com acessos e preferências de compartilhamento.',
        className: 'bg-green-500 text-white border-none'
      });
      
      setTimeout(() => {
        navigate('/pessoal/dashboard/admin/gerenciar-usuarios');
      }, 2500);

    } catch (error) {
      let errorMsg = error.message || 'Ocorreu um erro inesperado ao criar o usuário.';
      if (errorMsg.includes("already registered") || errorMsg.includes("unique constraint")) {
        errorMsg = "Este e-mail já está em uso por outro usuário.";
      }
      setFormError(errorMsg);
      toast({ title: 'Falha na Criação', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Criar Novo Usuário</h2>
          <p className="text-muted-foreground">Cadastre um novo usuário e defina seus acessos e compartilhamentos.</p>
        </div>
      </div>

      <Card className="border-border bg-card shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
            <CardDescription>Preencha as informações e restrições do novo usuário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {formError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="usuario@exemplo.com" 
                  value={formData.email}
                  onChange={(e) => { setFormData({...formData, email: e.target.value}); setFormError(''); }}
                  required
                  disabled={loading || formSuccess}
                  className="bg-background/50 border-input text-foreground"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    value={formData.password}
                    onChange={(e) => { setFormData({...formData, password: e.target.value}); setFormError(''); }}
                    required
                    disabled={loading || formSuccess}
                    className="bg-background/50 border-input text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Confirme a senha" 
                    value={formData.confirmPassword}
                    onChange={(e) => { setFormData({...formData, confirmPassword: e.target.value}); setFormError(''); }}
                    required
                    disabled={loading || formSuccess}
                    className="bg-background/50 border-input text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-semibold mb-3">Módulos de Acesso & Compartilhamento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AVAILABLE_MODULES.map((module) => {
                  const isAllowed = hasModule(module.id);
                  const selectedSubs = getSelectedSubmodules(module.id);

                  return (
                  <div key={module.id} className={`flex flex-col p-4 rounded-lg border transition-colors ${isAllowed ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`module-${module.id}`} 
                            checked={isAllowed}
                            onCheckedChange={() => handleModuleToggle(module)}
                            className="border-primary data-[state=checked]:bg-primary"
                            disabled={loading || formSuccess}
                          />
                          <div className="flex flex-col">
                              <Label htmlFor={`module-${module.id}`} className="text-sm font-medium cursor-pointer">
                                {module.label}
                              </Label>
                              {isAllowed && selectedSubs.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground mt-0.5 font-bold text-primary">
                                      Acesso: {selectedSubs.join(', ')}
                                  </span>
                              )}
                          </div>
                      </div>
                      {isAllowed && module.submodules && (
                          <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] px-2 py-0 border border-primary/20"
                              onClick={() => setSubModalConfig({ isOpen: true, module })}
                          >
                              Alterar <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                      )}
                    </div>
                    
                    {isAllowed && (
                      <div className="flex items-center justify-between pl-7 pt-2 mt-1 border-t border-primary/10">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Compartilhar Dados:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold ${!formData.sharingPreferences[module.id] ? 'text-red-500' : 'text-muted-foreground'}`}>NÃO</span>
                          <Switch 
                            checked={formData.sharingPreferences[module.id] !== false}
                            onCheckedChange={(c) => handleSharingToggle(module.id, c)}
                            disabled={loading || formSuccess}
                            className="scale-75"
                          />
                          <span className={`text-[10px] font-bold ${formData.sharingPreferences[module.id] !== false ? 'text-green-500' : 'text-muted-foreground'}`}>SIM</span>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/pessoal/dashboard/admin/gerenciar-usuarios')}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" disabled={loading || formSuccess} className="bg-primary hover:bg-primary/90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Usuário</>}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {subModalConfig.module && (
          <SubModuleSelectionModal 
              isOpen={subModalConfig.isOpen}
              onClose={() => setSubModalConfig({ isOpen: false, module: null })}
              moduleName={subModalConfig.module.label}
              availableSubModules={subModalConfig.module.submodules || []}
              initialSelected={getSelectedSubmodules(subModalConfig.module.id)}
              initialRealtime={formData.sharingPreferences[`${subModalConfig.module.id}_realtime`] || false}
              onConfirm={handleSubModuleConfirm}
          />
      )}
    </motion.div>
  );
};

export default CriarNovoUsuario;