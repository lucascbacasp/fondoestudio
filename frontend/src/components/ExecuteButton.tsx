import { useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FONDO_ADDRESS, FONDO_ABI } from "../constants";

interface ExecuteButtonProps {
  requestId: bigint;
}

export default function ExecuteButton({ requestId }: ExecuteButtonProps) {
  const chainId = useChainId();
  const fondo = FONDO_ADDRESS[chainId];

  const { writeContract, data: tx, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: tx });

  if (isSuccess) {
    return (
      <div className="bg-brand-50 rounded-2xl p-4 text-center space-y-1">
        <p className="text-sm font-semibold text-brand-700">&#9889; Pedido ejecutado</p>
        <p className="text-xs text-brand-500">El resultado de la votacion se aplico</p>
      </div>
    );
  }

  const busy = isPending || isConfirming;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="text-xs text-gray-500 text-center leading-relaxed">
        La votacion termino. Ejecuta el resultado para que el contrato procese el pedido.
      </p>
      <button
        onClick={() => {
          if (!fondo) return;
          writeContract({
            address: fondo,
            abi: FONDO_ABI,
            functionName: "execute",
            args: [requestId],
          });
        }}
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-white font-semibold disabled:opacity-40 active:from-amber-600 active:to-amber-500 shadow-md shadow-amber-200 transition-all"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Ejecutando...
          </span>
        ) : (
          "\u26A1 Ejecutar resultado"
        )}
      </button>
    </div>
  );
}
