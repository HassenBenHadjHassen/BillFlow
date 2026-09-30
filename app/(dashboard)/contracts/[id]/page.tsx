import { notFound } from "next/navigation";
import { ContractService } from "@/services/contract.service";
import { ContractDetailClient } from "@/components/contracts/contract-detail-client";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await ContractService.getContractById(id);

  if (!contract) {
    notFound();
  }

  return <ContractDetailClient contract={contract} />;
}
