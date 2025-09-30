
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
import { saleReturnSchema, type SaleReturnFormValues } from "@/lib/schemas/saleReturnSchema";
import type { Sale, SaleReturn } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AddSaleReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (saleReturn: SaleReturn) => void;
  sales: Sale[];
  existingSaleReturns: SaleReturn[];
  saleReturnToEdit?: SaleReturn | null;
}

export const AddSaleReturnForm: React.FC<AddSaleReturnFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sales,
  existingSaleReturns,
  saleReturnToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [selectedOriginalSale, setSelectedOriginalSale] = React.useState<Sale | null>(null);

  const formMethods = useForm<SaleReturnFormValues>({
    resolver: zodResolver(saleReturnSchema(sales, existingSaleReturns)),
    defaultValues: saleReturnToEdit
      ? {
          date: new Date(saleReturnToEdit.date),
          originalSaleId: saleReturnToEdit.originalSaleId,
          originalLotNumber: saleReturnToEdit.originalLotNumber,
          quantityReturned: saleReturnToEdit.quantityReturned,
          netWeightReturned: saleReturnToEdit.netWeightReturned,
          returnReason: saleReturnToEdit.returnReason || "",
          notes: saleReturnToEdit.notes || "",
          restockingFee: saleReturnToEdit.restockingFee || undefined,
        }
      : {
          date: new Date(),
          originalSaleId: undefined,
          originalLotNumber: undefined,
          quantityReturned: undefined,
          netWeightReturned: undefined,
          returnReason: "",
          notes: "",
          restockingFee: undefined,
        },
  });

  const { control, handleSubmit, reset, watch, setValue, getValues } = formMethods;
  const watchedOriginalSaleId = watch("originalSaleId");
  const watchedOriginalLotNumber = watch("originalLotNumber");
  const watchedQuantityReturned = watch("quantityReturned");

  React.useEffect(() => {
    if (isOpen) {
      reset(saleReturnToEdit
        ? {
            date: new Date(saleReturnToEdit.date),
            originalSaleId: saleReturnToEdit.originalSaleId,
            originalLotNumber: saleReturnToEdit.originalLotNumber,
            quantityReturned: saleReturnToEdit.quantityReturned,
            netWeightReturned: saleReturnToEdit.netWeightReturned,
            returnReason: saleReturnToEdit.returnReason || "",
            notes: saleReturnToEdit.notes || "",
            restockingFee: saleReturnToEdit.restockingFee || undefined,
          }
        : { date: new Date(), originalSaleId: undefined, originalLotNumber: undefined, quantityReturned: undefined, netWeightReturned: undefined, returnReason: "", notes: "", restockingFee: undefined }
      );
      setSelectedOriginalSale(saleReturnToEdit ? sales.find(s => s.id === saleReturnToEdit.originalSaleId) || null : null);
    }
  }, [isOpen, saleReturnToEdit, reset, sales]);

  React.useEffect(() => {
    if (watchedOriginalSaleId) {
      const sale = sales.find(s => s.id === watchedOriginalSaleId);
      setSelectedOriginalSale(sale || null);
       if (sale && !sale.items.some(item => item.lotNumber === getValues("originalLotNumber"))) {
        setValue("originalLotNumber", undefined, { shouldValidate: true });
       }
    } else {
      setSelectedOriginalSale(null);
    }
  }, [watchedOriginalSaleId, sales, getValues, setValue]);

  React.useEffect(() => {
    if (selectedOriginalSale && watchedOriginalLotNumber && watchedQuantityReturned && watchedQuantityReturned > 0) {
      const originalItem = selectedOriginalSale.items.find(i => i.lotNumber === watchedOriginalLotNumber);
      if (originalItem) {
        const avgWeightPerBag = originalItem.netWeight / originalItem.quantity;
        if (!isNaN(avgWeightPerBag) && getValues("netWeightReturned") === 0) {
            setValue("netWeightReturned", parseFloat((watchedQuantityReturned * avgWeightPerBag).toFixed(2)));
        }
      }
    }
  }, [watchedQuantityReturned, watchedOriginalLotNumber, selectedOriginalSale, setValue, getValues]);


  const processSubmit = (values: SaleReturnFormValues) => {
    setIsSubmitting(true);
    const originalSale = sales.find(s => s.id === values.originalSaleId);
    if (!originalSale || !values.originalLotNumber || !values.quantityReturned || !values.netWeightReturned) {
      toast({ title: "Error", description: "Original sale or return quantities are missing.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const originalItem = originalSale.items.find(i => i.lotNumber === values.originalLotNumber);
    if (!originalItem) {
        toast({ title: "Error", description: "Lot number not found in original sale.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    const rate = originalItem.rate;

    const returnAmount = (values.netWeightReturned * rate) - (values.restockingFee || 0);

    const saleReturnData: SaleReturn = {
      id: saleReturnToEdit?.id || `sr-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      originalSaleId: originalSale.id,
      originalBillNumber: originalSale.billNumber,
      originalCustomerId: originalSale.customerId,
      originalCustomerName: originalSale.customerName,
      originalLotNumber: values.originalLotNumber,
      originalSaleRate: rate,
      quantityReturned: values.quantityReturned,
      netWeightReturned: values.netWeightReturned,
      returnReason: values.returnReason,
      notes: values.notes,
      returnAmount: returnAmount,
      restockingFee: values.restockingFee,
    };

    onSubmit(saleReturnData);
    setIsSubmitting(false);
    onClose();
  };

  const saleOptions = sales.map(s => ({
    value: s.id,
    label: `${s.billNumber || s.id.slice(-5)} - ${s.customerName || s.customerId} (${s.items.map(i => i.lotNumber).join(', ')}, ${format(parseISO(s.date), "dd-MM-yy")})`,
  }));

  const lotOptions = selectedOriginalSale?.items.map(item => ({
    value: item.lotNumber,
    label: item.lotNumber,
  })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{saleReturnToEdit ? "Edit Sale Return" : "New Sale Return"}</DialogTitle>
          <DialogDescription>Record items returned from a previous sale.</DialogDescription>
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
              <FormField control={control} name="originalSaleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Sale</FormLabel>
                  <MasterDataCombobox 
                    value={field.value} 
                    onChange={field.onChange} 
                    options={saleOptions} 
                    placeholder="Select Original Sale" 
                  />
                  <FormMessage />
                </FormItem>)}
              />
              {selectedOriginalSale && selectedOriginalSale.items.length > 1 && (
                 <FormField
                  control={control}
                  name="originalLotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vakkal/Lot to Return</FormLabel>
                      <MasterDataCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={lotOptions}
                        placeholder="Select Lot to Return"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedOriginalSale && (
                <div className="p-3 border rounded-md bg-muted/50 text-sm uppercase">
                  <p><strong>Bill:</strong> {selectedOriginalSale.billNumber || selectedOriginalSale.id.slice(-5)}</p>
                  <p><strong>Customer:</strong> {selectedOriginalSale.customerName || selectedOriginalSale.customerId}</p>
                  <p><strong>Selected Lot:</strong> {watchedOriginalLotNumber || selectedOriginalSale.items[0]?.lotNumber || 'N/A'}</p>
                  <p><strong>Original Sale Rate:</strong> ₹{selectedOriginalSale.items.find(i => i.lotNumber === (watchedOriginalLotNumber || selectedOriginalSale.items[0]?.lotNumber))?.rate.toFixed(2)}/kg</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="quantityReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Returned (Bags)</FormLabel>
                    <FormControl><Input type="number" placeholder="Bags" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
                <FormField control={control} name="netWeightReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Weight Returned (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Weight" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
              </div>
              <FormField control={control} name="restockingFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Restocking Fee (₹, Optional)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="e.g., 50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={control} name="returnReason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Wrong item" {...field} /></FormControl>
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
                  {isSubmitting ? (saleReturnToEdit ? "Saving..." : "Creating...") : (saleReturnToEdit ? "Save Changes" : "Create Return")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
