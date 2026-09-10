import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Check, Edit2 } from 'lucide-react';

export default function EntradaCard({ realValue, prevValue, periodFilter, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(prevValue);
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const diff = prevValue - realValue;
    
    useEffect(() => {
        setEditValue(prevValue);
    }, [prevValue]);

    const handleSave = async () => {
        if (!user) return;
        const val = Number(editValue);
        const userIdToMod = isAdmin ? (await supabase.rpc('get_admin_id')).data || user.id : user.id;

        try {
            const { data: existing } = await supabase
                .from('pessoal_orcamento_salario_previsto')
                .select('id')
                .eq('user_id', userIdToMod)
                .eq('mes', periodFilter.month)
                .eq('ano', periodFilter.year)
                .maybeSingle();

            if (existing) {
                await supabase.from('pessoal_orcamento_salario_previsto').update({ salario_previsto: val }).eq('id', existing.id);
            } else {
                await supabase.from('pessoal_orcamento_salario_previsto').insert({ user_id: userIdToMod, mes: periodFilter.month, ano: periodFilter.year, salario_previsto: val });
            }
            
            setIsEditing(false);
            onUpdate();
            toast({ title: 'Sucesso', description: 'Entrada prevista atualizada.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro', description: e.message });
        }
    };

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">Entradas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Previsto</span>
                    {isEditing ? (
                        <div className="flex gap-2 items-center">
                            <Input 
                                type="number" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 h-8 bg-input text-foreground text-right" 
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSave}><Check className="w-4 h-4" /></Button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-center">
                            <span className="text-xl font-bold">{formatCurrency(prevValue)}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => setIsEditing(true)}><Edit2 className="w-3 h-3" /></Button>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Realizado</span>
                    <span className="text-xl font-bold">{formatCurrency(realValue)}</span>
                </div>
                
                <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm font-semibold">Diferença</span>
                    <span className={`text-lg font-bold ${diff > 0 ? 'text-positive' : diff < 0 ? 'text-negative' : 'text-foreground'}`}>
                        {formatCurrency(diff)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}