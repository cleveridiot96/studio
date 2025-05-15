
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
import { CalendarIcon, Info, Percent, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues } from "@/lib/schemas/saleSchema";
import type { MasterItem, Sale, MasterItemType, Purchase } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: MasterItem[];
  transporters: MasterItem[];
  brokers: MasterItem[];
  inventory: Purchase[]; // Use Purchase[] as inventory source for lot details
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
  inventory, 
  onMasterDataUpdate,
  saleToEdit
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber,
        billAmount: saleToEdit.billAmount,
        customerId: saleToEdit.customerId,
        lotNumber: saleToEdit.lotNumber,
        quantity: saleToEdit.quantity,
        netWeight: saleToEdit.netWeight,
        rate: saleToEdit.rate,
        transporterId: saleToEdit.transporterId,
        transportCost: saleToEdit.transportCost,
        brokerId: saleToEdit.brokerId,
        brokerageType: saleToEdit.brokerageType || undefined,
        brokerageAmount: saleToEdit.brokerageAmount, 
        notes: saleToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      billNumber: `INV-${Date.now().toString().slice(-6)}`,
      billAmount: undefined,
      customerId: undefined,
      lotNumber: "",
      quantity: 0, 
      netWeight: 0, 
      rate: 0, 
      transporterId: undefined,
      transportCost: undefined,
      brokerId: undefined,
      brokerageType: undefined,
      brokerageAmount: undefined,
      notes: "",
    };
  }, [saleToEdit]);


  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema(
        customers, 
        transporters, 
        brokers, 
        inventory 
    )),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset(getDefaultValues());
    }
  }, [saleToEdit, isOpen, form, getDefaultValues]);

  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  const selectedBrokerId = form.watch("brokerId");
  const brokerageType = form.watch("brokerageType");
  const brokerageAmountValue = form.watch("brokerageAmount") || 0; 
  
  const calculatedBillAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    return isNaN(nw) || isNaN(r) ? 0 : nw * r;
  }, [netWeight, rate]);

  React.useEffect(() => {
    if (!form.formState.dirtyFields.billAmount) {
        form.setValue("billAmount", calculatedBillAmount, { shouldValidate: false }); 
    }
  }, [calculatedBillAmount, form]);

  const actualBillAmount = form.watch("billAmount") || calculatedBillAmount;

  const calculatedBrokerageCommission = React.useMemo(() => {
    if (!selectedBrokerId || !brokerageType || brokerageAmountValue === 0 || actualBillAmount === 0) return 0;

    if (brokerageType === 'Fixed') {
      return brokerageAmountValue;
    } else if (brokerageType === 'Percentage') {
      return (actualBillAmount * brokerageAmountValue) / 100;
    }
    return 0;
  }, [selectedBrokerId, brokerageType, brokerageAmountValue, actualBillAmount]);


  const handleAddNewMasterClicked = (type: MasterItemType) => {
    toast({ title: "Info", description: `Adding new ${type} would typically open a dedicated form. This feature is conceptual here.`});
  };
  
  const processSubmit = React.useCallback((values: SaleFormValues) => {
    setIsSubmitting(true);
    const finalBillAmount = values.billAmount && values.billAmount > 0 ? values.billAmount : calculatedBillAmount;
    const saleData: Sale = {
      id: saleToEdit ? saleToEdit.id : `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      billAmount: finalBillAmount,
      customerId: values.customerId as string, 
      customerName: customers.find(c => c.id === values.customerId)?.name,
      lotNumber: values.lotNumber,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      totalAmount: finalBillAmount, 
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      transportCost: values.transportCost,
      brokerId: values.brokerId,
      brokerName: brokers.find(b => b.id === values.brokerId)?.name,
      brokerageType: values.brokerageType,
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
          <Form {...form}> {/* This provides the FormProvider context */}
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
                        <FormControl><Input type="number" step="0.01" placeholder="Auto if empty" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem className="mt-4">
                    <FormLabel>Customer</FormLabel>
                    <MasterDataCombobox 
                        name="customerId"
                        options={customers.filter(c => c.type === 'Customer').map(c => ({ value: c.id, label: c.name, type: c.type }))}
                        placeholder="Select Customer" 
                        searchPlaceholder="Search customers..." 
                        notFoundMessage="No customer found." 
                        addNewLabel="Add New Customer"
                        onAddNew={() => handleAddNewMasterClicked("Customer")}
                        />
                    <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* Section: Product Details */}
              <div className="p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-primary">Product & Quantity</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4"> {/* Corrected closing tag for div */}
                    <FormField control={form.control} name="lotNumber" render={({ field }) => ( // field not directly used by new combobox
                        <FormItem>
                            <FormLabel>Vakkal / Lot Number</FormLabel>
                            <MasterDataCombobox
                                name="lotNumber"
                                options={inventory.map(lot => ({ value: lot.lotNumber, label: `${lot.lotNumber} (Qty: ${lot.quantity}, Wt: ${lot.netWeight}kg)` }))}
                                placeholder="Select Lot Number"
                                searchPlaceholder="Search lots..."
                                notFoundMessage="No lot found."
                                // No "Add New" for lot numbers as they come from purchases
                            />
                        <FormMessage />
                        </FormItem>
                    )}/>
                </div> {/* Corrected: This div was missing a closing tag in previous error */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem><FormLabel>No. of Bags</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="netWeight" render={({ field }) => (
                        <FormItem><FormLabel>Net Weight (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 2500" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="rate" render={({ field }) => (
                        <FormItem><FormLabel>Rate (₹/kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 30.00" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage />
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
                            name="transporterId"
                            options={transporters.filter(t => t.type === 'Transporter').map(t => ({ value: t.id, label: t.name, type: t.type }))}
                            placeholder="Select Transporter" 
                            searchPlaceholder="Search transporters..." 
                            notFoundMessage="No transporter found." 
                            addNewLabel="Add New Transporter"
                            onAddNew={() => handleAddNewMasterClicked("Transporter")}
                            />
                        <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="transportCost" render={({ field }) => (
                        <FormItem><FormLabel>Transport Cost (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 1500" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField control={form.control} name="brokerId" render={({ field }) => (
                        <FormItem> <FormLabel>Broker</FormLabel>
                        <MasterDataCombobox 
                            name="brokerId"
                            options={brokers.filter(b => b.type === 'Broker').map(b => ({ value: b.id, label: b.name, type: b.type }))}
                            placeholder="Select Broker" 
                            searchPlaceholder="Search brokers..." 
                            notFoundMessage="No broker found." 
                            addNewLabel="Add New Broker"
                            onAddNew={() => handleAddNewMasterClicked("Broker")}
                            />
                        <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="brokerageType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Brokerage Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedBrokerId}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Fixed"><Check className="w-4 h-4 mr-2" />Fixed Amount (₹)</SelectItem>
                                <SelectItem value="Percentage"><Percent className="w-4 h-4 mr-2"/>Percentage (%)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}/>
                     <FormField control={form.control} name="brokerageAmount" render={({ field }) => ( 
                        <FormItem><FormLabel>Brokerage Value/Rate</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder={brokerageType === 'Percentage' ? "% value" : "₹ amount"} 
                            {...field} 
                            value={field.value || ''}
                            disabled={!selectedBrokerId || !brokerageType}
                            onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                 </div>
                 {selectedBrokerId && brokerageType && brokerageAmountValue > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                      Calculated Brokerage Commission: ₹{calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
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
                        Calculated Sale Value (Bill Amount)
                    </div>
                    <p className="text-2xl font-bold text-primary">
                    ₹{actualBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-7">
                    This is (Net Weight &times; Rate) or manually entered Bill Amount. Transport/Brokerage costs are separate.
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

