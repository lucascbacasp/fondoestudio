import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FondoEstudioTestnetModule = buildModule("FondoEstudioTestnetModule", (m) => {
  // Deploy MockUSDC for testnet
  const mockUsdc = m.contract("MockUSDC");

  // Deploy FondoEstudio pointing to MockUSDC
  const fondoEstudio = m.contract("FondoEstudio", [mockUsdc]);

  return { mockUsdc, fondoEstudio };
});

export default FondoEstudioTestnetModule;
