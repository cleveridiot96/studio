
"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { TransactionalProfitInfo } from './ProfitAnalysisClient';
import { ArrowDown, Minus, Plus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfitBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: TransactionalProfitInfo | null;
}

const BreakdownRow: React.FC<{ label: string; value: number; isSub?: boolean; isTotal?: boolean; color?: 'green' | 'red' | 'blue' | 'orange' }> = ({ label, value, isSub = false, isTotal = false, color }) => (
  <TableRow className={cn(isTotal && 'font-bold bg-muted/50 text-base', color === 'green' && 'text-green-600', color === 'red' && 'text-red-600', color === 'blue' && 'text-blue-600', color === 'orange' && 'text-orange-600')}>
    <TableCell className={cn('py-1', isSub ? 'pl-8' : 'pl-4')}>
      {isSub ? <span className="text-muted-foreground mr-1">↳</span> : <Plus className="h-3 w-3 inline-block mr-2" />}
      {label}
    </TableCell>
    <TableCell className="text-right py-1 font-mono">₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
  </TableRow>
);
const DeductionRow: React.FC<{ label: string; value: number; isSub?: boolean; isTotal?: boolean; color?: 'green' | 'red' }> = ({ label, value, isSub = false, isTotal = false, color }) => (
    <TableRow className={cn(isTotal && 'font-bold bg-muted/50 text-base', color === 'green' && 'text-green-600', color === 'red' && 'text-red-600')}>
      <TableCell className={cn('py-1', isSub ? 'pl-8' : 'pl-4')}>
        {isSub ? <span className="text-muted-foreground mr-1">↳</span> : <Minus className="h-3 w-3 inline-block mr-2" />}
        {label}
      </TableCell>
      <TableCell className="text-right py-1 font-mono">(-) ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
    </TableRow>
  );

export const ProfitBreakdownDialog: React.FC<ProfitBreakdownDialogProps> = ({ isOpen, onClose, item }) => {
  if (!item) return null;

  const { costBreakdown, saleExpenses } = item;
  const effectiveSaleRate = item.saleRatePerKg - (saleExpenses.total / item.saleNetWeightKg);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="uppercase">Profit Breakdown for Vakkal: {item.lotNumber}</DialogTitle>
          <DialogDescription>
            This shows how the landed cost and net profit were calculated for this specific item in Sale Bill #{item.billNumber || item.saleId.slice(-5)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 max-h-[60vh] overflow-y-auto">
          {/* Landed Cost Calculation */}
          <div className="space-y-2 p-3 border rounded-lg bg-background">
            <h3 className="font-semibold text-lg text-primary flex items-center"><ArrowDown className="mr-2 h-5 w-5"/>Landed Cost/kg</h3>
            <Table>
              <TableBody>
                <BreakdownRow label="Base Purchase Rate" value={costBreakdown?.baseRate || item.basePurchaseRate} />
                {costBreakdown?.purchaseExpenses > 0 ? <BreakdownRow label="Purchase Expenses" value={costBreakdown.purchaseExpenses} isSub /> : null}
                {costBreakdown?.transferExpenses > 0 ? <BreakdownRow label="Transfer Expenses" value={costBreakdown.transferExpenses} isSub /> : null}
                <TableRow className="bg-primary/10 font-bold text-primary text-base">
                    <TableCell className="py-2 pl-4">✅ Final Landed Cost</TableCell>
                    <TableCell className="py-2 text-right font-mono">₹{item.landedCostPerKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {/* Sale & Profit Calculation */}
          <div className="space-y-2 p-3 border rounded-lg bg-background">
             <h3 className="font-semibold text-lg text-primary flex items-center"><Zap className="mr-2 h-5 w-5"/>Sale & Profit/kg</h3>
             <Table>
                <TableBody>
                    <BreakdownRow label="Sale Rate" value={item.saleRatePerKg} color="green" />
                    {saleExpenses.brokerage > 0 ? <DeductionRow label="Brokerage" value={saleExpenses.brokerage / item.saleNetWeightKg} isSub /> : null}
                    {saleExpenses.extraBrokerage > 0 ? <DeductionRow label="Extra Brokerage" value={saleExpenses.extraBrokerage / item.saleNetWeightKg} isSub /> : null}
                    {saleExpenses.transport > 0 ? <DeductionRow label="Transport" value={saleExpenses.transport / item.saleNetWeightKg} isSub /> : null}
                    {saleExpenses.packing > 0 ? <DeductionRow label="Packing" value={saleExpenses.packing / item.saleNetWeightKg} isSub /> : null}
                    {saleExpenses.labour > 0 ? <DeductionRow label="Labour" value={saleExpenses.labour / item.saleNetWeightKg} isSub /> : null}
                    {saleExpenses.misc > 0 ? <DeductionRow label="Misc." value={saleExpenses.misc / item.saleNetWeightKg} isSub /> : null}
                    <TableRow className="bg-green-500/10 font-bold text-green-700 text-base">
                        <TableCell className="py-2 pl-4">✅ Effective Sale Rate</TableCell>
                        <TableCell className="py-2 text-right font-mono">₹{effectiveSaleRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                </TableBody>
             </Table>
          </div>
        </div>

        {/* Final Summary */}
        <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-center text-lg mb-2 uppercase">Final Calculation</h3>
            <div className="flex justify-between items-center text-base">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Effective Sale Rate</p>
                    <p className="font-bold text-lg text-green-600">₹{effectiveSaleRate.toFixed(2)}</p>
                </div>
                <Minus className="h-6 w-6 text-muted-foreground" />
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">Landed Cost</p>
                    <p className="font-bold text-lg text-red-600">₹{item.landedCostPerKg.toFixed(2)}</p>
                </div>
                <div className="font-extrabold text-2xl text-muted-foreground mx-2">=</div>
                 <div className="text-center p-2 rounded-md bg-background shadow-inner">
                    <p className="text-sm text-muted-foreground">Net Profit/kg</p>
                    <p className={cn("font-bold text-2xl", (effectiveSaleRate - item.landedCostPerKg) >= 0 ? 'text-primary' : 'text-destructive')}>
                        ₹{(effectiveSaleRate - item.landedCostPerKg).toFixed(2)}
                    </p>
                </div>
            </div>
             <div className="text-center text-xl font-bold mt-4 pt-2 border-t">
                Total Net Profit for {item.saleNetWeightKg} kg: 
                <span className={cn("ml-2", item.netProfit >=0 ? 'text-primary' : 'text-destructive')}>
                  ₹{item.netProfit.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
             </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    