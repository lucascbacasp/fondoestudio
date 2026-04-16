import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { USDC_ADDRESS, FONDO_ADDRESS, FONDO_ABI, ERC20_ABI, USDC_DECIMALS } from "../constants";
import { useMembership } from "../hooks/useMembership";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = ["1", "5", "10", "25"];

export default function DepositModal({ open, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approving" | "depositing">("input");

  const { address } = useAccount();
  const chainId = useChainId();
  const usdc = USDC_ADDRESS[chainId];
  const fondo = FONDO_ADDRESS[chainId];
  const { allowance, isMember } = useMembership();

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: deposit, data: depositTx } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositTx });

  if (!open) return null;

  const parsedAmount = amount ? parseUnits(amount, USDC_DECIMALS) : 0n;
  const needsApproval = parsedAmount > (allowance as bigint);

  function handleApprove() {
    if (!address || !usdc || !fondo) return;
    setStep("approving");
    approve({
      address: usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [fondo, parsedAmount],
    });
  }

  function handleDeposit() {
    if (!fondo) return;
    setStep("depositing");
    deposit({
      address: fondo,
      abi: FONDO_ABI,
      functionName: "deposit",
      args: [parsedAmount],
    });
  }

  function handleClose() {
    setAmount("");
    setStep("input");
    onClose();
  }

  // Success state
  if (depositConfirmed) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
        <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 text-center space-y-4 sheet-enter">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">&#128154;</span>
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900">Gracias por tu aporte!</p>
            <p className="text-sm text-gray-500 mt-1">
              ${amount} USDC sumados al fondo comunitario.
              {!isMember && " Ya sos miembro y podes votar!"}
            </p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Tu donacion va directo al contrato. Nadie puede tocarla excepto la comunidad votando.
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold active:bg-brand-700 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-5 sheet-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Aportar al fondo</h2>
            <p className="text-xs text-gray-400">100% va al contrato, sin comisiones</p>
          </div>
          <button onClick={handleClose} className="text-gray-300 text-2xl leading-none active:text-gray-500">
            &times;
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                amount === q
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
              disabled={step !== "input"}
            >
              ${q}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Otro monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-16 py-3.5 text-lg font-semibold focus:outline-none focus:border-brand-400 transition-colors"
            disabled={step !== "input"}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">USDC</span>
        </div>

        {/* Action button */}
        {needsApproval && !approveConfirmed ? (
          <div className="space-y-2">
            <button
              onClick={handleApprove}
              disabled={!parsedAmount || step === "approving"}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-40 active:bg-amber-600 transition-colors"
            >
              {step === "approving" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aprobando...
                </span>
              ) : (
                "Paso 1: Aprobar USDC"
              )}
            </button>
            <p className="text-[10px] text-center text-gray-400">
              Primero autorizas al contrato a usar tus USDC
            </p>
          </div>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={!parsedAmount || step === "depositing"}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold disabled:opacity-40 active:from-brand-700 active:to-brand-600 shadow-md shadow-brand-200 transition-all"
          >
            {step === "depositing" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Depositando...
              </span>
            ) : (
              `Donar $${amount || "0"} USDC`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
