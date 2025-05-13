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
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas/purchaseSchema";
import type { MasterItem, Purchase, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { AddMasterItemDialog } from "@/components/shared/AddMasterItemDialog";
import { useToast } from "@/hooks/use-toast";

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

export function AddPurchaseForm({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses,
  transporters,
  onMasterDataUpdate,
  purchaseToEdit
}: AddPurchaseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAddMasterDialog, setShowAddMasterDialog] = React.useState(false);
  const [currentMasterType, setCurrentMasterType] = React.useState<MasterItemType | null>(null);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: purchaseToEdit ? {
      date: new Date(purchaseToEdit.date),
      lotNumber: purchaseToEdit.lotNumber,
      supplierId: purchaseToEdit.supplierId,
      agentId: purchaseToEdit.agentId,
      itemName: purchaseToEdit.itemName,
      quantity: purchaseToEdit.quantity,
      netWeight: purchaseToEdit.netWeight,
      rate: purchaseToEdit.rate,
      warehouseId: purchaseToEdit.warehouseId,
      transporterId: purchaseToEdit.transporterId,
    } : {
      date: new Date(),
      lotNumber: "",
      supplierId: undefined,
      agentId: undefined,
      itemName: "",
      quantity: 0,
      netWeight: 0,
      rate: 0,
      warehouseId: undefined,
      transporterId: undefined,
    },
  });

  React.useEffect(() => {
    if (purchaseToEdit) {
      form.reset({
        date: new Date(purchaseToEdit.date),
        lotNumber: purchaseToEdit.lotNumber,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId,
        itemName: purchaseToEdit.itemName,
        quantity: purchaseToEdit.quantity,
        netWeight: purchaseToEdit.netWeight,
        rate: purchaseToEdit.rate,
        warehouseId: purchaseToEdit.warehouseId,
        transporterId: purchaseToEdit.transporterId,
      });
    } else {
      form.reset({
        date: new Date(),
        lotNumber: "",
        supplierId: undefined,
        agentId: undefined,
        itemName: "",
        quantity: 0,
        netWeight: 0,
        rate: 0,
        warehouseId: undefined,
        transporterId: undefined,
      });
    }
  }, [purchaseToEdit, form, isOpen]);


  const netWeight = form.watch("netWeight");
  const rate = form.watch("rate");
  const totalAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    return isNaN(nw) || isNaN(r) ? 0 : nw * r;
  }, [netWeight, rate]);

  const handleAddNewMaster = (type: MasterItemType) => {
    setCurrentMasterType(type);
    setShowAddMasterDialog(true);
  };

  const handleMasterItemAdded = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as MasterItemType, newItem); // Assuming type is set correctly
    if (newItem.type === 'Supplier') form.setValue('supplierId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Agent') form.setValue('agentId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Warehouse') form.setValue('warehouseId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') form.setValue('transporterId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added successfully!` });
  };

  const processSubmit = (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    const purchaseData: Purchase = {
      id: purchaseToEdit ? purchaseToEdit.id : `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      lotNumber: values.lotNumber,
      supplierId: values.supplierId,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      itemName: values.itemName,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      totalAmount: values.netWeight * values.rate,
      warehouseId: values.warehouseId,
      warehouseName: warehouses.find(w => w.id === values.warehouseId)?.name,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    form.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if(!open) {form.reset(); onClose();} }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{purchaseToEdit ? 'Edit Purchase' : 'Add New Purchase'}</DialogTitle>
            <DialogDescription>
              Enter the details for the purchase record. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
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
                      <FormControl>
                        <Input placeholder="e.g., AB/6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <MasterDataCombobox
                      items={suppliers}
                      value={field.value}
                      onChange={field.onChange}
                      onAddNew={() => handleAddNewMaster("Supplier")}
                      placeholder="Select Supplier"
                      searchPlaceholder="Search suppliers..."
                      notFoundMessage="No supplier found."
                      addNewLabel="Add New Supplier"
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
                      items={agents}
                      value={field.value}
                      onChange={field.onChange}
                      onAddNew={() => handleAddNewMaster("Agent")}
                      placeholder="Select Agent"
                      searchPlaceholder="Search agents..."
                      notFoundMessage="No agent found."
                      addNewLabel="Add New Agent"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wheat, Soyabean" {...field} />
                    </FormControl>
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
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (per kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20.50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse</FormLabel>
                      <MasterDataCombobox
                        items={warehouses}
                        value={field.value}
                        onChange={field.onChange}
                        onAddNew={() => handleAddNewMaster("Warehouse")}
                        placeholder="Select Warehouse"
                        searchPlaceholder="Search warehouses..."
                        notFoundMessage="No warehouse found."
                        addNewLabel="Add New Warehouse"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="transporterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transporter (Optional)</FormLabel>
                      <MasterDataCombobox
                        items={transporters}
                        value={field.value}
                        onChange={field.onChange}
                        onAddNew={() => handleAddNewMaster("Transporter")}
                        placeholder="Select Transporter"
                        searchPlaceholder="Search transporters..."
                        notFoundMessage="No transporter found."
                        addNewLabel="Add New Transporter"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 border border-dashed rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-lg font-semibold">
                        <Info className="w-5 h-5 mr-2 text-primary" />
                        Calculated Total Amount
                    </div>
                    <p className="text-2xl font-bold text-primary">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-7">
                    This is calculated as Net Weight &times; Rate.
                </p>
              </div>


              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}}>
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
