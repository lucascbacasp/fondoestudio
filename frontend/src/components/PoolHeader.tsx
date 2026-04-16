import { useMembership } from "../hooks/useMembership";
import { usePoolData } from "../hooks/usePoolData";

interface PoolHeaderProps {
  onDeposit: () => void;
}

export default function PoolHeader({ onDeposit }: PoolHeaderProps) {
  const { poolBalance, memberCount } = usePoolData();
  const { isMember, usdcBalance, deposited } = useMembership();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

      <div className="px-4 py-3 space-y-2.5">
        {/* Row 1: Pool balance + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-brand-700 tabular-nums">${poolBalance}</span>
            <span className="text-xs text-gray-400">USDC en el fondo</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span>&#128101; {memberCount}</span>
            {isMember && (
              <span className="flex items-center gap-1 text-brand-600 font-medium">
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse-dot" />
                Miembro
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Wallet info + CTA */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 text-xs">
            <span className="text-gray-400">Wallet: <strong className="text-gray-700">${usdcBalance}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">Aportaste: <strong className="text-brand-600">${deposited}</strong></span>
          </div>
          <button
            onClick={onDeposit}
            className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors ${
              isMember
                ? "bg-brand-50 text-brand-700 border border-brand-200 active:bg-brand-100"
                : "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-200 active:from-brand-700"
            }`}
          >
            {isMember ? "\u{1F49A} Donar" : "\u{1F393} Unite con 1 USDC"}
          </button>
        </div>
      </div>
    </div>
  );
}
