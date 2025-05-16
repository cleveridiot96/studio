
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Info, Percent, Check } from "lucide-react";
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
  brokers: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
}
// Define a prop to indicate if the form is for editing (though editing is currently removed)
const AddPurchaseFormComponent: React.FC<AddPurchaseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses, // Locations
  transporters,
  brokers,
  onMasterDataUpdate, // This prop might need to be called by the MasterForm dialog
}) => { // purchaseToEdit prop removed
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // State to control the visibility of the MasterForm
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  // const [masterFormType, setMasterFormType] = React.useState<MasterItemType | null>(null);


  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    return {
      // Default values for a new purchase
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
  }, []); // Removed purchaseToEdit dependency as editing is not supported here

  const form = useForm<PurchaseFormValues>({ // Removed purchaseToEdit parameter from schema validation
    resolver: zodResolver(purchaseSchema(suppliers, agents, warehouses, transporters, brokers)),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
 form.reset(getDefaultValues()); // Removed purchaseToEdit dependency
  }, [isOpen, form, getDefaultValues]);

  // Potential workaround for hydration/timing issues with comboboxes
  React.useEffect(() => {
    if (isOpen) {
      // Add a small delay to allow hydration to complete
      const timer = setTimeout(() => {
        // You could try a dummy form setValue or trigger a state update here
        // For now, we just let the components re-render after the delay
      }, 100); // Adjust the delay as needed (e.g., 50ms, 200ms)

      return () => clearTimeout(timer); // Cleanup the timer
    }
  }, [isOpen]);

  const lotNumberValue = form.watch("lotNumber");
  const quantityValue = form.watch("quantity");

  React.useEffect(() => {
    if (lotNumberValue) {
      const match = lotNumberValue.match(/[/\-. ](\d+)$/);
      if (match && match[1]) {
        const bags = parseInt(match[1], 10);
        if (!isNaN(bags) && form.getValues("quantity") !== bags) {
           if (!form.formState.dirtyFields.quantity) { 
            form.setValue("quantity", bags, { shouldValidate: true });
           }
        }
      }
    }
  }, [lotNumberValue, form]);

  React.useEffect(() => {
    const currentQuantity = form.getValues("quantity");
    if (typeof currentQuantity === 'number' && currentQuantity > 0) {
      if (!form.formState.dirtyFields.netWeight) { 
        form.setValue("netWeight", currentQuantity * 50, { shouldValidate: true });
      }
    } else if (typeof currentQuantity === 'number' && currentQuantity === 0) {
        if (!form.formState.dirtyFields.netWeight) {
            form.setValue("netWeight", 0, { shouldValidate: true });
        }
    }
  }, [quantityValue, form]);


  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  const expenses = form.watch("expenses") || 0; // Use 0 for calculation if undefined
  const transportRatePerKg = form.watch("transportRatePerKg") || 0; // Use 0 for calculation if undefined
  const grossWeight = quantityValue * 50; // Assuming 50kg per bag for gross weight

  const totalAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    const exp = parseFloat(String(expenses || 0));
    const transportCost = parseFloat(String(transportRatePerKg || 0)) * grossWeight;
    if (isNaN(nw) || isNaN(r)) return 0;
    return (nw * r) + exp + transportCost;
  }, [netWeight, rate, expenses, transportRatePerKg, grossWeight]); // Removed brokerage dependencies


  const rateAfterExpenses = React.useMemo(() => {
    const total = totalAmount;
    const exp = parseFloat(String(expenses || 0));
    const nw = parseFloat(String(netWeight || 0));

    if (nw <= 0) return 0; // Avoid division by zero

    return (total - exp) / nw;
  }, [totalAmount, expenses, netWeight]);

    const handleAddNewMasterClicked = (type: MasterItemType) => {
    // This function should ideally open a global MasterForm dialog.
    // For now, it shows a toast and a placeholder for the actual dialog.
    // You would need to manage the state for this dialog (e.g., in a context or parent component).
    toast({ title: "Add New Master", description: `Opening form to add new ${type}... (Conceptual)` });
    // Example: setMasterFormType(type); setIsMasterFormOpen(true);
    // The onMasterDataUpdate prop would then be passed to that MasterForm.
  };
  
  const processSubmit = React.useCallback((values: PurchaseFormValues) => {
    setIsSubmitting(true);
    const purchaseData: Purchase = {
      id: `purchase-${Date.now()}`, // Always generate new ID as editing is removed
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
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name, // Use transporters prop
      totalAmount: totalAmount,
      // Broker fields removed
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    form.reset(getDefaultValues());
    onClose();
  }, [
      warehouses, // Used for locationName lookup
      suppliers, // Used for supplierName lookup
      agents, // Used for agentName lookup
      transporters, 
      onSubmit, 
      form, 
      getDefaultValues, 
      onClose
    ]
  );

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(getDefaultValues()); onClose(); } }}> {/* Reset form on close */}
        <DialogContent className="sm:max-w-3xl">
 <DialogHeader>
            <DialogTitle>Add New Purchase</DialogTitle>{/* Simplified as editing is removed */}
            <DialogDescription>Enter the details for the purchase record. Click save when you&apos;re done.</DialogDescription>
          </DialogHeader>
          <Form {...form}> {/* This provides the FormProvider context */}
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
                        <FormControl><Input placeholder="e.g., AB/6 or BU-5" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => ( // field prop is not directly used by new MasterDataCombobox
                      <FormItem>
                        <FormLabel>Location (Warehouse)</FormLabel>
                        <MasterDataCombobox
                          name="locationId" // react-hook-form field name
                          options={warehouses.filter(w => w.type === "Warehouse").map(w => ({ value: w.id, label: w.name, type: w.type }))}
                          placeholder="Select Location"
                          searchPlaceholder="Search locations..."
                          notFoundMessage="No location found."
                          addNewLabel="Add New Location"
                          onAddNew={() => handleAddNewMasterClicked("Warehouse")}
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
                        <MasterDataCombobox 
                            name="supplierId"
                            options={suppliers.filter(s => s.type === "Supplier").map(s => ({ value: s.id, label: s.name, type: s.type }))}
                            placeholder="Select Supplier" 
                            searchPlaceholder="Search suppliers..." 
                            notFoundMessage="No supplier found." 
                            addNewLabel="Add New Supplier"
                            onAddNew={() => handleAddNewMasterClicked("Supplier")}
                        />
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
                        <MasterDataCombobox 
                            name="agentId"
                            options={agents.filter(a => a.type === "Agent").map(a => ({ value: a.id, label: a.name, type: a.type }))}
                            placeholder="Select Agent" 
                            searchPlaceholder="Search agents..." 
                            notFoundMessage="No agent found." 
                            addNewLabel="Add New Agent"
                            onAddNew={() => handleAddNewMasterClicked("Agent")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Section: Quantity Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Quantity &amp; Rate</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Bags</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value || ''} onChange={e => { field.onChange(parseFloat(e.target.value) || 0); form.clearErrors("quantity"); }} /></FormControl>
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
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 10000" {...field} value={field.value || ''} onChange={e => { field.onChange(parseFloat(e.target.value) || 0); form.clearErrors("netWeight"); }} /></FormControl>
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
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 20.50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., Packaging, Labour" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="transportRate"
 render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport Rate (₹/kg, Optional)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
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
                      <MasterDataCombobox 
                        name="transporterId"
                        options={transporters.filter(t => t.type === "Transporter").map(t => ({ value: t.id, label: t.name, type: t.type }))}
                        placeholder="Select Transporter" 
                        searchPlaceholder="Search transporters..." 
                        notFoundMessage="No transporter found." 
                        addNewLabel="Add New Transporter"
                        onAddNew={() => handleAddNewMasterClicked("Transporter")}
                        />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               {/* Broker Details section removed */}

              <div className="p-4 border border-dashed rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-lg font-semibold">
                        <Info className="w-5 h-5 mr-2 text-primary" />
                        Calculated Total Purchase Value
                    </div>
                    <p className="text-2xl font-bold text-primary">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
 <p className="text-sm text-muted-foreground mt-2 pl-7">
 Rate after Expenses: <span className="font-semibold">₹{rateAfterExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>
 </p>
                <p className="text-xs text-muted-foreground mt-1 pl-7 italic">
                    (Net Weight &times; Rate) + Expenses + Transport Cost + Brokerage Commission.
                </p>
              </div>


              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => { form.reset(getDefaultValues()); onClose();}}>
                    Cancel
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Purchase"} {/* Simplified as editing is removed */}
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

