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
import { saleSchema, type SaleFormValues } from "@/lib/schemas/saleSchema";
import type { MasterItem, Sale, MasterItemType, Customer } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { AddMasterItemDialog } from "@/components/shared/AddMasterItemDialog";
import { useToast } from "@/hooks/use-toast";

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: Customer[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  saleToEdit?: Sale | null;
}

export function AddSaleForm({
  isOpen,
  onClose,
  onSubmit,
  customers,
  onMasterDataUpdate,
  saleToEdit
}: AddSaleFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAddMasterDialog, setShowAddMasterDialog] = React.useState(false);
  const [currentMasterType, setCurrentMasterType] = React.useState<MasterItemType | null>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: saleToEdit ? {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber,
        customerId: saleToEdit.customerId,
        itemName: saleToEdit.itemName,
        quantity: saleToEdit.quantity,
        price: saleToEdit.price,
    } : {
      date: new Date(),
      billNumber: "",
      customerId: undefined,
      itemName: "",
      quantity: 0,
      price: 0,
    },
  });

  React.useEffect(() => {
    if (saleToEdit) {
        form.reset({
            date: new Date(saleToEdit.date),
            billNumber: saleToEdit.billNumber,
            customerId: saleToEdit.customerId,
            itemName: saleToEdit.itemName,
            quantity: saleToEdit.quantity,
            price: saleToEdit.price,
        });
    } else {
        form.reset({
            date: new Date(),
            billNumber: `INV-${Date.now().toString().slice(-6)}`, // Example auto bill number
            customerId: undefined,
            itemName: "",
            quantity: 0,
            price: 0,
          });
    }
  }, [saleToEdit, form, isOpen]);


  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const totalAmount = React.useMemo(() => {
    const q = parseFloat(String(quantity || 0));
    const p = parseFloat(String(price || 0));
    return isNaN(q) || isNaN(p) ? 0 : q * p;
  }, [quantity, price]);

  const handleAddNewMaster = (type: MasterItemType) => {
    setCurrentMasterType(type);
    setShowAddMasterDialog(true);
  };

  const handleMasterItemAdded = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type as MasterItemType, newItem);
    if (newItem.type === 'Customer') form.setValue('customerId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added successfully!` });
  };

  const processSubmit = (values: SaleFormValues) => {
    setIsSubmitting(true);
    const saleData: Sale = {
      id: saleToEdit ? saleToEdit.id : `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      customerId: values.customerId,
      customerName: customers.find(c => c.id === values.customerId)?.name,
      itemName: values.itemName,
      quantity: values.quantity,
      price: values.price,
      totalAmount: values.quantity * values.price,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    form.reset();
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if(!open) {form.reset(); onClose(); }}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>
              Enter the details for the sale record. Click save when you&apos;re done.
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
                      <FormLabel>Sale Date</FormLabel>
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
                  name="billNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <MasterDataCombobox
                      items={customers}
                      value={field.value}
                      onChange={field.onChange}
                      onAddNew={() => handleAddNewMaster("Customer")}
                      placeholder="Select Customer"
                      searchPlaceholder="Search customers..."
                      notFoundMessage="No customer found."
                      addNewLabel="Add New Customer"
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
                      <Input placeholder="e.g., Rice, Maize" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (per unit)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30.00" {...field} />
                      </FormControl>
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
                    This is calculated as Quantity &times; Price.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}}>
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
