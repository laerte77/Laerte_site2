import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export default function DespesaCard({ realValue, prevValue }) {
    const diff = prevValue - realValue;

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-lg text-orange-500">Despesas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Previsto</span>
                    <span className="text-xl font-bold">{formatCurrency(prevValue)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Realizado</span>
                    <span className="text-xl font-bold">{formatCurrency(realValue)}</span>
                </div>
                
                <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm font-semibold">Economia / Excesso</span>
                    <span className={`text-lg font-bold ${diff > 0 ? 'text-positive' : diff < 0 ? 'text-negative' : 'text-foreground'}`}>
                        {formatCurrency(diff)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}