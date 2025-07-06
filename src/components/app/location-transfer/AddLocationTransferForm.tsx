
"use client";

import * as React from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { locationTransferSchema, type LocationTransferFormValues } from "@/lib/schemas/locationTransferSchema";
import type { MasterItem, Warehouse, Transporter, LocationTransfer, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";

const DEFAULT_TRANSPORT_RATE_PER_KG = 17;

interface AggregatedStockItemForForm {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  currentWeight: number;
  averageWeightPerBag: number;
}

interface AddLocationTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transfer: LocationTransfer) => void;
  warehouses: Warehouse[];
  transporters: Transporter[];
  availableStock: AggregatedStockItemForForm[];
  onMasterDataUpdate: (type: "Warehouse" | "Transporter", item: MasterItem) => void;
  transferToEdit?: LocationTransfer | null;
}

export const AddLocationTransferForm: React.FC<AddLocationTransferFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  warehouses,
  transporters,
  availableStock,
  onMasterDataUpdate,
  transferToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  const [transportChargesManuallySet, setTransportChargesManuallySet] = React.useState(false);
  
  const formSchema = React.useMemo(() => locationTransferSchema(warehouses, transporters, availableStock, transferToEdit), [warehouses, transporters, availableStock, transferToEdit]);

  const getDefaultValues = React.useCallback((): LocationTransferFormValues => {
    if (transferToEdit) {
      return {
          date: new Date(transferToEdit.date),
          fromWarehouseId: transferToEdit.fromWarehouseId,
          toWarehouseId: transferToEdit.toWarehouseId,
          transporterId: transferToEdit.transporterId || undefined,
          transportRatePerKg: transferToEdit.transportRatePerKg || DEFAULT_TRANSPORT_RATE_PER_KG,
          transportCharges: transferToEdit.transportCharges,
          packingCharges: transferToEdit.packingCharges,
          loadingCharges: transferToEdit.loadingCharges,
          miscExpenses: transferToEdit.miscExpenses,
          notes: transferToEdit.notes || "",
          items: transferToEdit.items.map(item => ({
            originalLotNumber: item.originalLotNumber,
            bagsToTransfer: item.bagsToTransfer,
            netWeightToTransfer: item.netWeightToTransfer,
            grossWeightToTransfer: item.grossWeightToTransfer
          })),
        };
    }
    return {
        date: new Date(),
        fromWarehouseId: undefined,
        toWarehouseId: undefined,
        transporterId: undefined,
        transportRatePerKg: DEFAULT_TRANSPORT_RATE_PER_KG,
        transportCharges: undefined,
        packingCharges: undefined,
        loadingCharges: undefined,
        miscExpenses: undefined,
        notes: "",
        items: [{ originalLotNumber: "", bagsToTransfer: 0, netWeightToTransfer: 0, grossWeightToTransfer: 0 }],
      };
  }, [transferToEdit]);


  const methods = useForm<LocationTransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedFromWarehouseId = watch("fromWarehouseId");
  const watchedItems = watch("items");
  const watchedTransportRate = watch("transportRatePerKg");

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setTransportChargesManuallySet(!!transferToEdit?.transportCharges);
    }
  }, [isOpen, transferToEdit, reset, getDefaultValues]);


  React.useEffect(() => {
    if (transportChargesManuallySet) return;
    
    const totalGrossWeight = watchedItems.reduce((acc, item) => acc + (item.grossWeightToTransfer || 0), 0);
    const rate = watchedTransportRate || 0;
    if (totalGrossWeight > 0 && rate > 0) {
        setValue('transportCharges', parseFloat((totalGrossWeight * rate).toFixed(2)), { shouldValidate: true });
    } else if (!transportChargesManuallySet) { // Only clear if not manually set
        setValue('transportCharges', undefined);
    }
  }, [watchedItems, watchedTransportRate, setValue, transportChargesManuallySet]);


  const getAvailableLotsForSelectedWarehouse = React.useCallback((): { value: string; label: string; availableBags: number, averageWeightPerBag: number }[] => {
    if (!watchedFromWarehouseId) return [];
    return availableStock
      .filter(item => item.locationId === watchedFromWarehouseId && item.currentBags > 0)
      .map(item => ({
        value: item.lotNumber,
        label: `${item.lotNumber} (Avl: ${item.currentBags} bags)`,
        availableBags: item.currentBags,
        averageWeightPerBag: item.averageWeightPerBag,
      }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [availableStock, watchedFromWarehouseId]);

  const availableLotsOptions = getAvailableLotsForSelectedWarehouse();

  const handleOpenMasterForm = (type: "Warehouse" | "Transporter") => {
    setMasterFormItemType(type as MasterItemType);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as "Warehouse" | "Transporter", newItem);
    if (newItem.type === "Transporter") {
        methods.setValue('transporterId', newItem.id, { shouldValidate: true });
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
      fromWarehouseName: fromWarehouse?.name || values.fromWarehouseId,
      toWarehouseId: values.toWarehouseId,
      toWarehouseName: toWarehouse?.name || values.toWarehouseId,
      transporterId: values.transporterId,
      transporterName: transporter?.name,
      transportRatePerKg: values.transportRatePerKg,
      transportCharges: values.transportCharges,
      packingCharges: values.packingCharges,
      loadingCharges: values.loadingCharges,
      miscExpenses: values.miscExpenses,
      items: values.items.map(item => ({
        originalLotNumber: item.originalLotNumber,
        newLotNumber: `${item.originalLotNumber}/${item.bagsToTransfer}`,
        bagsToTransfer: item.bagsToTransfer,
        netWeightToTransfer: item.netWeightToTransfer,
        grossWeightToTransfer: item.grossWeightToTransfer,
      })),
      notes: values.notes,
    };
    onSubmit(transferData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{transferToEdit ? "Edit Location Transfer" : "New Location Transfer"}</DialogTitle>
            <DialogDescription>Transfer vakkals (lots) between your warehouse locations and record associated expenses.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-3">
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Transfer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Transfer Date</FormLabel>
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
                        </Popover>
                        <FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="fromWarehouseId" render={({ field }) => (
                      <FormItem><FormLabel>From Warehouse</FormLabel>
                        <MasterDataCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          placeholder="Select Source"
                          onAddNew={() => handleOpenMasterForm("Warehouse")}
                        />
                        <FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="toWarehouseId" render={({ field }) => (
                      <FormItem><FormLabel>To Warehouse</FormLabel>
                        <MasterDataCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          placeholder="Select Destination"
                          onAddNew={() => handleOpenMasterForm("Warehouse")}
                        />
                        <FormMessage />
                      </FormItem>)}
                    />
                  </div>
                </div>
                
                <div className="p-4 border rounded-md shadow-sm space-y-4">
                  <h3 className="text-lg font-medium text-primary">Items to Transfer</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.originalLotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-5"><FormLabel>Vakkal/Lot No.</FormLabel>
                          <MasterDataCombobox
                            value={itemField.value}
                            onChange={itemField.onChange}
                            options={availableLotsOptions}
                            placeholder="Select Lot"
                            disabled={!watchedFromWarehouseId}
                          />
                          <FormMessage />
                        </FormItem>)}
                      />
                      <FormField control={control} name={`items.${index}.bagsToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel>
                          <FormControl><Input type="number" placeholder="Bags" {...itemField}
                            onChange={e => {
                              const bagsVal = parseFloat(e.target.value) || 0;
                              itemField.onChange(bagsVal);
                              setValue(`items.${index}.grossWeightToTransfer`, bagsVal * 50, { shouldValidate: true });
                              const lotValue = watch(`items.${index}.originalLotNumber`);
                              const stockInfo = availableStock.find(s => s.lotNumber === lotValue && s.locationId === watchedFromWarehouseId);
                              const avgWeightPerBag = stockInfo?.averageWeightPerBag || 50;
                              let newNetWeight = 0;
                              if (bagsVal > 0 && !isNaN(avgWeightPerBag)) {
                                newNetWeight = parseFloat((bagsVal * avgWeightPerBag).toFixed(2));
                              }
                              setValue(`items.${index}.netWeightToTransfer`, newNetWeight, { shouldValidate: true });
                            }}
                            /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                       <FormField control={control} name={`items.${index}.netWeightToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Net Wt. (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Net Wt." {...itemField} /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                       <FormField control={control} name={`items.${index}.grossWeightToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Gross Wt. (kg)</FormLabel>
                          <FormControl><Input type="number" placeholder="Gross Wt." {...itemField} /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                      <div className="md:col-span-1 flex items-end justify-end">
                        <Button type="button" variant="destructive" size="icon" onClick={() => (fields.length > 1 ? remove(index) : null)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ originalLotNumber: "", bagsToTransfer: 0, netWeightToTransfer: 0, grossWeightToTransfer: 0 })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Vakkal
                  </Button>
                   {typeof errors.items === 'object' && !Array.isArray(errors.items) && errors.items.message && (
                    <FormMessage>{errors.items.message as string}</FormMessage>
                   )}
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Transfer Expenses (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <FormField control={control} name="transporterId" render={({ field }) => (
                      <FormItem className="lg:col-span-2"><FormLabel>Transporter</FormLabel>
                        <MasterDataCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={transporters.filter(t => t.type === 'Transporter').map(t => ({ value: t.id, label: t.name }))}
                          placeholder="Select Transporter"
                          onAddNew={() => handleOpenMasterForm("Transporter")}
                        />
                        <FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="transportRatePerKg" render={({ field }) => (
                        <FormItem><FormLabel>Rate (₹/kg)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g. 17" {...field}
                                value={field.value ?? ''}
                                onChange={e => {
                                    field.onChange(parseFloat(e.target.value) || undefined);
                                    setTransportChargesManuallySet(false);
                                }}
                            /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={control} name="transportCharges" render={({ field }) => (
                        <FormItem><FormLabel>Total Transport (₹)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="Calculated..." {...field}
                                value={field.value ?? ''}
                                onChange={e => {
                                    field.onChange(parseFloat(e.target.value) || undefined);
                                    setTransportChargesManuallySet(true);
                                }}
                                onFocus={() => setTransportChargesManuallySet(true)}
                            /></FormControl>
                            <FormDescription className="text-xs">
                              Calculated from weight & rate. Can be overridden.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={control} name="miscExpenses" render={({ field }) => (<FormItem><FormLabel>Misc. (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 300" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
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
