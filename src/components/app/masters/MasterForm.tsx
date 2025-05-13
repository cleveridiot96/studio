// @ts-nocheck
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

const TABS_CONFIG: { value: MasterItemType; label: string; hasCommission: boolean; }[] = [
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
  if (config?.hasCommission && (data.commission === undefined || data.commission < 0)) {
    // Commission is required and must be non-negative if the type has commission
    return false; 
  }
  if (config?.hasCommission && data.commission !== undefined && data.commission === 0) {
    // Allow 0 commission
    return true;
  }
  return true;
}, {
  message: "Commission must be a non-negative number if applicable.",
  path: ["commission"], 
});


type MasterItemFormValues = z.infer<typeof masterItemSchema>;

interface MasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: MasterItem) => void;
  initialData?: MasterItem | null;
  itemTypeFromButton?: MasterItemType; 
}

export const MasterForm: React.FC<MasterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  itemTypeFromButton,
}) => {
  const form = useForm<MasterItemFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: '',
      type: itemTypeFromButton || 'Customer',
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
        type: itemTypeFromButton || 'Customer',
        commission: undefined,
      });
    }
  }, [initialData, itemTypeFromButton, form, isOpen]);

  const selectedType = form.watch('type');
  const currentTypeConfig = TABS_CONFIG.find(t => t.value === selectedType);
  const showCommissionField = currentTypeConfig?.hasCommission;


  const handleSubmit = (values: MasterItemFormValues) => {
    const itemToSubmit: MasterItem = {
      id: initialData?.id || `${values.type.toLowerCase()}-${Date.now()}`,
      name: values.name,
      type: values.type,
    };
    if (showCommissionField && values.commission !== undefined ) { 
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
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      const newTypeConfig = TABS_CONFIG.find(t => t.value === value);
                      if (!newTypeConfig?.hasCommission) {
                        form.setValue('commission', undefined);
                      } else {
                        // If switching to a type that has commission, you might want to set a default or leave it undefined.
                        // Forcing a default might be '' or 0, depends on desired UX.
                        // form.setValue('commission', 0); // Example: default to 0
                      }

                  }} defaultValue={field.value} disabled={!!initialData}>
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
                    <FormLabel>Commission Percentage</FormLabel>
                    <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 2.5 for 2.5%"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e => {
                            const val = e.target.value;
                            // Allow empty string to represent undefined, parse to float if not empty
                            const numValue = val === '' ? undefined : parseFloat(val);
                             // Ensure non-negative values, or handle specific validation in schema
                            if (numValue !== undefined && numValue < 0) {
                                field.onChange(0); // or keep undefined / show error
                            } else {
                                field.onChange(numValue);
                            }
                        }}
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
