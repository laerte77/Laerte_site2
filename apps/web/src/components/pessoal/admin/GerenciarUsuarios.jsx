import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash, Users, Loader2, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';
import { getAllUsers, updateUserModules, deleteUser } from '@/lib/adminUtils';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import SubModuleSelectionModal from './SubModuleSelectionModal';

const AVAILABLE_MODULES = [
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'igreja', label: 'Igreja', submodules: ['Tesouraria', 'Secretaria'] },
  { id: 'lm-impressoes', label: 'Lanhouse' },
  { id: 'entretenimento', label: 'Entretenimento' },
  { id: 'barbearia', label: 'Barbearia' }
];

const getBaseModuleId = (modString) => typeof modString === 'string' ? modString.split(':')[0] : modString;

const hasModule = (modulesArray, modId) => {
    return modulesArray.some(m => {
        if (typeof m === 'string') return getBaseModuleId(m).toLowerCase() === modId.toLowerCase();
        if (typeof m === 'object' && m !== null && !Array.isArray(m)) {
            return Object.keys(m).map(k => k.toLowerCase()).includes(modId.toLowerCase());
        }
        return false;
    });
};

const getSelectedSubmodules = (modulesArray, modId) => {
    const stringMatches = modulesArray
        .filter(m => typeof m === 'string' && getBaseModuleId(m).toLowerCase() === modId.toLowerCase() && m.includes(':'))
        .map(m => {
            const sub = m.split(':')[1];
            return sub.charAt(0).toUpperCase() + sub.slice(1);
        });

    if (stringMatches.length > 0) return stringMatches;
    
    for (const m of modulesArray) {
        if (typeof m === 'object' && m !== null && !Array.isArray(m)) {
            const key = Object.keys(m).find(k => k.toLowerCase() === modId.toLowerCase());
            if (key && Array.isArray(m[key]) && m[key].length > 0) {
                return m[key];
            }
        }
    }
    return [];
};

