const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("DecaNFT", function () {
  let DecaNFT;
  let decaNFT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the DecaNFT contract
    DecaNFT = await ethers.getContractFactory("DecaNFT");
    decaNFT = await DecaNFT.deploy("", "DecaNFT", "DNFT", 150000, addr1.address);
    await decaNFT.deployed();
    if (this.currentTest.title !== 'Should have an error minting new tokens') {
      await decaNFT.setMintState(true);
    }
  });

  describe("Mint test", function () {
    it("Should have an error minting new tokens", async function () {
      await expect(decaNFT.mint(2)).to.be.revertedWith("MintNotAvailable");
    });
  
    it("Should mint new tokens", async function () {
      await decaNFT.mint(2);
  
      expect(await decaNFT.totalSupply()).to.equal(2);
      expect(await decaNFT.ownerOf(0)).to.equal(owner.address);
      expect(await decaNFT.ownerOf(1)).to.equal(owner.address);
      expect(await decaNFT.balanceOf(owner.address)).to.equal(2);
    });
  
    it("Should have an mint limit error", async function () {
      await decaNFT.setMintLimit(5);
      await decaNFT.mint(5);

      await expect(decaNFT.mint(1)).to.be.revertedWith("MintLimitExceeded");
    });

    describe("Whitelisting test", async function () {
      beforeEach(async function () {
        await decaNFT.enableWhiteListing(true);
        await decaNFT.addToWhiteList(addr1.address);
      });

      it("Should mint new tokens", async function () {
        await decaNFT.connect(addr1).mint(2);
    
        expect(await decaNFT.whiteListingPeriod()).to.equal(true);
        expect(await decaNFT.minters(addr1.address)).to.equal(true);
        expect(await decaNFT.ownerOf(0)).to.equal(addr1.address);
        expect(await decaNFT.ownerOf(1)).to.equal(addr1.address);
        expect(await decaNFT.balanceOf(addr1.address)).to.equal(2);
      });

      it("Should fail with whitelist error", async function () {
        await expect(decaNFT.connect(addr2).mint(2)).to.be.revertedWith("InvalidMinter");
      });

      it("Should be removed from whitelist and fail minting", async function () {
        await decaNFT.removeFromWhiteList(addr1.address);

        expect(await decaNFT.minters(addr1.address)).to.equal(false);
        await expect(decaNFT.connect(addr1).mint(2)).to.be.revertedWith("InvalidMinter");
      });
    });
  });

  describe("Token URI test", function () {
    it("Should show prereveal token URI", async function() {
      await decaNFT.setPrerevealTokenURI("PrerevealURI");
      await decaNFT.mint(1);

      expect(await decaNFT.tokenURI(1)).to.equal("PrerevealURI");
    });

    it("Should show individual token URI", async function () {
      await decaNFT.setBaseURI("BaseURI");
      await decaNFT.setRevealed(true);
      await decaNFT.mint(2);

      expect(await decaNFT.tokenURI(1)).to.equal("BaseURI/1");
      expect(await decaNFT.tokenURI(2)).to.equal("BaseURI/2");
    });  
  });
  describe("Treasury mint test", async function () {
    it("Should set treasury address", async function () {
      await decaNFT.setTreasuryAddress(addr1.address);

      expect(await decaNFT.treasuryAddress()).to.equal(addr1.address);
    });

    it("Should mint to treasury address", async function () {
      await decaNFT.setTreasuryAddress(addr1.address);
      await decaNFT.treasuryMint(2);

      expect(await decaNFT.ownerOf(1)).to.equal(addr1.address);
    });
  });
});
