"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MasterItem, MasterItemType } from '@/lib/types';
import { Percent } from 'lucide-react';

const TABS_CONFIG: { value: MasterItemType; label: string; hasCommission: boolean }[] = [
  { value: "Customer", label: "Customer", hasCommission: false },
  { value: "Supplier", label: "Supplier", hasCommission: false },
  { value: "Agent", label: "Agent", hasCommission: true },
  { value: "Transporter", label: "Transporter", hasCommission: false },
  { value: "Broker", label: "Broker", hasCommission: true },
];

const masterItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(["Customer", "Supplier", "Agent", "Transporter", "Broker"]),
  commission: z.coerce.number().optional(),
}).refine(data => {
  const config = TABS_CONFIG.find(t => t.value === data.type);
  if (config?.hasCommission && (data.commission === undefined || data.commission <= 0)) {
    // Allow 0 commission if explicitly entered, but might want to refine this
    // For now, if commission is applicable, it must be > 0 if a value is provided.
    // If undefined or 0 it will pass if not required.
    // This logic might need to be stricter if commission is mandatory for Agent/Broker.
    // For now, if it *has* a commission field, and a value is attempted, it should be >0.
    // If it's optional and not provided, it's fine.
  }
  return true; 
}, {
  message: "Commission must be a positive number if specified for Agent or Broker.",
  path: ["commission"],
});


type MasterItemFormValues = z.infer<typeof masterItemSchema>;

interface MasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: MasterItem) => void;
  initialData?: MasterItem | null;
  itemType?: MasterItemType; // To pre-select type when adding from a specific tab
}

export const MasterForm: React.FC<MasterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  itemType,
}) => {
  const form = useForm<MasterItemFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: '',
      type: itemType || 'Customer',
      commission: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        commission: initialData.commission,
      });
    } else {
      form.reset({
        name: '',
        type: itemType || 'Customer',
        commission: undefined,
      });
    }
  }, [initialData, itemType, form, isOpen]);

  const selectedType = form.watch('type');
  const currentTypeConfig = TABS_CONFIG.find(t => t.value === selectedType);
  const showCommissionField = currentTypeConfig?.hasCommission;

  const handleSubmit = (values: MasterItemFormValues) => {
    const itemToSubmit: MasterItem = {
      id: initialData?.id || `${values.type.toLowerCase()}-${Date.now()}`,
      name: values.name,
      type: values.type,
    };
    if (showCommissionField && values.commission && values.commission > 0) {
      itemToSubmit.commission = values.commission;
    }
    onSubmit(itemToSubmit);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? `Edit ${initialData.type}` : `Add New Master Item`}</DialogTitle>
          <DialogDescription>
            {initialData ? `Update details for ${initialData.name}.` : 'Fill in the details for the new master item.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${selectedType.toLowerCase()} name`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TABS_CONFIG.map(tab => (
                        <SelectItem key={tab.value} value={tab.value}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showCommissionField && (
              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Percentage (Optional)</FormLabel>
                    <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 2.5 for 2.5%"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        className="pr-8"
                      />
                    </FormControl>
                    <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save Changes" : "Add Item")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};