import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/80 to-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-lg">
        <div className="max-w-lg mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <Link to="/" className="flex items-center gap-1.5">
              <span className="text-lg">&#127891;</span>
              <span className="text-base font-bold tracking-tight">FondoEstudio</span>
            </Link>
            {pathname !== "/new" && (
              <Link
                to="/new"
                className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30 active:bg-white/30 transition-colors"
              >
                + Pedir ayuda
              </Link>
            )}
          </div>

          {/* Mission banner — only on home */}
          {pathname === "/" && (
            <div className="pb-4 pt-2 text-center">
              <p className="text-[15px] font-bold leading-snug">
                <span className="text-white">Si necesitas ayuda para estudiar,</span><br />
                <span className="text-yellow-300">la comunidad te respalda.</span>
              </p>
              <p className="text-[11px] text-white/80 mt-2 max-w-xs mx-auto leading-relaxed">
                Becas, utiles, uniformes o cuotas &mdash; pedi financiamiento y la comunidad vota.
                <span className="text-yellow-200/90 font-medium"> Sin intermediarios, 100% transparente.</span>
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto w-full px-4 py-3 flex-1 page-enter">{children}</main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto w-full px-4 pb-4 text-center">
        <p className="text-[10px] text-gray-300">
          100% on-chain &middot; Sin intermediarios &middot; Celo Network
        </p>
      </footer>
    </div>
  );
}
