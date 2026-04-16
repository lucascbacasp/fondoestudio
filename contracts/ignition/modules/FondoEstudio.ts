import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const USDC_CELO = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

const FondoEstudioModule = buildModule("FondoEstudioModule", (m) => {
  // For mainnet, pass --parameters '{"usdcAddress":"0xcebA9300..."}'
  // For testnet, we deploy MockUSDC alongside
  const usdcAddress = m.getParameter("usdcAddress", USDC_CELO);

  const fondoEstudio = m.contract("FondoEstudio", [usdcAddress]);

  return { fondoEstudio };
});

export default FondoEstudioModule;
