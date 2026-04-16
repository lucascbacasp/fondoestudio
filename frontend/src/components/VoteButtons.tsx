import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FONDO_ADDRESS, FONDO_ABI } from "../constants";
import { useMembership } from "../hooks/useMembership";
import type { Address } from "viem";

interface VoteButtonsProps {
  requestId: bigint;
  isActive: boolean;
}

export default function VoteButtons({ requestId, isActive }: VoteButtonsProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const fondo = FONDO_ADDRESS[chainId];
  const { isMember } = useMembership();

  const { data: alreadyVoted } = useReadContract({
    address: fondo,
    abi: FONDO_ABI,
    functionName: "hasVoted",
    args: [requestId, address as Address],
    query: { enabled: !!address && !!fondo },
  });

  const { writeContract, data: voteTx, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: voteTx });

  if (!address) return null;

  if (!isMember) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 text-center space-y-2">
        <p className="text-sm text-gray-600">
          &#128274; Necesitas ser miembro para votar
        </p>
        <p className="text-xs text-gray-400">
          Deposita 1 USDC en el fondo para activar tu voto
        </p>
      </div>
    );
  }

  if (alreadyVoted) {
    return (
      <div className="bg-brand-50 rounded-2xl p-4 text-center">
        <p className="text-sm font-medium text-brand-700">
          &#9989; Ya registraste tu voto
        </p>
      </div>
    );
  }

  if (!isActive) return null;

  if (isSuccess) {
    return (
      <div className="bg-brand-50 rounded-2xl p-4 text-center space-y-1">
        <p className="text-sm font-semibold text-brand-700">&#127881; Voto registrado!</p>
        <p className="text-xs text-brand-500">Gracias por participar</p>
      </div>
    );
  }

  const busy = isPending || isConfirming;

  function handleVote(support: boolean) {
    if (!fondo) return;
    writeContract({
      address: fondo,
      abi: FONDO_ABI,
      functionName: "vote",
      args: [requestId, support],
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
        Tu voto
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => handleVote(true)}
          disabled={busy}
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold disabled:opacity-40 active:from-brand-700 active:to-brand-600 shadow-md shadow-brand-200 transition-all"
        >
          {busy ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "\u{1F44D} A favor"
          )}
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={busy}
          className="flex-1 py-3.5 rounded-xl bg-white text-red-500 font-semibold border-2 border-red-200 disabled:opacity-40 active:bg-red-50 transition-colors"
        >
          {busy ? (
            <span className="inline-block w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
          ) : (
            "\u{1F44E} En contra"
          )}
        </button>
      </div>
    </div>
  );
}
