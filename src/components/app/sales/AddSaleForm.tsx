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
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues } from "@/lib/schemas/saleSchema";
import type { MasterItem, Sale, MasterItemType, Customer, Transporter, Broker } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: MasterItem[];
  transporters: MasterItem[];
  brokers: Broker[];
  // TODO: Pass inventory lots for lotNumber dropdown
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  saleToEdit?: Sale | null;
}

const AddSaleFormComponent: React.FC<AddSaleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customers,
  transporters,
  brokers,
  onMasterDataUpdate,
  saleToEdit
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // const [showAddMasterDialog, setShowAddMasterDialog] = React.useState(false); // Not used currently
  // const [currentMasterType, setCurrentMasterType] = React.useState<MasterItemType | null>(null); // Not used currently

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber,
        billAmount: saleToEdit.billAmount,
        customerId: saleToEdit.customerId,
        lotNumber: saleToEdit.lotNumber, // Vakkal
        // itemName: saleToEdit.itemName, // REMOVED
        quantity: saleToEdit.quantity,
        netWeight: saleToEdit.netWeight,
        rate: saleToEdit.rate,
        transporterId: saleToEdit.transporterId,
        transportCost: saleToEdit.transportCost,
        brokerId: saleToEdit.brokerId,
        brokerageAmount: saleToEdit.brokerageAmount,
        notes: saleToEdit.notes,
      };
    }
    return {
      date: new Date(),
      billNumber: `INV-${Date.now().toString().slice(-6)}`,
      billAmount: undefined,
      customerId: undefined,
      lotNumber: "", // Vakkal
      // itemName: "", // REMOVED
      quantity: 0, 
      netWeight: 0, 
      rate: 0, 
      transporterId: undefined,
      transportCost: undefined,
      brokerId: undefined,
      brokerageAmount: undefined,
      notes: "",
    };
  }, [saleToEdit]);


  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema(customers, transporters, brokers)),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [saleToEdit, isOpen, form, getDefaultValues]);

  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  
  const calculatedBillAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    return isNaN(nw) || isNaN(r) ? 0 : nw * r;
  }, [netWeight, rate]);

  React.useEffect(() => {
    if (form.getValues("billAmount") === undefined || form.getValues("billAmount") === 0) {
        if (!form.formState.dirtyFields.billAmount) {
            form.setValue("billAmount", calculatedBillAmount, { shouldValidate: true });
        }
    }
  }, [calculatedBillAmount, form]);


  const handleAddNewMaster = (type: MasterItemType) => {
    // setCurrentMasterType(type); // This logic would typically open a separate MasterForm dialog
    // setShowAddMasterDialog(true); // This implies a modal for adding new master item from this form
    toast({ title: "Info", description: `Adding new ${type} would typically open a dedicated form. This feature is conceptual here.`});
  };

  const handleMasterItemAdded = React.useCallback((newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as MasterItemType, newItem);
    if (newItem.type === 'Customer') form.setValue('customerId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') form.setValue('transporterId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Broker') form.setValue('brokerId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added successfully!` });
  },[onMasterDataUpdate, form, toast]);

  const processSubmit = React.useCallback((values: SaleFormValues) => {
    setIsSubmitting(true);
    const finalBillAmount = values.billAmount && values.billAmount > 0 ? values.billAmount : calculatedBillAmount;
    const saleData: Sale = {
      id: saleToEdit ? saleToEdit.id : `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      billAmount: finalBillAmount,
      customerId: values.customerId,
      customerName: customers.find(c => c.id === values.customerId)?.name,
      lotNumber: values.lotNumber, // Vakkal
      // itemName: values.itemName, // REMOVED
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      totalAmount: finalBillAmount, 
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      transportCost: values.transportCost,
      brokerId: values.brokerId,
      brokerName: brokers.find(b => b.id === values.brokerId)?.name,
      brokerageAmount: values.brokerageAmount,
      notes: values.notes,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    form.reset(getDefaultValues());
    onClose();
  }, [
      saleToEdit, 
      calculatedBillAmount, 
      customers, 
      transporters, 
      brokers, 
      onSubmit, 
      form, 
      getDefaultValues, 
      onClose
    ]
  );
  
  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if(!open) {form.reset(getDefaultValues()); onClose(); }}}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>
              Enter the details for the sale record. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
              {/* Section: Basic Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Sale Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Sale Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="billNumber" render={({ field }) => (
                        <FormItem><FormLabel>Bill Number</FormLabel>
                        <FormControl><Input placeholder="e.g., INV-001" {...field} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="billAmount" render={({ field }) => (
                        <FormItem><FormLabel>Bill Amount (Optional)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="Auto if empty" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem className="mt-4">
                    <FormLabel>Customer</FormLabel>
                    <MasterDataCombobox 
                        items={customers} 
                        value={field.value} 
                        onChange={field.onChange}  
                        onAddNew={() => handleAddNewMaster("Customer")}
                        placeholder="Select Customer" 
                        searchPlaceholder="Search customers..." 
                        notFoundMessage="No customer found." 
                        addNewLabel="Add New Customer"/>
                    <FormMessage />
                     {form.formState.errors.customerId && (<FormMessage>{form.formState.errors.customerId?.message}</FormMessage>)}
                    </FormItem>
                )}/>
              </div>

              {/* Section: Product Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Product & Quantity</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4"> {/* Changed to 1 col for Vakkal, itemName removed */}
                    <FormField control={form.control} name="lotNumber" render={({ field }) => ( // TODO: Change to dropdown from inventory
                        <FormItem><FormLabel>Vakkal / Lot Number</FormLabel>
                        <FormControl><Input placeholder="Select Vakkal / Lot (text for now)" {...field} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                     {/* itemName FormField removed */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem><FormLabel>No. of Bags</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 50" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="netWeight" render={({ field }) => (
                        <FormItem><FormLabel>Net Weight (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 2500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="rate" render={({ field }) => (
                        <FormItem><FormLabel>Rate (₹/kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 30.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                </div>
              </div>
              
              {/* Section: Transport & Broker (Optional) */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Transport & Broker (Optional)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="transporterId" render={({ field }) => (
                        <FormItem> <FormLabel>Transporter</FormLabel>
                        <MasterDataCombobox 
                            items={transporters} 
                            value={field.value} 
                            onChange={field.onChange}  
                            onAddNew={() => handleAddNewMaster("Transporter")}
                            placeholder="Select Transporter" 
                            searchPlaceholder="Search transporters..." 
                            notFoundMessage="No transporter found." 
                            addNewLabel="Add New Transporter"/>
                        <FormMessage />
                         {form.formState.errors.transporterId && (<FormMessage>{form.formState.errors.transporterId?.message}</FormMessage>)}
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="transportCost" render={({ field }) => (
                        <FormItem><FormLabel>Transport Cost (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 1500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField control={form.control} name="brokerId" render={({ field }) => (
                        <FormItem> <FormLabel>Broker</FormLabel>
                        <MasterDataCombobox 
                            items={brokers} 
                            value={field.value} 
                            onChange={field.onChange}  
                            onAddNew={() => handleAddNewMaster("Broker")}
                            placeholder="Select Broker" 
                            searchPlaceholder="Search brokers..." 
                            notFoundMessage="No broker found." 
                            addNewLabel="Add New Broker"/>
                        <FormMessage />
                         {form.formState.errors.brokerId && (<FormMessage>{form.formState.errors.brokerId?.message}</FormMessage>)}
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="brokerageAmount" render={({ field }) => (
                        <FormItem><FormLabel>Brokerage Amount (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                 </div>
              </div>

              {/* Section: Notes */}
               <div className="p-4 border rounded-md shadow-sm">
                 <h3 className="text-lg font-medium mb-3 text-primary">Notes</h3>
                 <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any remarks for this sale..." {...field} /></FormControl><FormMessage />
                    </FormItem>
                )}/>
               </div>
              
              <div className="p-4 border border-dashed rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-lg font-semibold">
                        <Info className="w-5 h-5 mr-2 text-primary" />
                        Calculated Sale Value
                    </div>
                    <p className="text-2xl font-bold text-primary">
                    ₹{(form.watch("billAmount") || calculatedBillAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-7">
                    This is (Net Weight &times; Rate). Transport/Brokerage costs are separate.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => { form.reset(getDefaultValues()); onClose();}}>
                    Cancel
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (saleToEdit ? "Saving..." : "Adding...") : (saleToEdit ? "Save Changes" : "Add Sale")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AddSaleForm = React.memo(AddSaleFormComponent);
