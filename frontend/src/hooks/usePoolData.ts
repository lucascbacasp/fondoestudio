import { useChainId, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { FONDO_ADDRESS, FONDO_ABI, USDC_DECIMALS } from "../constants";

export interface RequestData {
  id: bigint;
  requester: string;
  title: string;
  description: string;
  category: string;
  amount: bigint;
  beneficiary: string;
  evidenceUrl: string;
  votingDeadline: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  executed: boolean;
  closed: boolean;
}

export function usePoolData() {
  const chainId = useChainId();
  const fondo = FONDO_ADDRESS[chainId];

  const { data, isLoading, refetch } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: fondo, abi: FONDO_ABI, functionName: "totalPoolBalance" },
      { address: fondo, abi: FONDO_ABI, functionName: "getMemberCount" },
      { address: fondo, abi: FONDO_ABI, functionName: "getRequests" },
    ],
    query: { enabled: !!fondo, refetchInterval: 15_000 },
  });

  const [rawPool, memberCount, requests] = data ?? [];

  return {
    isLoading,
    refetch,
    poolBalance: rawPool ? formatUnits(rawPool, USDC_DECIMALS) : "0",
    memberCount: memberCount ? Number(memberCount) : 0,
    requests: (requests ?? []) as unknown as RequestData[],
  };
}
