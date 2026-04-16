import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const USDC_DECIMALS = 6;
const ONE_USDC = 1_000_000n; // 1 USDC
const TEN_USDC = 10_000_000n;
const HUNDRED_USDC = 100_000_000n;
const VOTING_DURATION = 48 * 60 * 60; // 48 hours in seconds

describe("FondoEstudio", function () {
  async function deployFixture() {
    const [owner, alice, bob, carol, dave] = await ethers.getSigners();

    // Deploy mock USDC (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockERC20.deploy();

    // Deploy FondoEstudio
    const FondoEstudio = await ethers.getContractFactory("FondoEstudio");
    const fondo = await FondoEstudio.deploy(await usdc.getAddress());

    // Mint USDC to test accounts
    const fondoAddr = await fondo.getAddress();
    for (const signer of [owner, alice, bob, carol, dave]) {
      await usdc.mint(signer.address, HUNDRED_USDC);
      await usdc.connect(signer).approve(fondoAddr, ethers.MaxUint256);
    }

    return { fondo, usdc, owner, alice, bob, carol, dave };
  }

  describe("Deployment", function () {
    it("should set the correct USDC address", async function () {
      const { fondo, usdc } = await loadFixture(deployFixture);
      expect(await fondo.usdc()).to.equal(await usdc.getAddress());
    });

    it("should set deployer as owner", async function () {
      const { fondo, owner } = await loadFixture(deployFixture);
      expect(await fondo.owner()).to.equal(owner.address);
    });

    it("should start with zero pool balance", async function () {
      const { fondo } = await loadFixture(deployFixture);
      expect(await fondo.totalPoolBalance()).to.equal(0n);
    });
  });

  describe("Deposits", function () {
    it("should accept a deposit and update balance", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);
      expect(await fondo.totalPoolBalance()).to.equal(TEN_USDC);
      expect(await fondo.memberDeposits(alice.address)).to.equal(TEN_USDC);
    });

    it("should grant membership at >= 1 USDC", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      expect(await fondo.isMember(alice.address)).to.be.false;
      await fondo.connect(alice).deposit(ONE_USDC);
      expect(await fondo.isMember(alice.address)).to.be.true;
      expect(await fondo.getMemberCount()).to.equal(1n);
    });

    it("should NOT grant membership below 1 USDC", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(500_000n); // 0.5 USDC
      expect(await fondo.isMember(alice.address)).to.be.false;
    });

    it("should grant membership on cumulative deposits reaching 1 USDC", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(500_000n);
      expect(await fondo.isMember(alice.address)).to.be.false;
      await fondo.connect(alice).deposit(500_000n);
      expect(await fondo.isMember(alice.address)).to.be.true;
    });

    it("should emit Deposited event", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await expect(fondo.connect(alice).deposit(ONE_USDC))
        .to.emit(fondo, "Deposited")
        .withArgs(alice.address, ONE_USDC, true);
    });

    it("should revert on zero amount", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await expect(fondo.connect(alice).deposit(0n)).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Submit Request", function () {
    it("should create a request", async function () {
      const { fondo, alice, bob } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);

      await fondo.connect(bob).submitRequest(
        "Utiles escolares",
        "Necesito cuadernos y lapices",
        "utiles",
        ONE_USDC * 5n,
        bob.address,
        ""
      );

      expect(await fondo.getRequestCount()).to.equal(1n);
      const requests = await fondo.getRequests();
      expect(requests[0].title).to.equal("Utiles escolares");
      expect(requests[0].amount).to.equal(ONE_USDC * 5n);
      expect(requests[0].beneficiary).to.equal(bob.address);
    });

    it("should revert if amount exceeds pool", async function () {
      const { fondo, alice, bob } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(ONE_USDC);

      await expect(
        fondo.connect(bob).submitRequest("Test", "Desc", "beca", TEN_USDC, bob.address, "")
      ).to.be.revertedWith("Exceeds pool balance");
    });

    it("should revert with empty title", async function () {
      const { fondo, alice, bob } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);

      await expect(
        fondo.connect(bob).submitRequest("", "Desc", "beca", ONE_USDC, bob.address, "")
      ).to.be.revertedWith("Invalid title length");
    });

    it("should revert with zero beneficiary", async function () {
      const { fondo, alice, bob } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);

      await expect(
        fondo.connect(bob).submitRequest("Test", "Desc", "beca", ONE_USDC, ethers.ZeroAddress, "")
      ).to.be.revertedWith("Invalid beneficiary");
    });
  });

  describe("Voting", function () {
    async function withRequest() {
      const fixture = await loadFixture(deployFixture);
      const { fondo, alice, bob, carol } = fixture;

      // Make alice, bob, carol members
      await fondo.connect(alice).deposit(TEN_USDC);
      await fondo.connect(bob).deposit(TEN_USDC);
      await fondo.connect(carol).deposit(TEN_USDC);

      // Alice submits a request
      await fondo.connect(alice).submitRequest(
        "Beca para Maria",
        "Beca universitaria semestre 2",
        "beca",
        TEN_USDC,
        alice.address,
        ""
      );

      return fixture;
    }

    it("should allow members to vote yes", async function () {
      const { fondo, bob } = await withRequest();
      await fondo.connect(bob).vote(0, true);
      const req = (await fondo.getRequests())[0];
      expect(req.yesVotes).to.equal(1n);
    });

    it("should allow members to vote no", async function () {
      const { fondo, bob } = await withRequest();
      await fondo.connect(bob).vote(0, false);
      const req = (await fondo.getRequests())[0];
      expect(req.noVotes).to.equal(1n);
    });

    it("should revert for non-members", async function () {
      const { fondo, dave } = await withRequest();
      await expect(fondo.connect(dave).vote(0, true)).to.be.revertedWith("Not a member");
    });

    it("should revert on double vote", async function () {
      const { fondo, bob } = await withRequest();
      await fondo.connect(bob).vote(0, true);
      await expect(fondo.connect(bob).vote(0, true)).to.be.revertedWith("Already voted");
    });

    it("should revert after voting period", async function () {
      const { fondo, bob } = await withRequest();
      await time.increase(VOTING_DURATION + 1);
      await expect(fondo.connect(bob).vote(0, true)).to.be.revertedWith("Voting period ended");
    });

    it("should emit Voted event", async function () {
      const { fondo, bob } = await withRequest();
      await expect(fondo.connect(bob).vote(0, true))
        .to.emit(fondo, "Voted")
        .withArgs(0n, bob.address, true);
    });
  });

  describe("Execution", function () {
    async function withVotedRequest() {
      const fixture = await loadFixture(deployFixture);
      const { fondo, alice, bob, carol } = fixture;

      await fondo.connect(alice).deposit(TEN_USDC);
      await fondo.connect(bob).deposit(TEN_USDC);
      await fondo.connect(carol).deposit(TEN_USDC);

      await fondo.connect(alice).submitRequest(
        "Uniformes",
        "Comprar uniformes para 10 chicos",
        "uniforme",
        TEN_USDC,
        alice.address,
        ""
      );

      // 2 of 3 members vote yes → quorum (30% of 3 = 1) met, majority yes
      await fondo.connect(bob).vote(0, true);
      await fondo.connect(carol).vote(0, true);

      return fixture;
    }

    it("should revert before voting deadline", async function () {
      const { fondo, alice } = await withVotedRequest();
      await expect(fondo.connect(alice).execute(0)).to.be.revertedWith("Voting still active");
    });

    it("should execute approved request and transfer USDC", async function () {
      const { fondo, usdc, alice } = await withVotedRequest();
      await time.increase(VOTING_DURATION + 1);

      const balBefore = await usdc.balanceOf(alice.address);
      await fondo.execute(0);
      const balAfter = await usdc.balanceOf(alice.address);

      expect(balAfter - balBefore).to.equal(TEN_USDC);

      const req = (await fondo.getRequests())[0];
      expect(req.executed).to.be.true;
      expect(await fondo.totalPoolBalance()).to.equal(TEN_USDC * 2n); // 30 - 10 = 20
    });

    it("should emit RequestExecuted event", async function () {
      const { fondo, alice } = await withVotedRequest();
      await time.increase(VOTING_DURATION + 1);

      await expect(fondo.execute(0))
        .to.emit(fondo, "RequestExecuted")
        .withArgs(0n, alice.address, TEN_USDC);
    });

    it("should close request if majority rejects", async function () {
      const fixture = await loadFixture(deployFixture);
      const { fondo, alice, bob, carol } = fixture;

      await fondo.connect(alice).deposit(TEN_USDC);
      await fondo.connect(bob).deposit(TEN_USDC);
      await fondo.connect(carol).deposit(TEN_USDC);

      await fondo.connect(alice).submitRequest("Test", "Desc", "otro", ONE_USDC, alice.address, "");

      await fondo.connect(bob).vote(0, false);
      await fondo.connect(carol).vote(0, false);

      await time.increase(VOTING_DURATION + 1);
      await fondo.execute(0);

      const req = (await fondo.getRequests())[0];
      expect(req.closed).to.be.true;
      expect(req.executed).to.be.false;
    });

    it("should close request if no quorum", async function () {
      const fixture = await loadFixture(deployFixture);
      const { fondo, alice, bob, carol, dave } = fixture;

      // 4 members, quorum = ceil(4 * 30 / 100) = 2
      await fondo.connect(alice).deposit(TEN_USDC);
      await fondo.connect(bob).deposit(TEN_USDC);
      await fondo.connect(carol).deposit(TEN_USDC);
      await fondo.connect(dave).deposit(TEN_USDC);

      await fondo.connect(alice).submitRequest("Test", "Desc", "otro", ONE_USDC, alice.address, "");

      // Only 1 vote (needs 2 for quorum)
      await fondo.connect(bob).vote(0, true);

      await time.increase(VOTING_DURATION + 1);
      await fondo.execute(0);

      const req = (await fondo.getRequests())[0];
      expect(req.closed).to.be.true;
    });

    it("should revert if already executed", async function () {
      const { fondo } = await withVotedRequest();
      await time.increase(VOTING_DURATION + 1);
      await fondo.execute(0);
      await expect(fondo.execute(0)).to.be.revertedWith("Already finalized");
    });
  });

  describe("Owner Withdraw", function () {
    it("should let owner withdraw", async function () {
      const { fondo, usdc, owner, alice } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);

      const balBefore = await usdc.balanceOf(owner.address);
      await fondo.connect(owner).ownerWithdraw(ONE_USDC);
      const balAfter = await usdc.balanceOf(owner.address);

      expect(balAfter - balBefore).to.equal(ONE_USDC);
      expect(await fondo.totalPoolBalance()).to.equal(TEN_USDC - ONE_USDC);
    });

    it("should revert for non-owner", async function () {
      const { fondo, alice } = await loadFixture(deployFixture);
      await fondo.connect(alice).deposit(TEN_USDC);
      await expect(fondo.connect(alice).ownerWithdraw(ONE_USDC)).to.be.revertedWithCustomError(
        fondo,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
