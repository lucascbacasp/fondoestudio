import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseUnits } from "viem";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FONDO_ADDRESS, FONDO_ABI, USDC_DECIMALS, CATEGORIES } from "../constants";
import { usePoolData } from "../hooks/usePoolData";

export default function NewRequest() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const chainId = useChainId();
  const fondo = FONDO_ADDRESS[chainId];
  const { poolBalance } = usePoolData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("utiles");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const { writeContract, data: tx, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: tx });

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center py-8 space-y-5">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">&#127891;</span>
        </div>
        <div>
          <p className="font-bold text-xl text-gray-900">Pedido enviado!</p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Los miembros del fondo tienen <strong>48 horas</strong> para votar.
            <br />
            Si hay quorum y mayoria, el pago es automatico.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold active:bg-brand-700 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const parsedAmount = amount ? parseUnits(amount, USDC_DECIMALS) : 0n;
  const exceedsPool = Number(amount) > Number(poolBalance);
  const busy = isPending || isConfirming;

  function handleSubmit() {
    if (!fondo || !title || !amount || !beneficiary) return;
    writeContract({
      address: fondo,
      abi: FONDO_ABI,
      functionName: "submitRequest",
      args: [
        title,
        description,
        category,
        parsedAmount,
        beneficiary as `0x${string}`,
        evidenceUrl,
      ],
    });
  }

  const canSubmit = !!address && !!title && parsedAmount > 0n && !!beneficiary && !exceedsPool;

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
        &#8592; Volver
      </Link>

      <div className="text-center">
        <h1 className="font-bold text-xl text-gray-900">Pedir financiamiento</h1>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
          Si necesitas ayuda para estudiar, contale a la comunidad.
          Describí tu situacion, cuanto necesitas y a donde van los fondos.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-1.5">
            Titulo del pedido *
          </label>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Utiles para 3er grado"
            className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-1.5">
            Descripcion
          </label>
          <textarea
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalla para que se necesita el dinero y como se va a usar"
            className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-3 text-sm resize-none focus:outline-none focus:border-brand-400 transition-colors"
          />
          <p className="text-[10px] text-gray-300 text-right mt-0.5">{description.length}/500</p>
        </div>

        {/* Category — pills */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-2">
            Categoria
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  category === key
                    ? `${cat.color} ring-2 ring-offset-1 ring-current`
                    : "bg-gray-100 text-gray-500 active:bg-gray-200"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-1.5">
            Monto USDC *
            <span className="normal-case tracking-normal text-gray-300 ml-1">
              (disponible en el fondo: ${poolBalance})
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-16 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">USDC</span>
          </div>
          {exceedsPool && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              &#9888; Supera el balance del fondo
            </p>
          )}
        </div>

        {/* Beneficiary */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-1.5">
            Wallet beneficiaria *
          </label>
          <input
            type="text"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="0x..."
            className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-3 text-sm font-mono focus:outline-none focus:border-brand-400 transition-colors"
          />
          {address && !beneficiary && (
            <button
              type="button"
              onClick={() => setBeneficiary(address)}
              className="text-[11px] text-brand-500 font-medium mt-1 active:text-brand-700"
            >
              &#8594; Usar mi wallet
            </button>
          )}
        </div>

        {/* Evidence */}
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-medium block mb-1.5">
            Link de evidencia
            <span className="normal-case tracking-normal text-gray-300 ml-1">(opcional)</span>
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
          />
          <p className="text-[10px] text-gray-300 mt-0.5">
            Subi fotos, presupuestos o documentacion que respalde tu pedido
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold disabled:opacity-40 active:from-brand-700 active:to-brand-600 shadow-md shadow-brand-200 transition-all"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enviando pedido...
          </span>
        ) : (
          "Enviar pedido"
        )}
      </button>
    </div>
  );
}
