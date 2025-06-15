
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
import { CalendarIcon, Info, Warehouse as WarehouseIcon, Percent } from "lucide-react";
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

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  
  const [quantityManuallySet, setQuantityManuallySet] = React.useState(false);
  const [netWeightManuallySet, setNetWeightManuallySet] = React.useState(false);


  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        lotNumber: purchaseToEdit.lotNumber,
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId || undefined,
        quantity: purchaseToEdit.quantity,
        netWeight: purchaseToEdit.netWeight,
        rate: purchaseToEdit.rate,
        expenses: purchaseToEdit.expenses || undefined,
        transportRatePerKg: purchaseToEdit.transportRatePerKg || undefined,
        transporterId: purchaseToEdit.transporterId || undefined,
      };
    }
    return {
      date: new Date(),
      lotNumber: "",
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      quantity: 0,
      netWeight: 0,
      rate: 0,
      expenses: undefined,
      transportRatePerKg: undefined,
      transporterId: undefined,
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
    } else {
      setQuantityManuallySet(false);
      setNetWeightManuallySet(false);
    }
  }, [purchaseToEdit, isOpen, reset, getDefaultValues]);


  const lotNumberValue = watch("lotNumber");
  const quantityValue = watch("quantity");

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
  }, [quantityValue, setValue, dirtyFields.netWeight, netWeightManuallySet]);


  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const expenses = watch("expenses") || 0;
  const transportRatePerKgValue = watch("transportRatePerKg") || 0;
  
  const calculatedTotalTransportCost = React.useMemo(() => {
    const bags = parseFloat(String(quantityValue || 0));
    const transportRateKg = parseFloat(String(transportRatePerKgValue || 0));
    if (isNaN(bags) || isNaN(transportRateKg) || bags <= 0 || transportRateKg <=0) return 0;
    const grossWeightForTransport = bags * 50; 
    return transportRateKg * grossWeightForTransport;
  }, [quantityValue, transportRatePerKgValue]);


  const totalAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    const exp = parseFloat(String(expenses || 0));
    
    if (isNaN(nw) || isNaN(r)) return 0;
    return (nw * r) + exp + calculatedTotalTransportCost;
  }, [netWeight, rate, expenses, calculatedTotalTransportCost]);


  const rateAfterExpensesAndTransport = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    if (nw <= 0) return 0;
    return totalAmount / nw;
  }, [netWeight, totalAmount]);


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
    
    const finalBags = parseFloat(String(values.quantity || 0));
    const finalTransportRatePerKg = parseFloat(String(values.transportRatePerKg || 0));
    const finalGrossWeightForTransport = finalBags * 50;
    const finalCalculatedTotalTransportCost = finalTransportRatePerKg * finalGrossWeightForTransport;

    const finalTotalAmount = (parseFloat(String(values.netWeight || 0)) * parseFloat(String(values.rate || 0))) + 
                             (parseFloat(String(values.expenses || 0))) + 
                             finalCalculatedTotalTransportCost;
    
    const finalEffectiveRate = (values.netWeight && values.netWeight > 0) ? finalTotalAmount / values.netWeight : 0;

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
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      expenses: values.expenses,
      transportRatePerKg: values.transportRatePerKg,
      transportRate: finalCalculatedTotalTransportCost, 
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      totalAmount: finalTotalAmount,
      effectiveRate: finalEffectiveRate,
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
                    <FormField
                      control={control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Purchase Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="lotNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vakkal / Lot Number</FormLabel>
                          <FormControl><Input 
                            placeholder="e.g., AB/6 or BU-5" 
                            {...field}
                            onChange={(e) => {
                                field.onChange(e.target.value);
                                setQuantityManuallySet(false); 
                                setNetWeightManuallySet(false); 
                            }}
                          /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Warehouse)</FormLabel>
                          <MasterDataCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={warehouses.filter(w => w.type === "Warehouse").map(w => ({ value: w.id, label: w.name }))}
                            placeholder="Select Location"
                            searchPlaceholder="Search locations..."
                            notFoundMessage="No location found."
                            addNewLabel="Add New Location"
                            onAddNew={() => handleOpenMasterForm("Warehouse")}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Supplier &amp; Agent</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="supplierId"
                      render={({ field }) => ( 
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <MasterDataCombobox 
                              value={field.value}
                              onChange={field.onChange}
                              options={suppliers.filter(s => s.type === "Supplier").map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Select Supplier" 
                              searchPlaceholder="Search suppliers..." 
                              notFoundMessage="No supplier found." 
                              addNewLabel="Add New Supplier"
                              onAddNew={() => handleOpenMasterForm("Supplier")}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="agentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent (Optional)</FormLabel>
                          <MasterDataCombobox 
                              value={field.value}
                              onChange={field.onChange}
                              options={agents.filter(a => a.type === "Agent").map(a => ({ value: a.id, label: a.name }))}
                              placeholder="Select Agent" 
                              searchPlaceholder="Search agents..." 
                              notFoundMessage="No agent found." 
                              addNewLabel="Add New Agent"
                              onAddNew={() => handleOpenMasterForm("Agent")}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Quantity &amp; Rate</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Bags</FormLabel>
                          <FormControl><Input 
                            type="number" 
                            placeholder="e.g., 100" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={e => { 
                                const val = parseFloat(e.target.value) || 0;
                                field.onChange(val); 
                                setQuantityManuallySet(true); 
                                if (!netWeightManuallySet) {
                                    setValue("netWeight", val * 50, { shouldValidate: true });
                                }
                            }} 
                            onFocus={() => setQuantityManuallySet(true)}
                          /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="netWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Weight (kg)</FormLabel>
                          <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 5000" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={e => { field.onChange(parseFloat(e.target.value) || 0); setNetWeightManuallySet(true);}} 
                            onFocus={() => setNetWeightManuallySet(true)}
                          /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹/kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 20.50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Transport</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                          control={control}
                          name="expenses"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Other Expenses (₹, Optional)</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder="e.g., Packaging" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={control}
                          name="transportRatePerKg"
                          render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transport Rate (₹/kg, Optional)</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder="e.g., 0.50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
                            <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                      control={control}
                      name="transporterId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Transporter (Optional)</FormLabel>
                          <MasterDataCombobox 
                              value={field.value}
                              onChange={field.onChange}
                              options={transporters.filter(t => t.type === "Transporter").map(t => ({ value: t.id, label: t.name }))}
                              placeholder="Select Transporter" 
                              searchPlaceholder="Search transporters..." 
                              notFoundMessage="No transporter found." 
                              addNewLabel="Add New Transporter"
                              onAddNew={() => handleOpenMasterForm("Transporter")}
                              />
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  </div>
                </div>

                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center text-md font-semibold">
                          <Info className="w-5 h-5 mr-2 text-primary" />
                          Calculated Total Purchase Value:
                      </div>
                      <p className="text-xl font-bold text-primary">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                  </div>
                   {netWeight > 0 && (
                    <p className="text-sm text-muted-foreground pl-7">
                        Effective Rate (incl. expenses & transport): <span className="font-semibold">₹{rateAfterExpensesAndTransport.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>
                    </p>
                   )}
                   {calculatedTotalTransportCost > 0 && (
                    <p className="text-sm text-muted-foreground pl-7">
                        Calculated Total Transport Cost: <span className="font-semibold">₹{calculatedTotalTransportCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                   )}
                </div>


                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                      </Button>
                  </DialogClose>
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
          onClose={() => {
            setIsMasterFormOpen(false);
            setMasterFormItemType(null);
          }}
          onSubmit={handleMasterFormSubmit}
          itemTypeFromButton={masterFormItemType}
        />
      )}
    </>
  );
};
