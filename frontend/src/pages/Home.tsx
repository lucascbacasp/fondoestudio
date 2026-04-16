import { useState } from "react";
import PoolHeader from "../components/PoolHeader";
import RequestFeed from "../components/RequestFeed";
import DepositModal from "../components/DepositModal";
import HowItWorks from "../components/HowItWorks";

export default function Home() {
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <div className="space-y-3">
      <PoolHeader onDeposit={() => setDepositOpen(true)} />
      <HowItWorks />
      <RequestFeed />
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}
