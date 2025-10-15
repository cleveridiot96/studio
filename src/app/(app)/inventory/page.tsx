
import { InventoryClient } from "@/components/app/inventory/InventoryClient";

export default function InventoryPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const warehouseId = searchParams?.warehouseId as string | undefined;

  return <InventoryClient warehouseIdFromQuery={warehouseId} />;
}
