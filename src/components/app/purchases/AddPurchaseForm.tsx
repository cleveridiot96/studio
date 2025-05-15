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
import { CalendarIcon, Info, Warehouse as WarehouseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas/purchaseSchema";
import type { MasterItem, Purchase, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";

interface AddPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (purchase: Purchase) => void;
  suppliers: MasterItem[];
  agents: MasterItem[];
  warehouses: MasterItem[]; // Used as Locations
  transporters: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  purchaseToEdit?: Purchase | null;
}

const AddPurchaseFormComponent: React.FC<AddPurchaseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses, // Locations
  transporters,
  onMasterDataUpdate,
  purchaseToEdit
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        lotNumber: purchaseToEdit.lotNumber, // Vakkal
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId,
        quantity: purchaseToEdit.quantity,
        netWeight: purchaseToEdit.netWeight,
        rate: purchaseToEdit.rate,
        expenses: purchaseToEdit.expenses,
        transportRate: purchaseToEdit.transportRate,
        transporterId: purchaseToEdit.transporterId,
      };
    }
    return {
      date: new Date(),
      lotNumber: "", // Vakkal
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      quantity: 0, // Bags
      netWeight: 0, // KG
      rate: 0, // Per KG
      expenses: undefined,
      transportRate: undefined,
      transporterId: undefined,
    };
  }, [purchaseToEdit]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema(suppliers.filter(s => s.bifurcation === 'Suppliers'), agents.filter(a => a.bifurcation === 'Agents'), warehouses, transporters.filter(t => t.bifurcation === 'Transporters'))),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [purchaseToEdit, isOpen, form, getDefaultValues]);

  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  const expenses = form.watch("expenses") || 0;
  const transportRate = form.watch("transportRate") || 0; 
  

  const totalAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    const exp = parseFloat(String(expenses || 0));
    const trRate = parseFloat(String(transportRate || 0)); 
    
    if (isNaN(nw) || isNaN(r)) return 0;
    return (nw * r) + exp + trRate;
  }, [netWeight, rate, expenses, transportRate]);


  const handleAddNewMaster = (type: MasterItemType) => {
    toast({ title: "Info", description: `Adding new ${type} would typically open a dedicated form. This feature is conceptual here.`});
  };

  const handleMasterItemAdded = React.useCallback((newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as MasterItemType, newItem); 
    if (newItem.type === 'Supplier') form.setValue('supplierId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Agent') form.setValue('agentId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Warehouse') form.setValue('locationId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') form.setValue('transporterId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added successfully!` });
  }, [onMasterDataUpdate, form, toast]);

  const processSubmit = React.useCallback((values: PurchaseFormValues) => {
    setIsSubmitting(true);
    const purchaseData: Purchase = {
      id: purchaseToEdit ? purchaseToEdit.id : `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      lotNumber: values.lotNumber, // Vakkal
      locationId: values.locationId,
      locationName: warehouses.find(w => w.id === values.locationId)?.name,
      supplierId: values.supplierId,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      expenses: values.expenses,
      transportRate: values.transportRate,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      totalAmount: totalAmount,
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    form.reset(getDefaultValues());
    onClose();
  }, [
      purchaseToEdit, 
      warehouses, 
      suppliers, 
      agents, 
      transporters, 
      totalAmount, 
      onSubmit, 
      form, 
      getDefaultValues, 
      onClose
    ]
  );

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
                        <FormLabel>Vakkal / Lot Number</FormLabel>
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
                        {form.formState.errors.locationId && (<FormMessage>{form.formState.errors.locationId?.message}</FormMessage>)}
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
                         {form.formState.errors.supplierId && (<FormMessage>{form.formState.errors.supplierId?.message}</FormMessage>)}
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
                         {form.formState.errors.agentId && (<FormMessage>{form.formState.errors.agentId?.message}</FormMessage>)}
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Section: Quantity Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Quantity &amp; Rate</h3>
                 {/* itemName FormField removed */}
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
                      {form.formState.errors.transporterId && (<FormMessage>{form.formState.errors.transporterId?.message}</FormMessage>)}
                    </FormItem>
                  )}
                />
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
                    (Net Weight &times; Rate) + Expenses + Transport Cost.
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
    </>
  );
}
export const AddPurchaseForm = React.memo(AddPurchaseFormComponent);
