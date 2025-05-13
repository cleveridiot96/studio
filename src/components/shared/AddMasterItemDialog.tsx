
"use client"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MasterItem, MasterItemType } from "@/lib/types";
import { useState, useEffect } from "react";
import { Percent } from "lucide-react";

const masterItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  commission: z.coerce.number().optional(),
});
type MasterItemFormValues = z.infer<typeof masterItemSchema>;

interface AddMasterItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newItem: MasterItem) => void;
  itemType: MasterItemType;
}

export function AddMasterItemDialog({ isOpen, onClose, onAdd, itemType }: AddMasterItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<MasterItemFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: "",
      commission: undefined,
    },
  });

  useEffect(() => {
    // Reset form when dialog opens or itemType changes, especially for commission visibility
    form.reset({ name: "", commission: undefined });
  }, [isOpen, itemType, form]);

  const onSubmit = async (values: MasterItemFormValues) => {
    setIsLoading(true);
    
    const newItem: MasterItem = {
      id: `${itemType.toLowerCase()}-${Date.now()}`, // Simple unique ID for demo
      name: values.name,
      type: itemType,
    };

    if ((itemType === 'Agent' || itemType === 'Broker') && values.commission !== undefined && values.commission > 0) {
      newItem.commission = values.commission;
    }
    
    onAdd(newItem);
    form.reset(); // Reset after successful submission
    setIsLoading(false);
    onClose();
  };

  const showCommissionField = itemType === 'Agent' || itemType === 'Broker';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose(); } else { form.reset({ name: "", commission: undefined }); } }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {itemType}</DialogTitle>
          <DialogDescription>
            Enter the details for the new {itemType.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{itemType} Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder={`Enter ${itemType.toLowerCase()} name`}
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {showCommissionField && (
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percentage (Optional)</Label>
              <div className="relative">
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  {...form.register("commission")}
                  placeholder="e.g., 5 for 5%"
                  className={`pr-8 ${form.formState.errors.commission ? "border-destructive" : ""}`}
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {form.formState.errors.commission && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.commission.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add " + itemType}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
