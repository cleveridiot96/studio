
"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { purchaseReturnSchema, type PurchaseReturnFormValues } from "@/lib/schemas/purchaseReturnSchema";
import type { Purchase, PurchaseReturn } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AddPurchaseReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (purchaseReturn: PurchaseReturn) => void;
  purchases: Purchase[];
  existingPurchaseReturns: PurchaseReturn[];
  purchaseReturnToEdit?: PurchaseReturn | null;
}

export const AddPurchaseReturnForm: React.FC<AddPurchaseReturnFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  purchases,
  existingPurchaseReturns,
  purchaseReturnToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [selectedOriginalPurchase, setSelectedOriginalPurchase] = React.useState<Purchase | null>(null);
  const [netWeightReturnedManuallySet, setNetWeightReturnedManuallySet] = React.useState(!!purchaseReturnToEdit?.netWeightReturned);

  const formMethods = useForm<PurchaseReturnFormValues>({
    resolver: zodResolver(purchaseReturnSchema(purchases, existingPurchaseReturns)),
    defaultValues: purchaseReturnToEdit
      ? {
          date: new Date(purchaseReturnToEdit.date),
          originalPurchaseId: purchaseReturnToEdit.originalPurchaseId,
          quantityReturned: purchaseReturnToEdit.quantityReturned,
          netWeightReturned: purchaseReturnToEdit.netWeightReturned,
          returnReason: purchaseReturnToEdit.returnReason || "",
          notes: purchaseReturnToEdit.notes || "",
        }
      : {
          date: new Date(),
          originalPurchaseId: undefined,
          quantityReturned: undefined,
          netWeightReturned: undefined,
          returnReason: "",
          notes: "",
        },
  });

  const { control, handleSubmit, reset, watch, setValue } = formMethods;
  const watchedOriginalPurchaseId = watch("originalPurchaseId");
  const watchedQuantityReturned = watch("quantityReturned");

  React.useEffect(() => {
    if (isOpen) {
      const defaultVals = purchaseReturnToEdit
        ? {
            date: new Date(purchaseReturnToEdit.date),
            originalPurchaseId: purchaseReturnToEdit.originalPurchaseId,
            quantityReturned: purchaseReturnToEdit.quantityReturned,
            netWeightReturned: purchaseReturnToEdit.netWeightReturned,
            returnReason: purchaseReturnToEdit.returnReason || "",
            notes: purchaseReturnToEdit.notes || "",
          }
        : { date: new Date(), originalPurchaseId: undefined, quantityReturned: undefined, netWeightReturned: undefined, returnReason: "", notes: "" };
      reset(defaultVals);
      setSelectedOriginalPurchase(purchaseReturnToEdit ? purchases.find(p => p.id === purchaseReturnToEdit.originalPurchaseId) || null : null);
      setNetWeightReturnedManuallySet(!!purchaseReturnToEdit?.netWeightReturned);
    }
  }, [isOpen, purchaseReturnToEdit, reset, purchases]);

  React.useEffect(() => {
    if (watchedOriginalPurchaseId) {
      const purchase = purchases.find(p => p.id === watchedOriginalPurchaseId);
      setSelectedOriginalPurchase(purchase || null);
      if (formMethods.getValues("quantityReturned") === 0) {
        setNetWeightReturnedManuallySet(false);
      }
    } else {
      setSelectedOriginalPurchase(null);
      setNetWeightReturnedManuallySet(false);
    }
  }, [watchedOriginalPurchaseId, purchases, formMethods]);

  React.useEffect(() => {
    if (selectedOriginalPurchase && watchedQuantityReturned && watchedQuantityReturned > 0 && !netWeightReturnedManuallySet) {
      const avgWeightPerBag = (selectedOriginalPurchase.totalQuantity > 0)
        ? selectedOriginalPurchase.totalNetWeight / selectedOriginalPurchase.totalQuantity
        : 50; 
      if (!isNaN(avgWeightPerBag)) {
        setValue("netWeightReturned", parseFloat((watchedQuantityReturned * avgWeightPerBag).toFixed(2)), { shouldValidate: true });
      }
    } else if (!watchedQuantityReturned && !netWeightReturnedManuallySet) {
        setValue("netWeightReturned", undefined, { shouldValidate: true });
    }
  }, [watchedQuantityReturned, selectedOriginalPurchase, netWeightReturnedManuallySet, setValue]);


  const processSubmit = (values: PurchaseReturnFormValues) => {
    setIsSubmitting(true);
    const originalPurchase = purchases.find(p => p.id === values.originalPurchaseId);
    if (!originalPurchase || !values.quantityReturned || !values.netWeightReturned) {
      toast({ title: "Error", description: "Missing required information for the return.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    // Find the original item to get its rate
    const originalItem = originalPurchase.items.find(item => item.lotNumber === originalPurchase.items[0]?.lotNumber); // Assuming single lot for simplicity in return for now
    const rate = originalItem?.rate || 0;
    const returnAmount = values.netWeightReturned * rate;

    const purchaseReturnData: PurchaseReturn = {
      id: purchaseReturnToEdit?.id || `pr-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      originalPurchaseId: originalPurchase.id,
      originalLotNumber: originalPurchase.items[0]?.lotNumber || 'N/A', // Simplified for now
      originalSupplierId: originalPurchase.supplierId,
      originalSupplierName: originalPurchase.supplierName,
      originalPurchaseRate: rate,
      quantityReturned: values.quantityReturned,
      netWeightReturned: values.netWeightReturned,
      returnReason: values.returnReason,
      notes: values.notes,
      returnAmount: returnAmount,
    };

    onSubmit(purchaseReturnData);
    setIsSubmitting(false);
    onClose();
  };

  const purchaseOptions = purchases.map(p => ({
    value: p.id,
    label: `${p.items.map(i => i.lotNumber).join(', ')} - ${p.supplierName || p.supplierId} (Date: ${format(parseISO(p.date), "dd-MM-yy")})`,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{purchaseReturnToEdit ? "Edit Purchase Return" : "New Purchase Return"}</DialogTitle>
          <DialogDescription>Record items returned from a previous purchase.</DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}>
          <Form {...formMethods}>
            <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
              <FormField control={control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Return Date</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsDatePickerOpen(false);
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover><FormMessage />
                </FormItem>)}
              />
              <FormField control={control} name="originalPurchaseId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Purchase</FormLabel>
                  <MasterDataCombobox
                    value={field.value}
                    onChange={field.onChange}
                    options={purchaseOptions}
                    placeholder="Select Original Purchase"
                  />
                  <FormMessage />
                </FormItem>)}
              />
              {selectedOriginalPurchase && (
                <div className="p-3 border rounded-md bg-muted/50 text-sm uppercase">
                  <p><strong>Lot(s):</strong> {selectedOriginalPurchase.items.map(i => i.lotNumber).join(', ')}</p>
                  <p><strong>Supplier:</strong> {selectedOriginalPurchase.supplierName || selectedOriginalPurchase.supplierId}</p>
                  <p><strong>Original Rate:</strong> ₹{selectedOriginalPurchase.items[0]?.rate.toFixed(2)}/kg</p>
                  <p><strong>Original Qty:</strong> {selectedOriginalPurchase.totalQuantity} bags, {selectedOriginalPurchase.totalNetWeight.toFixed(2)} kg</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="quantityReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Returned (Bags)</FormLabel>
                    <FormControl><Input type="number" placeholder="Bags" {...field} value={field.value ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || undefined;
                        field.onChange(val);
                        setNetWeightReturnedManuallySet(false);
                      }}
                    /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
                <FormField control={control} name="netWeightReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Weight Returned (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Weight" {...field} value={field.value ?? ''}
                      onChange={e => {
                        field.onChange(parseFloat(e.target.value) || undefined);
                        setNetWeightReturnedManuallySet(true);
                      }}
                      onFocus={() => setNetWeightReturnedManuallySet(true)}
                    /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
              </div>
              <FormField control={control} name="returnReason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Damaged goods" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Additional details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>)}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (purchaseReturnToEdit ? "Saving..." : "Creating...") : (purchaseReturnToEdit ? "Save Changes" : "Create Return")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
