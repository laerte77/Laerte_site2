import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const SubModuleSelectionModal = ({ isOpen, onClose, moduleName, availableSubModules, initialSelected = [], initialRealtime = false, onConfirm }) => {
    const [selected, setSelected] = useState([]);
    const [realtime, setRealtime] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelected(Array.isArray(initialSelected) ? initialSelected : []);
            setRealtime(initialRealtime);
        }
    }, [isOpen, initialSelected, initialRealtime]);

    const handleToggle = (subMod) => {
        setSelected(prev => 
            prev.includes(subMod) ? prev.filter(item => item !== subMod) : [...prev, subMod]
        );
    };

    const handleConfirm = () => {
        if (selected.length === 0) return;
        onConfirm(selected, realtime);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px] dark-pessoal bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-primary text-xl">Sub-Módulos: {moduleName}</DialogTitle>
                    <DialogDescription>
                        Selecione os sub-módulos que o usuário poderá acessar dentro de {moduleName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-3">
                        {availableSubModules.map(subMod => (
                            <div key={subMod} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleToggle(subMod)}>
                                <Checkbox 
                                    id={`submod-${subMod}`} 
                                    checked={selected.includes(subMod)}
                                    onCheckedChange={() => handleToggle(subMod)}
                                />
                                <div className="space-y-1 leading-none flex-1">
                                    <Label htmlFor={`submod-${subMod}`} className="text-sm font-medium cursor-pointer">
                                        {subMod}
                                    </Label>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-md border bg-muted/20 mt-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Compartilhar em tempo real</Label>
                            <p className="text-xs text-muted-foreground">Sincronizar dados em tempo real</p>
                        </div>
                        <Switch 
                            checked={realtime}
                            onCheckedChange={setRealtime}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={selected.length === 0} className="bg-primary hover:bg-primary/90 text-white">
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SubModuleSelectionModal;