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
import { useState } from "react";

const masterItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
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
    },
  });

  const onSubmit = async (values: MasterItemFormValues) => {
    setIsLoading(true);
    // In a real app, you would save this to your backend
    // For now, we'll just create a new item with a temporary ID
    const newItem: MasterItem = {
      id: `${itemType.toLowerCase()}-${Date.now()}`, // Simple unique ID for demo
      name: values.name,
      type: itemType, // Optionally store the type if MasterItem is very generic
    };
    onAdd(newItem);
    form.reset();
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {itemType}</DialogTitle>
          <DialogDescription>
            Enter the name for the new {itemType.toLowerCase()}.
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
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
