import { useAccount, useChainId, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { USDC_ADDRESS, FONDO_ADDRESS, FONDO_ABI, ERC20_ABI } from "../constants";

export function useMembership() {
  const { address } = useAccount();
  const chainId = useChainId();
  const usdc = USDC_ADDRESS[chainId];
  const fondo = FONDO_ADDRESS[chainId];

  const { data, isLoading } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [address as Address] },
      { address: usdc, abi: ERC20_ABI, functionName: "decimals" },
      { address: usdc, abi: ERC20_ABI, functionName: "symbol" },
      { address: usdc, abi: ERC20_ABI, functionName: "allowance", args: [address as Address, fondo] },
      { address: fondo, abi: FONDO_ABI, functionName: "isMember", args: [address as Address] },
      { address: fondo, abi: FONDO_ABI, functionName: "memberDeposits", args: [address as Address] },
    ],
    query: { enabled: !!address && !!usdc && !!fondo },
  });

  const [balance, decimals, symbol, allowance, memberStatus, deposited] = data ?? [];

  return {
    isLoading,
    usdcBalance: balance != null && decimals != null ? formatUnits(balance, decimals) : "0",
    usdcSymbol: symbol ?? "USDC",
    allowance: allowance ?? 0n,
    isMember: memberStatus ?? false,
    deposited: deposited != null && decimals != null ? formatUnits(deposited, decimals) : "0",
  };
}
