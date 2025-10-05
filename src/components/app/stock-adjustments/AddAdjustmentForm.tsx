
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { Textarea } from '@/components/ui/textarea';
import type { StockAdjustment, MasterItem } from '@/lib/types';

const adjustmentSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  lotNumber: z.string().min(1, "Lot number is required."),
  locationId: z.string().min(1, "Location is required."),
  type: z.enum(['Wastage', 'Theft', 'Correction'], { required_error: "Adjustment type is required." }),
  bags: z.coerce.number().int("Bags must be a whole number.").default(0),
  weight: z.coerce.number().default(0),
  reason: z.string().optional(),
}).refine(data => data.bags !== 0 || data.weight !== 0, {
  message: "At least one of Bags or Weight must be non-zero.",
  path: ["bags"],
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface AddAdjustmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<StockAdjustment, 'id'>) => void;
  warehouses: MasterItem[];
  availableLots: string[];
}

export function AddAdjustmentForm({ isOpen, onClose, onSubmit, warehouses, availableLots }: AddAdjustmentFormProps) {
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { date: new Date(), bags: 0, weight: 0 },
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const watchedType = form.watch("type");

  const processSubmit = (values: AdjustmentFormValues) => {
    let bags = values.bags;
    let weight = values.weight;

    if (watchedType === 'Wastage' || watchedType === 'Theft') {
      bags = -Math.abs(bags);
      weight = -Math.abs(weight);
    }

    const location = warehouses.find(w => w.id === values.locationId);

    onSubmit({
      date: format(values.date, 'yyyy-MM-dd'),
      lotNumber: values.lotNumber,
      locationId: values.locationId,
      locationName: location?.name || values.locationId,
      bags,
      weight,
      type: values.type,
      reason: values.reason,
    });
    form.reset({ date: new Date(), bags: 0, weight: 0 });
    onClose();
  };

  const lotOptions = availableLots.map(lot => ({ value: lot, label: lot }));
  const warehouseOptions = warehouses.map(wh => ({ value: wh.id, label: wh.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Stock Adjustment</DialogTitle>
          <DialogDescription>
            Record a manual change to stock levels. Use positive numbers for additions and negative numbers for reductions in 'Correction' mode.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsDatePickerOpen(false);}} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Adjustment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Correction">Correction (Add/Remove)</SelectItem>
                      <SelectItem value="Wastage">Wastage (Remove)</SelectItem>
                      <SelectItem value="Theft">Theft (Remove)</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="lotNumber" render={({ field }) => (
                <FormItem><FormLabel>Lot Number</FormLabel>
                  <MasterDataCombobox value={field.value} onChange={field.onChange} options={lotOptions} placeholder="Select Lot" searchPlaceholder="Search Lots..." />
                  <FormMessage />
                </FormItem>)} />
              <FormField control={form.control} name="locationId" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel>
                  <MasterDataCombobox value={field.value} onChange={field.onChange} options={warehouseOptions} placeholder="Select Location" />
                  <FormMessage />
                </FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="bags" render={({ field }) => (
                <FormItem><FormLabel>Bags {watchedType !== 'Correction' ? '(Qty to Remove)' : '(+/-)'}</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>)} />
              <FormField control={form.control} name="weight" render={({ field }) => (
                <FormItem><FormLabel>Weight (kg) {watchedType !== 'Correction' ? '(Qty to Remove)' : '(+/-)'}</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>)} />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem><FormLabel>Reason / Notes</FormLabel>
                <FormControl><Textarea placeholder="Explain the reason for this adjustment..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>)} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Adjustment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    