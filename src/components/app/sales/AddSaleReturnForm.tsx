
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
          quantityReturned: saleReturnToEdit.quantityReturned,
          netWeightReturned: saleReturnToEdit.netWeightReturned,
          returnReason: saleReturnToEdit.returnReason || "",
          notes: saleReturnToEdit.notes || "",
          restockingFee: saleReturnToEdit.restockingFee || undefined,
        }
      : {
          date: new Date(),
          originalSaleId: undefined,
          quantityReturned: 0,
          netWeightReturned: 0,
          returnReason: "",
          notes: "",
          restockingFee: undefined,
        },
  });

  const { control, handleSubmit, reset, watch, setValue } = formMethods;
  const watchedOriginalSaleId = watch("originalSaleId");
  const watchedQuantityReturned = watch("quantityReturned");


  React.useEffect(() => {
    if (isOpen) {
      reset(saleReturnToEdit
        ? {
            date: new Date(saleReturnToEdit.date),
            originalSaleId: saleReturnToEdit.originalSaleId,
            quantityReturned: saleReturnToEdit.quantityReturned,
            netWeightReturned: saleReturnToEdit.netWeightReturned,
            returnReason: saleReturnToEdit.returnReason || "",
            notes: saleReturnToEdit.notes || "",
            restockingFee: saleReturnToEdit.restockingFee || undefined,
          }
        : { date: new Date(), originalSaleId: undefined, quantityReturned: 0, netWeightReturned: 0, returnReason: "", notes: "", restockingFee: undefined }
      );
      setSelectedOriginalSale(saleReturnToEdit ? sales.find(s => s.id === saleReturnToEdit.originalSaleId) || null : null);
    }
  }, [isOpen, saleReturnToEdit, reset, sales]);

  React.useEffect(() => {
    if (watchedOriginalSaleId) {
      const sale = sales.find(s => s.id === watchedOriginalSaleId);
      setSelectedOriginalSale(sale || null);
    } else {
      setSelectedOriginalSale(null);
    }
  }, [watchedOriginalSaleId, sales]);

  React.useEffect(() => {
    if (selectedOriginalSale && watchedQuantityReturned > 0) {
      const avgWeightPerBag = selectedOriginalSale.netWeight / selectedOriginalSale.quantity;
      if (!isNaN(avgWeightPerBag) && formMethods.getValues("netWeightReturned") === 0) {
        setValue("netWeightReturned", parseFloat((watchedQuantityReturned * avgWeightPerBag).toFixed(2)));
      }
    }
  }, [watchedQuantityReturned, selectedOriginalSale, setValue, formMethods]);


  const processSubmit = (values: SaleReturnFormValues) => {
    setIsSubmitting(true);
    const originalSale = sales.find(s => s.id === values.originalSaleId);
    if (!originalSale) {
      toast({ title: "Error", description: "Original sale not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const returnAmount = (values.netWeightReturned * originalSale.rate) - (values.restockingFee || 0);

    const saleReturnData: SaleReturn = {
      id: saleReturnToEdit?.id || `sr-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      originalSaleId: originalSale.id,
      originalBillNumber: originalSale.billNumber,
      originalCustomerId: originalSale.customerId,
      originalCustomerName: originalSale.customerName,
      originalLotNumber: originalSale.lotNumber,
      originalSaleRate: originalSale.rate,
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
    label: `${s.billNumber || s.id.slice(-5)} - ${s.customerName || s.customerId} (Lot: ${s.lotNumber}, Date: ${format(parseISO(s.date), "dd-MM-yy")})`,
  }));

  return (
    <Dialog modal={false} open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
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
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
              {selectedOriginalSale && (
                <div className="p-3 border rounded-md bg-muted/50 text-sm">
                  <p><strong>Bill:</strong> {selectedOriginalSale.billNumber || selectedOriginalSale.id.slice(-5)}</p>
                  <p><strong>Customer:</strong> {selectedOriginalSale.customerName || selectedOriginalSale.customerId}</p>
                  <p><strong>Lot:</strong> {selectedOriginalSale.lotNumber}</p>
                  <p><strong>Original Sale Rate:</strong> ₹{selectedOriginalSale.rate.toFixed(2)}/kg</p>
                  <p><strong>Original Qty:</strong> {selectedOriginalSale.quantity} bags, {selectedOriginalSale.netWeight.toFixed(2)} kg</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="quantityReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Returned (Bags)</FormLabel>
                    <FormControl><Input type="number" placeholder="Bags" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
                <FormField control={control} name="netWeightReturned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Weight Returned (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Weight" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />
              </div>
              <FormField control={control} name="restockingFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Restocking Fee (₹, Optional)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="e.g., 50" {...field} value={field.value === undefined ? '' : field.value} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
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
