import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowDownRight, ArrowUpRight, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const EstoqueAtualCard = ({ item, lastUpdate }) => {
    const { tipo_folha, baseline, reposicoes, folhasGastas, estoqueAtual } = item;
    const [flash, setFlash] = useState(false);

    // Trigger flash animation when stock changes
    useEffect(() => {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 1500);
        return () => clearTimeout(timer);
    }, [estoqueAtual, reposicoes, folhasGastas]);

    let statusColor = "text-stock-positive";
    let statusBg = "bg-stock-positive/10";
    let statusBorder = "border-stock-positive/30";

    if (estoqueAtual < 0) {
        statusColor = "text-stock-negative";
        statusBg = "bg-stock-negative/10";
        statusBorder = "border-stock-negative/30";
    } else if (estoqueAtual < 50) { // arbitrary low stock threshold
        statusColor = "text-stock-low";
        statusBg = "bg-stock-low/10";
        statusBorder = "border-stock-low/30";
    }

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-300 border bg-card/80 backdrop-blur-sm",
            statusBorder,
            flash && "stock-update-flash"
        )}>
            <div className={cn("absolute top-0 left-0 w-1 h-full", statusBg.replace('/10', ''))} />
            
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", statusBg)}>
                            <Package className={cn("w-5 h-5", statusColor)} />
                        </div>
                        <h3 className="font-bold text-lg text-foreground tracking-tight truncate max-w-[150px]" title={tipo_folha}>
                            {tipo_folha}
                        </h3>
                    </div>
                    <div className={cn("flex flex-col items-end")}>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Atual</span>
                        <span className={cn("text-2xl font-black leading-none mt-1", statusColor)}>
                            {estoqueAtual}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mt-4 border-t border-border/50 pt-4">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Archive className="w-3 h-3"/> Base</span>
                        <span className="font-semibold text-foreground">{baseline}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-emerald-400 text-xs flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> Entrada</span>
                        <span className="font-semibold text-emerald-400">+{reposicoes}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-rose-400 text-xs flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> Saída</span>
                        <span className="font-semibold text-rose-400">-{folhasGastas}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EstoqueAtualCard;