const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = ethers.utils;

describe("SpheraKitBag", function () {
  let SpheraKitBag;
  let spheraKitBag;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the SpheraKitBag contract
    SpheraKitBag = await ethers.getContractFactory("SpheraKitBag");
    spheraKitBag = await SpheraKitBag.deploy(1000, owner.address,  21000, "0x1234567890123456789012345678901234567890");
    await spheraKitBag.deployed();
  });

  describe("Period Management", function () {
    it("should allow the owner to open a period", async function () {
      // Open a period
      await spheraKitBag.openPeriod(1);
      expect(await spheraKitBag.currentPeriod()).to.equal(1);
    });

    it("should not allow non-owner to open a period", async function () {
      // Attempt to open a period from a non-owner account
      await expect(spheraKitBag.connect(addr1).openPeriod(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow the owner to set period parameters", async function () {
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000), Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  100);
      const periodInfo = await spheraKitBag.periodInfo(1);
      expect(periodInfo.startTime).to.not.equal(0);
      expect(periodInfo.endTime).to.not.equal(0);
      expect(periodInfo.price).to.equal(1000000000000000);
      expect(periodInfo.MAX_MINT_ALLOWED).to.equal(10);
      expect(periodInfo.MAX_SUPPLY).to.equal(100);
    });

    it("should not allow non-owner to set period parameters", async function () {
      // Attempt to set period parameters from a non-owner account
      await expect(spheraKitBag.connect(addr1).setPeriodParams(1, Math.floor(Date.now() /  1000), Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  100)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if period is not open for minting", async function () {
      // Attempt to mint tokens in a period that is not open
      await expect(spheraKitBag.periodMint(1,  1, [])).to.be.revertedWith("PeriodNotOpen()");
    });

    it("should allow minting within an open period", async function () {
      // Open a period
      await spheraKitBag.openPeriod(1);
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) -  60 *  60, Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  100);
      // Mint tokens in the open period
      await spheraKitBag.periodMint(1,  1, []);
      expect(await spheraKitBag.totalMintedInPeriod(1)).to.equal(1);
    });
  });
});