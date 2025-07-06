
"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, Info, Percent, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas/purchaseSchema";
import type { MasterItem, Purchase, MasterItemType, PurchaseItem } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId || undefined,
        transporterId: purchaseToEdit.transporterId || undefined,
        items: purchaseToEdit.items.map(item => ({
            lotNumber: item.lotNumber,
            quantity: item.quantity,
            netWeight: item.netWeight,
            rate: item.rate
        })),
        transportCharges: purchaseToEdit.transportCharges,
        packingCharges: purchaseToEdit.packingCharges,
        labourCharges: purchaseToEdit.labourCharges,
        brokerageType: purchaseToEdit.brokerageType,
        brokerageValue: purchaseToEdit.brokerageValue,
        miscExpenses: purchaseToEdit.miscExpenses,
      };
    }
    return {
      date: new Date(),
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      transporterId: undefined,
      items: [{ lotNumber: "", quantity: 0, netWeight: 0, rate: 0 }],
      transportCharges: undefined,
      packingCharges: undefined,
      labourCharges: undefined,
      brokerageType: undefined,
      brokerageValue: undefined,
      miscExpenses: undefined,
    };
  }, [purchaseToEdit]);

  const methods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema(suppliers, agents, warehouses, transporters, [])),
    defaultValues: getDefaultValues(),
  });
  const { control, watch, setValue, handleSubmit: formHandleSubmit, reset, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
    }
  }, [purchaseToEdit, isOpen, reset, getDefaultValues]);

  const watchedItems = watch("items");
  const watchedAgentId = watch("agentId");
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageValue");
  const transportCharges = watch("transportCharges") || 0;
  const packingCharges = watch("packingCharges") || 0;
  const labourCharges = watch("labourCharges") || 0;
  const miscExpenses = watch("miscExpenses") || 0;

  const totalGoodsValue = React.useMemo(() => watchedItems.reduce((acc, item) => acc + ((item.netWeight || 0) * (item.rate || 0)), 0), [watchedItems]);
  
  const calculatedBrokerageCharges = React.useMemo(() => {
    if (!watchedAgentId || brokerageValue === undefined || brokerageValue < 0) return 0;
    if (brokerageType === "Percentage") {
      return (totalGoodsValue * (brokerageValue / 100));
    } else if (brokerageType === "Fixed") {
      return brokerageValue;
    }
    return 0;
  }, [watchedAgentId, brokerageType, brokerageValue, totalGoodsValue]);

  const totalExpenses = React.useMemo(() => transportCharges + packingCharges + labourCharges + calculatedBrokerageCharges + miscExpenses, [transportCharges, packingCharges, labourCharges, calculatedBrokerageCharges, miscExpenses]);
  const totalAmount = React.useMemo(() => totalGoodsValue + totalExpenses, [totalGoodsValue, totalExpenses]);
  const totalNetWeight = React.useMemo(() => watchedItems.reduce((acc, item) => acc + (item.netWeight || 0), 0), [watchedItems]);
  const effectiveRate = React.useMemo(() => (totalNetWeight > 0 ? totalAmount / totalNetWeight : 0), [totalAmount, totalNetWeight]);

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
    
    const finalBrokerageCharges = calculatedBrokerageCharges;
    const finalTotalExpenses = (values.transportCharges || 0) + (values.packingCharges || 0) + (values.labourCharges || 0) + finalBrokerageCharges + (values.miscExpenses || 0);
    const finalTotalGoodsValue = values.items.reduce((sum, item) => sum + (item.netWeight * item.rate), 0);
    const finalTotalAmount = finalTotalGoodsValue + finalTotalExpenses;
    const finalTotalNetWeight = values.items.reduce((sum, item) => sum + item.netWeight, 0);
    const finalEffectiveRate = finalTotalNetWeight > 0 ? finalTotalAmount / finalTotalNetWeight : 0;
    const finalTotalQuantity = values.items.reduce((sum, item) => sum + item.quantity, 0);

    const purchaseData: Purchase = {
      id: purchaseToEdit?.id || `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      locationId: values.locationId as string,
      locationName: warehouses.find(w => w.id === values.locationId)?.name,
      supplierId: values.supplierId as string,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      items: values.items.map(item => ({...item, goodsValue: item.netWeight * item.rate})),
      totalGoodsValue: finalTotalGoodsValue,
      totalQuantity: finalTotalQuantity,
      totalNetWeight: finalTotalNetWeight,
      transportCharges: values.transportCharges,
      packingCharges: values.packingCharges,
      labourCharges: values.labourCharges,
      brokerageType: values.brokerageType,
      brokerageValue: values.brokerageValue,
      brokerageCharges: finalBrokerageCharges,
      miscExpenses: values.miscExpenses,
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
        <DialogContent className="sm:max-w-4xl">
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
                              <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus />
                            </PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>)} />
                     <FormField control={control} name="supplierId" render={({ field }) => ( 
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange}
                              options={suppliers.filter(s => s.type === "Supplier").map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Select Supplier" searchPlaceholder="Search suppliers..." notFoundMessage="No supplier found." 
                              addNewLabel="Add New Supplier" onAddNew={() => handleOpenMasterForm("Supplier")} />
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
                  <h3 className="text-lg font-medium text-primary">Items</h3>
                   {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.lotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-5"><FormLabel>Vakkal/Lot No.</FormLabel>
                          <FormControl><Input placeholder="e.g., AB/6 or BU-5" {...itemField} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel>
                          <FormControl><Input type="number" placeholder="Bags" {...itemField} value={itemField.value === 0 ? '' : itemField.value} 
                            onChange={e => {
                                const bagsVal = parseFloat(e.target.value) || 0;
                                itemField.onChange(bagsVal);
                                // Auto-calculate net weight, assuming 50kg/bag as a default
                                setValue(`items.${index}.netWeight`, bagsVal * 50, { shouldValidate: true });
                            }} /></FormControl>
                          <FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.netWeight`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Net Wt.</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Kg" {...itemField} value={itemField.value === 0 ? '' : itemField.value} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.rate`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Rate</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="₹/kg" {...itemField} value={itemField.value === 0 ? '' : itemField.value} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)}/></FormControl>
                          <FormMessage /></FormItem>)} />
                      <div className="md:col-span-1 flex items-end justify-end">
                        <Button type="button" variant="destructive" size="icon" onClick={() => (fields.length > 1 ? remove(index) : null)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", quantity: 0, netWeight: 0, rate: 0 })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Agent</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                     <FormField control={control} name="agentId" render={({ field }) => (
                        <FormItem className="col-span-full sm:col-span-1">
                          <FormLabel>Agent (Optional)</FormLabel>
                          <MasterDataCombobox
                            value={field.value}
                            onChange={(newAgentId) => {
                              field.onChange(newAgentId);
                              if (newAgentId) {
                                const agent = agents.find(a => a.id === newAgentId);
                                if (agent && typeof agent.commission === 'number' && agent.commission >= 0) {
                                  setValue("brokerageType", "Percentage", { shouldValidate: true });
                                  setValue("brokerageValue", agent.commission, { shouldValidate: true });
                                }
                              } else {
                                setValue("brokerageType", undefined);
                                setValue("brokerageValue", undefined);
                              }
                            }}
                            options={agents.filter(a => a.type === "Agent").map(a => ({ value: a.id, label: a.name }))}
                            placeholder="Select Agent"
                            addNewLabel="Add New Agent"
                            onAddNew={() => handleOpenMasterForm("Agent")}
                          />
                          <FormMessage />
                        </FormItem>)} />
                    {watchedAgentId && (
                        <>
                          <FormField control={control} name="brokerageType" render={({ field }) => (
                            <FormItem><FormLabel>Brokerage Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!watchedAgentId}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                                  <SelectItem value="Percentage">%</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={control} name="brokerageValue" render={({ field }) => (
                            <FormItem><FormLabel>Value</FormLabel>
                              <div className="relative">
                                <FormControl><Input type="number" step="0.01" placeholder="Value" {...field} value={field.value === 0 ? '' : field.value}
                                  onChange={e => { field.onChange(parseFloat(e.target.value) || 0); }}
                                  disabled={!watchedAgentId || !brokerageType}
                                  className={brokerageType === 'Percentage' ? "pr-8" : ""}
                                /></FormControl>
                                {brokerageType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </>
                      )}
                  </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                     <FormField control={control} name="transporterId" render={({ field }) => (
                      <FormItem className="col-span-full sm:col-span-2"><FormLabel>Transporter</FormLabel>
                        <MasterDataCombobox value={field.value} onChange={field.onChange} 
                          options={transporters.filter(t => t.type === 'Transporter').map((t) => ({ value: t.id, label: t.name }))}
                          placeholder="Select Transporter" addNewLabel="Add New Transporter" onAddNew={() => handleOpenMasterForm("Transporter")}
                        />
                        <FormMessage />
                      </FormItem>)} />
                     <FormField control={control} name="transportCharges" render={({ field }) => (<FormItem><FormLabel>Transport (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="packingCharges" render={({ field }) => (<FormItem><FormLabel>Packing (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="labourCharges" render={({ field }) => (<FormItem><FormLabel>Labour (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 300" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="miscExpenses" render={({ field }) => (<FormItem><FormLabel>Misc. Exp (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 150" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                </div>

                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                      <div className="text-md font-semibold">Goods Value:</div>
                      <p className="text-md font-semibold">₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between">
                      <div className="text-md font-semibold">Total Expenses:</div>
                      <p className="text-md font-semibold">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                   <div className="flex items-center justify-between border-t pt-2 mt-2">
                      <div className="flex items-center text-md font-semibold text-primary"><Info className="w-5 h-5 mr-2" />Total Purchase Value:</div>
                      <p className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                   {totalNetWeight > 0 && (
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
