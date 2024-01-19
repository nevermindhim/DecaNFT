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
    decaNFT = await DecaNFT.deploy("", "DecaNFT", "DNFT", 100000, addr1.address);
    await decaNFT.deployed();
    if (this.currentTest.title !== 'Should have an error minting new tokens') {
      await decaNFT.setMintState(true);
    }
  });

  describe("Mint test", function () {
    it("Should have an error minting new tokens", async function () {
      await expect(decaNFT.mintNFT(2)).to.be.revertedWith("MintNotAvailable");
    });
  
    it("Should mint new tokens", async function () {
      await decaNFT.mintNFT(0);
      await decaNFT.mintNFT(1);
  
      expect(await decaNFT.totalSupply()).to.equal(2);
      expect(await decaNFT.ownerOf(0)).to.equal(owner.address);
      expect(await decaNFT.ownerOf(1)).to.equal(owner.address);
      expect(await decaNFT.balanceOf(owner.address)).to.equal(2);
    });
  
    it("Should have an mint limit error", async function () {
      await decaNFT.setMintLimit(5);
      
      await decaNFT.mintNFT(0);
      await decaNFT.mintNFT(1);
      await decaNFT.mintNFT(2);
      await decaNFT.mintNFT(3);
      await decaNFT.mintNFT(4);

      await expect(decaNFT.mintNFT(5)).to.be.revertedWith("MintLimitExceeded");
    });

    describe("Whitelisting test", async function () {
      beforeEach(async function () {
        await decaNFT.enableWhiteListing(true);
        await decaNFT.addToWhiteList(addr1.address);
      });

      it("Should mint new tokens", async function () {
        await decaNFT.connect(addr1).mintNFT(0);
        await decaNFT.connect(addr1).mintNFT(1);
    
        expect(await decaNFT.whiteListingPeriod()).to.equal(true);
        expect(await decaNFT.minters(addr1.address)).to.equal(true);
        expect(await decaNFT.ownerOf(0)).to.equal(addr1.address);
        expect(await decaNFT.ownerOf(1)).to.equal(addr1.address);
        expect(await decaNFT.balanceOf(addr1.address)).to.equal(2);
      });

      it("Should fail with whitelist error", async function () {
        await expect(decaNFT.connect(addr2).mintNFT(0)).to.be.revertedWith("InvalidMinter");
      });

      it("Should be removed from whitelist and fail minting", async function () {
        await decaNFT.removeFromWhiteList(addr1.address);

        expect(await decaNFT.minters(addr1.address)).to.equal(false);
        await expect(decaNFT.connect(addr1).mintNFT(0)).to.be.revertedWith("InvalidMinter");
      });
    });
  });

  describe("Token URI test", function () {
    it("Should show prereveal token URI", async function() {
      await decaNFT.setPrerevealTokenURI("PrerevealURI");
      await decaNFT.mintNFT(1);

      expect(await decaNFT.tokenURI(1)).to.equal("PrerevealURI");
    });

    it("Should show individual token URI", async function () {
      await decaNFT.setBaseURI("BaseURI");
      await decaNFT.setRevealed(true);
      await decaNFT.mintNFT(0);
      await decaNFT.mintNFT(1);

      expect(await decaNFT.tokenURI(0)).to.equal("BaseURI/0");
      expect(await decaNFT.tokenURI(1)).to.equal("BaseURI/1");
    });  
  });
  describe("Treasury mint test", async function () {
    it("Should set treasury address", async function () {
      await decaNFT.setTreasuryAddress(addr1.address);

      expect(await decaNFT.treasuryAddress()).to.equal(addr1.address);
    });

    it("Should mint to treasury address", async function () {
      await decaNFT.setTreasuryAddress(addr1.address);
      await decaNFT.treasuryMint(0);

      expect(await decaNFT.ownerOf(0)).to.equal(addr1.address);
    });
  });
});
