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
  let whitelist = [
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  ];
  let proof = [], merkleTree;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the SpheraKitBag contract
    SpheraKitBag = await ethers.getContractFactory("SpheraKitBag");
    spheraKitBag = await SpheraKitBag.deploy(1000, owner.address,  21000, "0x1234567890123456789012345678901234567890");
    await spheraKitBag.deployed();

    whitelist.push(owner.address);
    whitelist.push(addr1.address);
    let leaves = whitelist.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRootHash = await merkleTree.getHexRoot()
    spheraKitBag.setGtdMerkleRoot(merkleRootHash);

    let hashedAddress = keccak256(owner.address)
    proof = merkleTree.getHexProof(hashedAddress)

    
    let hashedAddress1 = keccak256(addr1.address)
    proofaddr1 = merkleTree.getHexProof(hashedAddress1)
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
     
      await spheraKitBag.periodMint(1,  1, proof, { value: ethers.utils.parseEther("0.05") });
      expect(await spheraKitBag.totalMintedInPeriod(1)).to.equal(1);
    });

    it("should revert if trying to mint in a period that has not been set up", async function () {
      // Attempt to mint tokens in a period that has not been set up
      await expect(spheraKitBag.periodMint(1,  1, proof, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("PeriodNotOpen()");
    });

    it("should revert if trying to mint more than the allowed amount in a period", async function () {
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) -  60 *  60, Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  100);
      // Open a period
      await spheraKitBag.openPeriod(1);
      // Attempt to mint more tokens than allowed in the period
      await expect(spheraKitBag.periodMint(1,  11, proof, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("MintingTooMuchInPeriod()");
    });

    it("should revert if not enough Ether is sent to cover the minting cost", async function () {
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) -  60 *  60, Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  100);
      // Open a period
      await spheraKitBag.openPeriod(1);
      // Attempt to mint without sending enough Ether to cover the cost
      await expect(spheraKitBag.periodMint(1,  1, proof, { value: ethers.utils.parseEther("0.0001") })).to.be.revertedWith("InsufficientFunds()");
    });

    it("should revert if trying to mint beyond the max supply for a period", async function () {
      // Set period parameters with a maximum supply of  10 tokens
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) -  60 *  60, Math.floor(Date.now() /  1000) +  60 *  60,  1000000000000000,  10,  10);
      // Open the period
      await spheraKitBag.openPeriod(1);
      // Mint  10 tokens to reach the maximum supply for the period
      await spheraKitBag.periodMint(1,  10, proof, { value: ethers.utils.parseEther("0.05") });
      // Attempt to mint another token, which should exceed the maximum supply for the period
      
      await expect(spheraKitBag.connect(addr1).periodMint(1,  1, proofaddr1, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("MaxPeriodMintSupplyReached()");
    });

    it("should revert if trying to mint in a period that has ended", async function () {
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) -  60 *  60, Math.floor(Date.now() /  1000) -  30 *  60,  1000000000000000,  10,  100);
      // Open a period
      await spheraKitBag.openPeriod(1);
      // Attempt to mint in a period that has already ended
      await expect(spheraKitBag.periodMint(1,  1, proof, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("PeriodNotOpen()");
    });

    it("should revert if trying to mint before the period start time", async function () {
      // Set period parameters
      await spheraKitBag.setPeriodParams(1, Math.floor(Date.now() /  1000) +  60 *  60, Math.floor(Date.now() /  1000) +  90 *  60,  1000000000000000,  10,  100);
      // Open a period
      await spheraKitBag.openPeriod(1);
      // Attempt to mint before the period start time
      await expect(spheraKitBag.periodMint(1,  1, proof, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("PeriodNotOpen()");
    });

    it("should revert if trying to mint in a period that does not exist", async function () {
      // Attempt to mint tokens in a period that does not exist
      await expect(spheraKitBag.periodMint(999,  1, proof, { value: ethers.utils.parseEther("0.05") })).to.be.revertedWith("PeriodNotOpen()");
    });
  });
});