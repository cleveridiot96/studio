
"use client";

import * as React from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2, Truck, Warehouse as WarehouseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { locationTransferSchema, type LocationTransferFormValues } from "@/lib/schemas/locationTransferSchema";
import type { MasterItem, Warehouse, Transporter, Purchase, LocationTransfer } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";

interface AddLocationTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transfer: LocationTransfer) => void;
  warehouses: Warehouse[];
  transporters: Transporter[];
  purchases: Purchase[]; // To get available lots and their stock
  // We might need sales and existing transfers if stock calculation is very precise here
  onMasterDataUpdate: (type: "Warehouse" | "Transporter", item: MasterItem) => void;
  transferToEdit?: LocationTransfer | null;
}

export const AddLocationTransferForm: React.FC<AddLocationTransferFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  warehouses,
  transporters,
  purchases,
  onMasterDataUpdate,
  transferToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<"Warehouse" | "Transporter" | null>(null);

  const formSchema = locationTransferSchema(warehouses, purchases);

  const methods = useForm<LocationTransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transferToEdit
      ? {
          date: new Date(transferToEdit.date),
          fromWarehouseId: transferToEdit.fromWarehouseId,
          toWarehouseId: transferToEdit.toWarehouseId,
          transporterId: transferToEdit.transporterId || undefined,
          notes: transferToEdit.notes || "",
          items: transferToEdit.items.map(item => ({
            lotNumber: item.lotNumber,
            bagsToTransfer: item.bagsToTransfer,
          })),
        }
      : {
          date: new Date(),
          fromWarehouseId: undefined,
          toWarehouseId: undefined,
          transporterId: undefined,
          notes: "",
          items: [{ lotNumber: "", bagsToTransfer: 0 }],
        },
  });

  const { control, handleSubmit, reset, watch, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedFromWarehouseId = watch("fromWarehouseId");

  React.useEffect(() => {
    if (transferToEdit) {
      reset({
        date: new Date(transferToEdit.date),
        fromWarehouseId: transferToEdit.fromWarehouseId,
        toWarehouseId: transferToEdit.toWarehouseId,
        transporterId: transferToEdit.transporterId || undefined,
        notes: transferToEdit.notes || "",
        items: transferToEdit.items.map(item => ({
          lotNumber: item.lotNumber,
          bagsToTransfer: item.bagsToTransfer,
        })),
      });
    } else {
      reset({
        date: new Date(),
        fromWarehouseId: undefined,
        toWarehouseId: undefined,
        transporterId: undefined,
        notes: "",
        items: [{ lotNumber: "", bagsToTransfer: 0 }],
      });
    }
  }, [transferToEdit, reset, isOpen]);

  const getAvailableLotsForWarehouse = React.useCallback((warehouseId?: string): { value: string; label: string; availableBags: number }[] => {
    if (!warehouseId) return [];
    const lotSummary: Record<string, { totalBags: number; firstPurchaseDate: string }> = {};

    purchases.forEach(p => {
      if (p.locationId === warehouseId) {
        if (!lotSummary[p.lotNumber]) {
          lotSummary[p.lotNumber] = { totalBags: 0, firstPurchaseDate: p.date };
        }
        lotSummary[p.lotNumber].totalBags += p.quantity;
        if (new Date(p.date) < new Date(lotSummary[p.lotNumber].firstPurchaseDate)) {
            lotSummary[p.lotNumber].firstPurchaseDate = p.date;
        }
      }
    });

    // In a full system, subtract sales and outgoing transfers here

    return Object.entries(lotSummary)
      .filter(([, data]) => data.totalBags > 0)
      .map(([lotNumber, data]) => ({
        value: lotNumber,
        label: `${lotNumber} (Avl: ${data.totalBags} bags)`,
        availableBags: data.totalBags,
      }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [purchases]);
  
  const availableLotsOptions = getAvailableLotsForWarehouse(watchedFromWarehouseId);

  const handleOpenMasterForm = (type: "Warehouse" | "Transporter") => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as "Warehouse" | "Transporter", newItem);
    if (newItem.type === masterFormItemType) {
      if (newItem.type === "Warehouse") {
        // Could set fromWarehouseId or toWarehouseId if needed, but usually user selects after adding.
      } else if (newItem.type === "Transporter") {
        methods.setValue('transporterId', newItem.id, { shouldValidate: true });
      }
    }
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    toast({ title: `${newItem.type} "${newItem.name}" added successfully.` });
  };

  const processSubmit = (values: LocationTransferFormValues) => {
    setIsSubmitting(true);
    const fromWarehouse = warehouses.find(w => w.id === values.fromWarehouseId);
    const toWarehouse = warehouses.find(w => w.id === values.toWarehouseId);
    const transporter = transporters.find(t => t.id === values.transporterId);

    const transferData: LocationTransfer = {
      id: transferToEdit?.id || `lt-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      fromWarehouseId: values.fromWarehouseId,
      fromWarehouseName: fromWarehouse?.name,
      toWarehouseId: values.toWarehouseId,
      toWarehouseName: toWarehouse?.name,
      transporterId: values.transporterId,
      transporterName: transporter?.name,
      items: values.items.map(item => {
        // Calculate net weight based on average or a standard (e.g., 50kg/bag)
        // For simplicity here, let's use 50kg/bag. A more robust system would fetch avg weight.
        const { averageWeightPerBag } = getAvailableLotsForWarehouse(values.fromWarehouseId)
                                           .find(lot => lot.value === item.lotNumber) || { averageWeightPerBag: 50 };
        return {
          lotNumber: item.lotNumber,
          bagsToTransfer: item.bagsToTransfer,
          netWeightToTransfer: item.bagsToTransfer * averageWeightPerBag,
        };
      }),
      notes: values.notes,
    };
    onSubmit(transferData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{transferToEdit ? "Edit Location Transfer" : "New Location Transfer"}</DialogTitle>
            <DialogDescription>Transfer vakkals (lots) between your warehouse locations.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md shadow-sm">
                  <FormField control={control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Transfer Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="fromWarehouseId" render={({ field }) => (
                    <FormItem><FormLabel>From Warehouse</FormLabel>
                      <MasterDataCombobox name="fromWarehouseId" options={warehouses.map(w => ({ value: w.id, label: w.name }))} placeholder="Select Source" onAddNew={() => handleOpenMasterForm("Warehouse")} />
                      <FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="toWarehouseId" render={({ field }) => (
                    <FormItem><FormLabel>To Warehouse</FormLabel>
                      <MasterDataCombobox name="toWarehouseId" options={warehouses.map(w => ({ value: w.id, label: w.name }))} placeholder="Select Destination" onAddNew={() => handleOpenMasterForm("Warehouse")} />
                      <FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="transporterId" render={({ field }) => (
                    <FormItem className="md:col-span-3"><FormLabel>Transporter (Optional)</FormLabel>
                      <MasterDataCombobox name="transporterId" options={transporters.map(t => ({ value: t.id, label: t.name }))} placeholder="Select Transporter" onAddNew={() => handleOpenMasterForm("Transporter")} />
                      <FormMessage />
                    </FormItem>)}
                  />
                </div>

                <div className="p-4 border rounded-md shadow-sm space-y-4">
                  <h3 className="text-lg font-medium text-primary">Items to Transfer</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.lotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-6"><FormLabel>Vakkal/Lot No.</FormLabel>
                          <MasterDataCombobox name={`items.${index}.lotNumber`} options={availableLotsOptions} placeholder="Select Lot" disabled={!watchedFromWarehouseId} />
                          <FormMessage />
                        </FormItem>)}
                      />
                      <FormField control={control} name={`items.${index}.bagsToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-4"><FormLabel>Bags to Transfer</FormLabel>
                          <FormControl><Input type="number" placeholder="Bags" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                      <div className="md:col-span-2">
                        <Button type="button" variant="destructive" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", bagsToTransfer: 0 })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Vakkal
                  </Button>
                   {errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items) && (
                    <FormMessage>{errors.items.message}</FormMessage>
                   )}
                </div>
                
                <FormField control={control} name="notes" render={({ field }) => (
                  <FormItem className="p-4 border rounded-md shadow-sm">
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Add any notes for this transfer..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />

                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (transferToEdit ? "Saving..." : "Creating Transfer...") : (transferToEdit ? "Save Changes" : "Create Transfer")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {isMasterFormOpen && masterFormItemType && (
        <MasterForm
          isOpen={isMasterFormOpen}
          onClose={() => { setIsMasterFormOpen(false); setMasterFormItemType(null); }}
          onSubmit={handleMasterFormSubmit}
          itemTypeFromButton={masterFormItemType}
        />
      )}
    </>
  );
};
