"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import type { MasterItem, Purchase, MasterItemType, Broker } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { AddMasterItemDialog } from "@/components/shared/AddMasterItemDialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface AddPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (purchase: Purchase) => void;
  suppliers: MasterItem[];
  agents: MasterItem[];
  warehouses: MasterItem[]; // Used as Locations
  transporters: MasterItem[];
  brokers: Broker[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  purchaseToEdit?: Purchase | null;
}

export function AddPurchaseForm({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses, // Locations
  transporters,
  brokers,
  onMasterDataUpdate,
  purchaseToEdit
}: AddPurchaseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAddMasterDialog, setShowAddMasterDialog] = React.useState(false);
  const [currentMasterType, setCurrentMasterType] = React.useState<MasterItemType | null>(null);

  const getDefaultValues = (): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        lotNumber: purchaseToEdit.lotNumber,
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId,
        itemName: purchaseToEdit.itemName,
        quantity: purchaseToEdit.quantity,
        netWeight: purchaseToEdit.netWeight,
        rate: purchaseToEdit.rate,
        expenses: purchaseToEdit.expenses,
        transportRate: purchaseToEdit.transportRate,
        transporterId: purchaseToEdit.transporterId,
        brokerId: purchaseToEdit.brokerId,
        brokerageType: purchaseToEdit.brokerageType,
        brokerageValue: purchaseToEdit.brokerageValue,
      };
    }
    return {
      date: new Date(),
      lotNumber: "",
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      itemName: "", // e.g. Wheat
      quantity: 0, // Bags
      netWeight: 0, // KG
      rate: 0, // Per KG
      expenses: undefined,
      transportRate: undefined,
      transporterId: undefined,
      brokerId: undefined,
      brokerageType: undefined,
      brokerageValue: undefined,
    };
  };

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [purchaseToEdit, isOpen, form]); // form added to dependency array

  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  const expenses = form.watch("expenses") || 0;
  const transportRate = form.watch("transportRate") || 0; // Assuming this is total transport cost for the lot
  
  const brokerageType = form.watch("brokerageType");
  const brokerageValue = form.watch("brokerageValue") || 0;

  const calculatedBrokerageAmount = React.useMemo(() => {
    if (!brokerageType || !brokerageValue || !netWeight || !rate) return 0;
    const subTotal = netWeight * rate;
    if (brokerageType === 'Fixed') {
      return brokerageValue;
    } else if (brokerageType === 'Percentage') {
      return (subTotal * brokerageValue) / 100;
    }
    return 0;
  }, [brokerageType, brokerageValue, netWeight, rate]);
  

  const totalAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    const exp = parseFloat(String(expenses || 0));
    // Assuming transportRate is a total cost for the lot. If it's per kg, logic needs change.
    const trRate = parseFloat(String(transportRate || 0)); 
    
    if (isNaN(nw) || isNaN(r)) return 0;
    // More precise calculation: (Net Weight * Rate) + Expenses + Transport Rate + Brokerage Amount
    // For now, brokerage isn't part of the purchase total amount directly, it's a separate payable.
    // The definition of totalAmount might need clarification: is it (NW*Rate) or (NW*Rate + OtherDirectCosts)?
    // Based on typical accounting, total purchase cost for inventory valuation would include direct expenses.
    // Let's assume they are for now.
    return (nw * r) + exp + trRate;
  }, [netWeight, rate, expenses, transportRate]);


  const handleAddNewMaster = (type: MasterItemType) => {
    setCurrentMasterType(type);
    setShowAddMasterDialog(true);
  };

  const handleMasterItemAdded = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as MasterItemType, newItem); 
    if (newItem.type === 'Supplier') form.setValue('supplierId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Agent') form.setValue('agentId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Warehouse') form.setValue('locationId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') form.setValue('transporterId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Broker') form.setValue('brokerId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added successfully!` });
  };

  const processSubmit = (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    const purchaseData: Purchase = {
      id: purchaseToEdit ? purchaseToEdit.id : `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      lotNumber: values.lotNumber,
      locationId: values.locationId,
      locationName: warehouses.find(w => w.id === values.locationId)?.name,
      supplierId: values.supplierId,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      itemName: values.itemName,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      expenses: values.expenses,
      transportRate: values.transportRate,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      brokerId: values.brokerId,
      brokerName: brokers.find(b => b.id === values.brokerId)?.name,
      brokerageType: values.brokerageType,
      brokerageValue: values.brokerageValue,
      calculatedBrokerageAmount: calculatedBrokerageAmount,
      totalAmount: totalAmount, // Using the calculated total amount from useMemo
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    form.reset(getDefaultValues());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(getDefaultValues()); onClose(); } }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{purchaseToEdit ? 'Edit Purchase' : 'Add New Purchase'}</DialogTitle>
            <DialogDescription>
              Enter the details for the purchase record. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
              {/* Section: Basic Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Number</FormLabel>
                        <FormControl><Input placeholder="e.g., AB/6" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Warehouse)</FormLabel>
                        <MasterDataCombobox
                          items={warehouses}
                          value={field.value}
                          onChange={field.onChange}
                          onAddNew={() => handleAddNewMaster("Warehouse")}
                          placeholder="Select Location"
                          searchPlaceholder="Search locations..."
                          notFoundMessage="No location found."
                          addNewLabel="Add New Location"
                          itemIcon={WarehouseIcon}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section: Supplier Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Supplier &amp; Agent</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <MasterDataCombobox items={suppliers} value={field.value} onChange={field.onChange} onAddNew={() => handleAddNewMaster("Supplier")} placeholder="Select Supplier" searchPlaceholder="Search suppliers..." notFoundMessage="No supplier found." addNewLabel="Add New Supplier"/>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent (Optional)</FormLabel>
                        <MasterDataCombobox items={agents} value={field.value} onChange={field.onChange} onAddNew={() => handleAddNewMaster("Agent")} placeholder="Select Agent" searchPlaceholder="Search agents..." notFoundMessage="No agent found." addNewLabel="Add New Agent"/>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Section: Quantity Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Item &amp; Quantity</h3>
                 <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Item Name (Commodity)</FormLabel>
                        <FormControl><Input placeholder="e.g., Wheat, Soyabean" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Bags</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="netWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Weight (kg)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 10000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate (₹/kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 20.50" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                        control={form.control}
                        name="expenses"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Other Expenses (Optional)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., Packaging, Labour" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="transportRate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transport Cost (Lot Total, Optional)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="transporterId"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Transporter (Optional)</FormLabel>
                      <MasterDataCombobox items={transporters} value={field.value} onChange={field.onChange} onAddNew={() => handleAddNewMaster("Transporter")} placeholder="Select Transporter" searchPlaceholder="Search transporters..." notFoundMessage="No transporter found." addNewLabel="Add New Transporter"/>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section: Broker (Optional) */}
               <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Broker Details (Optional)</h3>
                <FormField
                    control={form.control}
                    name="brokerId"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Broker</FormLabel>
                        <MasterDataCombobox items={brokers} value={field.value} onChange={field.onChange} onAddNew={() => handleAddNewMaster("Broker")} placeholder="Select Broker" searchPlaceholder="Search brokers..." notFoundMessage="No broker found." addNewLabel="Add New Broker"/>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("brokerId") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name="brokerageType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brokerage Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select brokerage type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Fixed"><span className="flex items-center"><span className="mr-2">₹</span>Fixed Amount</span></SelectItem>
                                <SelectItem value="Percentage"><span className="flex items-center"><Percent className="w-4 h-4 mr-2"/>Percentage</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="brokerageValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brokerage Value</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder={brokerageType === 'Percentage' ? "% value" : "₹ amount"} {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                   {form.watch("brokerId") && brokerageType && brokerageValue > 0 && (
                     <div className="mt-3 text-sm text-muted-foreground">
                        Calculated Brokerage: ₹{calculatedBrokerageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </div>
                   )}
               </div>


              <div className="p-4 border border-dashed rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-lg font-semibold">
                        <Info className="w-5 h-5 mr-2 text-primary" />
                        Calculated Purchase Value
                    </div>
                    <p className="text-2xl font-bold text-primary">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-7">
                    (Net Weight &times; Rate) + Expenses + Transport Cost. Brokerage is handled separately.
                </p>
              </div>


              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => { form.reset(getDefaultValues()); onClose();}}>
                    Cancel
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (purchaseToEdit ? "Saving..." : "Adding...") : (purchaseToEdit ? "Save Changes" : "Add Purchase")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {currentMasterType && (
        <AddMasterItemDialog
          isOpen={showAddMasterDialog}
          onClose={() => setShowAddMasterDialog(false)}
          onAdd={handleMasterItemAdded}
          itemType={currentMasterType}
        />
      )}
    </>
  );
}
