
"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas/purchaseSchema";
import type { MasterItem, Purchase, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";

interface AddPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (purchase: Purchase) => void;
  suppliers: MasterItem[];
  agents: MasterItem[];
  warehouses: MasterItem[];
  transporters: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  purchaseToEdit?: Purchase | null;
}

export const AddPurchaseForm: React.FC<AddPurchaseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses,
  transporters,
  onMasterDataUpdate,
  purchaseToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  
  const [quantityManuallySet, setQuantityManuallySet] = React.useState(false);
  const [netWeightManuallySet, setNetWeightManuallySet] = React.useState(false);
  const [transportChargesManuallySet, setTransportChargesManuallySet] = React.useState(false);
  const [brokerageChargesManuallySet, setBrokerageChargesManuallySet] = React.useState(false);


  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        lotNumber: purchaseToEdit.lotNumber,
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId || undefined,
        transporterId: purchaseToEdit.transporterId || undefined,
        quantity: purchaseToEdit.quantity,
        netWeight: purchaseToEdit.netWeight,
        rate: purchaseToEdit.rate,
        transportRatePerKg: purchaseToEdit.transportRatePerKg,
        transportCharges: purchaseToEdit.transportCharges,
        packingCharges: purchaseToEdit.packingCharges,
        labourCharges: purchaseToEdit.labourCharges,
        brokerageCharges: purchaseToEdit.brokerageCharges,
        miscExpenses: purchaseToEdit.miscExpenses,
      };
    }
    return {
      date: new Date(),
      lotNumber: "",
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      transporterId: undefined,
      quantity: 0,
      netWeight: 0,
      rate: 0,
      transportRatePerKg: undefined,
      transportCharges: undefined,
      packingCharges: undefined,
      labourCharges: undefined,
      brokerageCharges: undefined,
      miscExpenses: undefined,
    };
  }, [purchaseToEdit]);

  const methods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema(suppliers, agents, warehouses, transporters, [])),
    defaultValues: getDefaultValues(),
  });
  const { control, watch, setValue, handleSubmit: formHandleSubmit, reset, formState: { errors, dirtyFields } } = methods;

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setQuantityManuallySet(!!purchaseToEdit?.quantity); 
      setNetWeightManuallySet(!!purchaseToEdit?.netWeight);
      setTransportChargesManuallySet(!!purchaseToEdit?.transportCharges);
      setBrokerageChargesManuallySet(!!purchaseToEdit?.brokerageCharges);
    } else {
      setQuantityManuallySet(false);
      setNetWeightManuallySet(false);
      setTransportChargesManuallySet(false);
      setBrokerageChargesManuallySet(false);
    }
  }, [purchaseToEdit, isOpen, reset, getDefaultValues]);

  const lotNumberValue = watch("lotNumber");
  const quantityValue = watch("quantity");
  const transportRatePerKg = watch("transportRatePerKg");

  React.useEffect(() => {
    if (lotNumberValue && !quantityManuallySet && !dirtyFields.quantity) {
      const match = lotNumberValue.match(/[/\-. ](\d+)$/);
      if (match && match[1]) {
        const bags = parseInt(match[1], 10);
        if (!isNaN(bags) && bags > 0) {
          setValue("quantity", bags, { shouldValidate: true });
        }
      }
    }
  }, [lotNumberValue, setValue, dirtyFields.quantity, quantityManuallySet]);

  React.useEffect(() => {
    if (typeof quantityValue === 'number' && quantityValue > 0 && !netWeightManuallySet && !dirtyFields.netWeight) {
      setValue("netWeight", quantityValue * 50, { shouldValidate: true });
    }
    if (typeof quantityValue === 'number' && quantityValue > 0 && typeof transportRatePerKg === 'number' && transportRatePerKg > 0 && !transportChargesManuallySet) {
        const grossWeight = quantityValue * 50;
        setValue("transportCharges", grossWeight * transportRatePerKg, { shouldValidate: true });
    }
  }, [quantityValue, transportRatePerKg, setValue, dirtyFields.netWeight, netWeightManuallySet, transportChargesManuallySet]);
  
  const watchedAgentId = watch("agentId");
  const watchedNetWeight = watch("netWeight");
  const watchedRate = watch("rate");

  React.useEffect(() => {
    if (watchedAgentId && !brokerageChargesManuallySet && agents) {
      const agent = agents.find(a => a.id === watchedAgentId);
      if (agent && typeof agent.commission === 'number' && agent.commission > 0) {
        const currentGoodsValue = (watchedNetWeight || 0) * (watchedRate || 0);
        if (currentGoodsValue > 0) {
          const calculatedBrokerage = currentGoodsValue * (agent.commission / 100);
          setValue("brokerageCharges", parseFloat(calculatedBrokerage.toFixed(2)), { shouldValidate: true });
        } else {
          setValue("brokerageCharges", undefined, { shouldValidate: true });
        }
      } else if (!brokerageChargesManuallySet) {
        setValue("brokerageCharges", undefined, { shouldValidate: true });
      }
    }
  }, [watchedAgentId, watchedNetWeight, watchedRate, brokerageChargesManuallySet, setValue, agents]);


  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const transportCharges = watch("transportCharges") || 0;
  const packingCharges = watch("packingCharges") || 0;
  const labourCharges = watch("labourCharges") || 0;
  const brokerageCharges = watch("brokerageCharges") || 0;
  const miscExpenses = watch("miscExpenses") || 0;

  const goodsValue = React.useMemo(() => (netWeight || 0) * (rate || 0), [netWeight, rate]);
  const totalExpenses = React.useMemo(() => transportCharges + packingCharges + labourCharges + brokerageCharges + miscExpenses, [transportCharges, packingCharges, labourCharges, brokerageCharges, miscExpenses]);
  const totalAmount = React.useMemo(() => goodsValue + totalExpenses, [goodsValue, totalExpenses]);
  const effectiveRate = React.useMemo(() => (netWeight > 0 ? totalAmount / netWeight : 0), [totalAmount, netWeight]);

  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };
  
  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === masterFormItemType) {
        if (newItem.type === 'Supplier') methods.setValue('supplierId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Agent') methods.setValue('agentId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Warehouse') methods.setValue('locationId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    toast({ title: `${newItem.type} "${newItem.name}" added successfully and selected!` });
  };

  const processSubmit = (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    
    const calculatedGoodsValue = (values.netWeight || 0) * (values.rate || 0);
    const calculatedTotalExpenses = (values.transportCharges || 0) + (values.packingCharges || 0) + (values.labourCharges || 0) + (values.brokerageCharges || 0) + (values.miscExpenses || 0);
    const calculatedTotalAmount = calculatedGoodsValue + calculatedTotalExpenses;
    const calculatedEffectiveRate = values.netWeight > 0 ? calculatedTotalAmount / values.netWeight : 0;
    const transporter = transporters.find(t => t.id === values.transporterId);

    const purchaseData: Purchase = {
      id: purchaseToEdit?.id || `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      lotNumber: values.lotNumber,
      locationId: values.locationId as string,
      locationName: warehouses.find(w => w.id === values.locationId)?.name,
      supplierId: values.supplierId as string,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      transporterId: values.transporterId,
      transporterName: transporter?.name,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      transportRatePerKg: values.transportRatePerKg,
      transportCharges: values.transportCharges,
      packingCharges: values.packingCharges,
      labourCharges: values.labourCharges,
      brokerageCharges: values.brokerageCharges,
      miscExpenses: values.miscExpenses,
      totalAmount: calculatedTotalAmount,
      effectiveRate: calculatedEffectiveRate,
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{purchaseToEdit ? 'Edit Purchase' : 'Add New Purchase'}</DialogTitle>
            <DialogDescription>Enter the details for the purchase record. Click save when you&apos;re done.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}> 
              <form onSubmit={formHandleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Basic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Purchase Date</FormLabel>
                          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>)} />
                    <FormField control={control} name="lotNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vakkal / Lot Number</FormLabel>
                          <FormControl><Input placeholder="e.g., AB/6 or BU-5" {...field}
                              onChange={(e) => {
                                  field.onChange(e.target.value);
                                  setQuantityManuallySet(false); 
                                  setNetWeightManuallySet(false); 
                              }} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                    <FormField control={control} name="locationId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Warehouse)</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange}
                              options={warehouses.filter(w => w.type === "Warehouse").map(w => ({ value: w.id, label: w.name }))}
                              placeholder="Select Location" searchPlaceholder="Search locations..." notFoundMessage="No location found."
                              addNewLabel="Add New Location" onAddNew={() => handleOpenMasterForm("Warehouse")} />
                          <FormMessage />
                        </FormItem>)} />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Supplier &amp; Agent</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="supplierId" render={({ field }) => ( 
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange}
                              options={suppliers.filter(s => s.type === "Supplier").map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Select Supplier" searchPlaceholder="Search suppliers..." notFoundMessage="No supplier found." 
                              addNewLabel="Add New Supplier" onAddNew={() => handleOpenMasterForm("Supplier")} />
                          <FormMessage />
                        </FormItem>)} />
                    <FormField control={control} name="agentId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent (Optional)</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange}
                              options={agents.filter(a => a.type === "Agent").map(a => ({ value: a.id, label: a.name }))}
                              placeholder="Select Agent" searchPlaceholder="Search agents..." notFoundMessage="No agent found." 
                              addNewLabel="Add New Agent" onAddNew={() => handleOpenMasterForm("Agent")} />
                          <FormMessage />
                        </FormItem>)} />
                  </div>
                </div>
                
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Quantity &amp; Rate</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="quantity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Bags</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value || ''} 
                            onChange={e => { 
                                const val = parseFloat(e.target.value) || 0;
                                field.onChange(val); 
                                setQuantityManuallySet(true); 
                                if (!netWeightManuallySet) { setValue("netWeight", val * 50, { shouldValidate: true }); }
                            }} 
                            onFocus={() => setQuantityManuallySet(true)} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                    <FormField control={control} name="netWeight" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Weight (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000" {...field} value={field.value || ''} 
                            onChange={e => { field.onChange(parseFloat(e.target.value) || 0); setNetWeightManuallySet(true);}} 
                            onFocus={() => setNetWeightManuallySet(true)} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                    <FormField control={control} name="rate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹/kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 20.50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Expenses (Optional)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <FormField control={control} name="transporterId" render={({ field }) => (
                      <FormItem className="col-span-full sm:col-span-2">
                        <FormLabel>Transporter</FormLabel>
                        <MasterDataCombobox value={field.value} onChange={field.onChange} 
                          options={transporters.filter(t => t.type === 'Transporter').map((t) => ({ value: t.id, label: t.name }))}
                          placeholder="Select Transporter" addNewLabel="Add New Transporter" onAddNew={() => handleOpenMasterForm("Transporter")}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={control} name="transportRatePerKg" render={({ field }) => (<FormItem><FormLabel>Tpt. Rate/kg</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 17" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); setTransportChargesManuallySet(false); }} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="transportCharges" render={({ field }) => (<FormItem><FormLabel>Transport (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Auto" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); setTransportChargesManuallySet(true); }} onFocus={() => setTransportChargesManuallySet(true)} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                     <FormField control={control} name="packingCharges" render={({ field }) => (<FormItem><FormLabel>Packing (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Packing Cost" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="labourCharges" render={({ field }) => (<FormItem><FormLabel>Labour (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Labour Cost" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="brokerageCharges" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brokerage (₹)</FormLabel>
                           <div className="relative">
                            <FormControl><Input type="number" step="0.01" placeholder="Auto" {...field} value={field.value ?? ''} 
                              className={cn(brokerageChargesManuallySet && "pr-8")}
                              onChange={e => {
                                  field.onChange(parseFloat(e.target.value) || undefined);
                                  setBrokerageChargesManuallySet(true);
                              }} 
                              onFocus={() => setBrokerageChargesManuallySet(true)} /></FormControl>
                              {brokerageChargesManuallySet && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Reset to automatic calculation"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                    onClick={() => {
                                        setBrokerageChargesManuallySet(false);
                                        const agent = agents.find(a => a.id === watchedAgentId);
                                        if (agent && typeof agent.commission === 'number' && agent.commission > 0) {
                                            const currentGoodsValue = (watchedNetWeight || 0) * (watchedRate || 0);
                                            const calculatedBrokerage = currentGoodsValue * (agent.commission / 100);
                                            setValue("brokerageCharges", parseFloat(calculatedBrokerage.toFixed(2)), { shouldValidate: true });
                                        } else {
                                            setValue("brokerageCharges", undefined, { shouldValidate: true });
                                        }
                                    }}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>)} />
                     <FormField control={control} name="miscExpenses" render={({ field }) => (<FormItem><FormLabel>Misc. Exp (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Misc." {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                </div>

                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                      <div className="text-md font-semibold">Goods Value:</div>
                      <p className="text-md font-semibold">₹{goodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between">
                      <div className="text-md font-semibold">Total Expenses:</div>
                      <p className="text-md font-semibold">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                   <div className="flex items-center justify-between border-t pt-2 mt-2">
                      <div className="flex items-center text-md font-semibold text-primary"><Info className="w-5 h-5 mr-2" />Total Purchase Value:</div>
                      <p className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                   {netWeight > 0 && (
                    <p className="text-sm text-muted-foreground text-right">
                        Effective Landed Rate: <span className="font-semibold">₹{effectiveRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>
                    </p>
                   )}
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (purchaseToEdit ? "Saving..." : "Adding...") : (purchaseToEdit ? "Save Changes" : "Add Purchase")}
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