const GerenciarUsuarios = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ modules: [], sharingPreferences: {} });
  const [saving, setSaving] = useState(false);

  const [subModalConfig, setSubModalConfig] = useState({ isOpen: false, module: null });

  const [deletingId, setDeletingId] = useState(null);
  const [forceDeleteData, setForceDeleteData] = useState({ isOpen: false, user: null, tables: [] });
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.users || []);
      }
    } catch (error) {
      toast({ 
        title: "Erro ao buscar usuários", 
        description: error.message || "Falha na comunicação com o servidor.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    let normalizedModules = [];
    if (Array.isArray(user.modulos_acesso)) {
        user.modulos_acesso.forEach(m => {
            if (typeof m === 'string') {
                normalizedModules.push(m);
            } else if (typeof m === 'object' && m !== null) {
                const key = Object.keys(m)[0];
                if (Array.isArray(m[key]) && m[key].length > 0) {
                    m[key].forEach(sub => {
                        normalizedModules.push(`${key.toLowerCase()}:${sub.toLowerCase()}`);
                    });
                } else {
                    normalizedModules.push(key.toLowerCase());
                }
            }
        });
    }

    setEditFormData({
      modules: normalizedModules,
      sharingPreferences: user.data_sharing_preferences || {}
    });
    setEditOpen(true);
  };

  const handleModuleToggle = (moduleDef) => {
    const modId = moduleDef.id;
    const isCurrentlyAllowed = hasModule(editFormData.modules, modId);

    if (isCurrentlyAllowed) {
        setEditFormData(prev => ({
            ...prev,
            modules: prev.modules.filter(m => getBaseModuleId(m).toLowerCase() !== modId.toLowerCase())
        }));
    } else {
        if (moduleDef.submodules && moduleDef.submodules.length > 0) {
            setSubModalConfig({ isOpen: true, module: moduleDef });
        } else {
            setEditFormData(prev => {
                const newSharing = { ...prev.sharingPreferences };
                if (newSharing[modId] === undefined) {
                    newSharing[modId] = true;
                }
                return { ...prev, modules: [...prev.modules, modId], sharingPreferences: newSharing };
            });
        }
    }
  };

  const handleSubModuleConfirm = (selectedSubModules, realtime) => {
      const moduleDef = subModalConfig.module;
      if (!moduleDef || !selectedSubModules || selectedSubModules.length === 0) return;

      const newModStrings = selectedSubModules.map(sub => `${moduleDef.id}:${sub.toLowerCase()}`);

      setEditFormData(prev => {
          const cleanModules = prev.modules.filter(m => getBaseModuleId(m).toLowerCase() !== moduleDef.id.toLowerCase());
          
          const newSharing = { ...prev.sharingPreferences };
          if (newSharing[moduleDef.id] === undefined) {
              newSharing[moduleDef.id] = true;
          }
          newSharing[`${moduleDef.id}_realtime`] = realtime;

          return {
              ...prev,
              modules: [...cleanModules, ...newModStrings],
              sharingPreferences: newSharing
          };
      });
      setSubModalConfig({ isOpen: false, module: null });
  };

  const handleSharingToggle = (moduleId, value) => {
    setEditFormData(prev => ({
      ...prev,
      sharingPreferences: {
        ...prev.sharingPreferences,
        [moduleId]: value
      }
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserModules(editingUser.id, editingUser.email, null, editFormData.modules, editFormData.sharingPreferences);
      
      // Feedback ensures admin that the permissions were synchronized correctly
      toast({ 
        title: "Sucesso!", 
        description: "Permissões do usuário atualizadas com sucesso. Elas serão sincronizadas via Realtime.", 
        className: "bg-green-500 text-white border-none" 
      });
      
      setEditOpen(false);
      fetchUsers();
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleInitialDelete = async (user) => {
    setDeletingId(user.id);
    try {
      const response = await deleteUser(user.id, false);
      
      if (response.status === 409) {
        setForceDeleteData({
          isOpen: true,
          user: user,
          tables: response.tables || []
        });
      } else if (response.success) {
        toast({ title: "Sucesso!", description: "Usuário excluído permanentemente.", className: "bg-green-500 text-white border-none" });
        fetchUsers();
      }
    } catch (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const executeForceDelete = async () => {
    if (!forceDeleteData.user) return;
    
    setIsForceDeleting(true);
    try {
      const response = await deleteUser(forceDeleteData.user.id, true);
      if (response.success) {
        toast({ title: "Sucesso!", description: "Usuário e todos os seus dados foram excluídos permanentemente.", className: "bg-green-500 text-white border-none" });
        setForceDeleteData({ isOpen: false, user: null, tables: [] });
        fetchUsers();
      }
    } catch (error) {
      toast({ title: "Erro ao excluir dados", description: error.message, variant: "destructive" });
    } finally {
      setIsForceDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Gerenciar Usuários</h2>
                <p className="text-muted-foreground">Visualize e edite acessos e compartilhamentos de dados.</p>
            </div>
        </div>
        <Button onClick={() => navigate('/pessoal/dashboard/admin/criar-usuario')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Criar Novo Usuário
        </Button>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="dark-pessoal bg-card border-border text-foreground sm:max-w-[550px] flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-primary text-xl">Editar Permissões</DialogTitle>
            <DialogDescription>Ajuste os módulos liberados e as opções de compartilhamento para {editingUser?.email}</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2 py-2 space-y-4">
              <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editingUser?.email || ''} disabled className="bg-muted text-muted-foreground opacity-70" />
              </div>
              <div className="pt-2">
                <Label className="text-base font-semibold mb-3 block">Módulos & Compartilhamento</Label>
                <div className="grid grid-cols-1 gap-3 bg-muted/30 p-4 rounded-lg border border-border/50">
                  {AVAILABLE_MODULES.map(module => {
                    const isAllowed = hasModule(editFormData.modules, module.id);
                    const isShared = editFormData.sharingPreferences[module.id] !== false;
                    const selectedSubs = isAllowed ? getSelectedSubmodules(editFormData.modules, module.id) : [];
                    
                    return (
                      <div key={module.id} className={`flex flex-col p-3 rounded-lg border transition-colors ${isAllowed ? 'bg-primary/5 border-primary/20' : 'bg-background border-border/50'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Checkbox 
                                    id={`edit-${module.id}`} 
                                    checked={isAllowed} 
                                    onCheckedChange={() => handleModuleToggle(module)} 
                                    className="border-primary data-[state=checked]:bg-primary"
                                />
                                <div className="flex flex-col">
                                    <Label htmlFor={`edit-${module.id}`} className="text-sm font-medium cursor-pointer">{module.label}</Label>
                                    {isAllowed && module.submodules && selectedSubs.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground mt-0.5 font-bold text-primary">
                                            Acesso: {selectedSubs.join(', ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                                <Badge variant={isAllowed ? 'default' : 'destructive'} className={isAllowed ? 'bg-blue-500 hover:bg-blue-600 border-none text-white' : ''}>
                                    {isAllowed ? 'LIBERADO' : 'RESTRITO'}
                                </Badge>
                            </div>
                        </div>
                        {isAllowed && (
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/10">
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <ShieldAlert className="w-3.5 h-3.5 mr-1 text-primary/60"/>
                                    Compartilhar dados com ADM Mestre?
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] font-bold ${!isShared ? 'text-red-500' : 'text-muted-foreground'}`}>NÃO</span>
                                    <Switch 
                                        checked={isShared}
                                        onCheckedChange={(c) => handleSharingToggle(module.id, c)}
                                        className="scale-75"
                                    />
                                    <span className={`text-[10px] font-bold ${isShared ? 'text-green-500' : 'text-muted-foreground'}`}>SIM</span>
                                </div>
                            </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 mt-2 border-t border-border/50">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {subModalConfig.module && (
          <SubModuleSelectionModal 
              isOpen={subModalConfig.isOpen}
              onClose={() => setSubModalConfig({ isOpen: false, module: null })}
              moduleName={subModalConfig.module.label}
              availableSubModules={subModalConfig.module.submodules || []}
              initialSelected={getSelectedSubmodules(editFormData.modules, subModalConfig.module.id)}
              initialRealtime={editFormData.sharingPreferences[`${subModalConfig.module.id}_realtime`] || false}
              onConfirm={handleSubModuleConfirm}
          />
      )}

      <AlertDialog open={forceDeleteData.isOpen} onOpenChange={(isOpen) => !isForceDeleting && setForceDeleteData(prev => ({ ...prev, isOpen }))}>
        <AlertDialogContent className="dark-pessoal border-red-500/50 bg-slate-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500 text-xl">
              <AlertTriangle className="w-6 h-6" /> Atenção: Dados Relacionados
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 space-y-4 pt-2">
              <p>Este usuário (<strong>{forceDeleteData.user?.email}</strong>) possui dados ativos relacionados no sistema nas seguintes tabelas:</p>
              
              <div className="bg-slate-900 border border-slate-800 rounded-md p-3 max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-slate-400 font-mono">
                  {forceDeleteData.tables.map(table => (
                    <li key={table}>{table}</li>
                  ))}
                </ul>
              </div>

              <p className="text-red-400 font-medium">Deseja remover TODOS os dados vinculados a este usuário antes de deletá-lo? Esta ação é irreversível.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isForceDeleting} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancelar
            </AlertDialogCancel>
            <Button 
              onClick={executeForceDelete} 
              disabled={isForceDeleting} 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isForceDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando Deleção...</>
              ) : (
                <><Trash className="w-4 h-4 mr-2" /> Remover Tudo e Deletar</>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
                <tr className="bg-muted/50 border-b border-border">
                    <th className="p-4 font-semibold text-muted-foreground w-1/4">Email do Usuário</th>
                    <th className="p-4 font-semibold text-muted-foreground">Módulos & Compartilhamento</th>
                    <th className="p-4 font-semibold text-muted-foreground text-right w-24">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                  <tr><td colSpan="3" className="p-12 text-center text-muted-foreground"><Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" /> Carregando usuários...</td></tr>
              ) : users.length === 0 ? (
                  <tr><td colSpan="3" className="p-12 text-center text-muted-foreground"><Users className="mx-auto w-10 h-10 mb-2 opacity-50" />Nenhum usuário cadastrado no sistema.</td></tr>
              ) : (
                users.map(user => {
                  const safeModules = Array.isArray(user.modulos_acesso) ? user.modulos_acesso : [];
                  
                  // Group submodules by base module for display
                  const displayModules = {};
                  safeModules.forEach(mod => {
                      if (typeof mod === 'string') {
                          if (mod.includes(':')) {
                              const [base, sub] = mod.split(':');
                              if (!displayModules[base]) displayModules[base] = [];
                              displayModules[base].push(sub.charAt(0).toUpperCase() + sub.slice(1));
                          } else {
                              if (!displayModules[mod]) displayModules[mod] = [];
                          }
                      } else if (typeof mod === 'object' && mod !== null) {
                          const key = Object.keys(mod)[0];
                          if (!displayModules[key]) displayModules[key] = [];
                          if (Array.isArray(mod[key])) {
                              displayModules[key].push(...mod[key]);
                          }
                      }
                  });

                  return (
                  <tr key={user.id} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{user.email}</td>
                    <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(displayModules).length > 0 ? (
                                Object.entries(displayModules).map(([modName, subs], idx) => {
                                    const subDetails = subs.length > 0 ? ` (${subs.join(', ')})` : "";
                                    const modKeyForSharing = modName.toLowerCase().replace('-', '_');
                                    const isShared = user.data_sharing_preferences?.[modKeyForSharing] !== false;

                                    return (
                                        <div key={idx} className="flex flex-col items-center p-1.5 border border-border/50 rounded-md bg-background/50 max-w-[150px]">
                                            <Badge variant="secondary" className="uppercase text-[10px] tracking-wider bg-primary/10 text-primary border-primary/20 mb-1 w-full justify-center truncate text-center" title={`${modName}${subDetails}`}>
                                                {modName}
                                                {subDetails && <span className="opacity-70 ml-1 truncate">{subDetails}</span>}
                                            </Badge>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold w-full text-center tracking-widest ${isShared ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                COMPART: {isShared ? 'SIM' : 'NÃO'}
                                            </span>
                                        </div>
                                    )
                                })
                            ) : (
                                <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Acesso Totalmente Restrito</Badge>
                            )}
                        </div>
                    </td>
                    <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditClick(user)} 
                              className="h-8 px-2 hover:bg-blue-500/10 hover:text-blue-500" 
                              title="Gerenciar Permissões"
                              disabled={deletingId === user.id}
                            >
                                <Edit className="w-4 h-4" />
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 px-2 hover:bg-red-500/10 hover:text-red-500 relative"
                                      disabled={deletingId === user.id}
                                    >
                                        {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash className="w-4 h-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="dark-pessoal">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-500">Excluir Usuário</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja excluir o usuário <strong>{user.email}</strong>? O sistema verificará se há dados vinculados.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleInitialDelete(user)} className="bg-red-600 hover:bg-red-700 text-white">
                                            Sim, Continuar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default GerenciarUsuarios;