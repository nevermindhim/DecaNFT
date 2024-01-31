const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = ethers.utils;

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
    //decaNFT = await DecaNFT.deploy("", "DecaNFT", "DNFT", 100000, ethers.constants.AddressZero);
    //await decaNFT.deployed();
    decaNFT = await upgrades.deployProxy(DecaNFT, ["", "DecaNFT", "DNFT"]);
    await decaNFT.deployed();
    await decaNFT.setMintState(true);
  });

  describe("Mint test", function () {
    it("Should have an error minting new tokens", async function () {
      await decaNFT.setMintState(false);
      
      await expect(decaNFT.mintNFT(2, [])).to.be.revertedWith("Mint is not available.");
    });
  
    it("Should mint new tokens", async function () {
      await decaNFT.setMintPrice(ethers.utils.parseEther("0.0003"));
      expect(await decaNFT.connect(addr1).mintNFT(2, [], { value: ethers.utils.parseEther("0.0006") }))
      
      expect(await decaNFT.totalSupply()).to.equal(2);
      expect(await decaNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await decaNFT.ownerOf(2)).to.equal(addr1.address);
      expect(await decaNFT.balanceOf(addr1.address)).to.equal(2);
    });

    it("Should fail with mint price error", async function () {
      await decaNFT.setMintPrice(ethers.utils.parseEther("0.0003"));
      await expect(decaNFT.connect(addr1).mintNFT(2, [], { value: ethers.utils.parseEther("0.0005") })).to.be.revertedWith("Must send required eth to mint.");
    });
  
    it("Should have an mint limit error", async function () {
      await decaNFT.setMintLimit(5);

      await expect(decaNFT.mintNFT(6, [])).to.be.revertedWith("Mint limit exceeded.");
    });

    describe("Whitelisting test", async function () {
      let whitelist, proof = [], merkleTree;
      beforeEach(async function () {
        whitelist = [
          '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
          '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
          '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
        ];

        await decaNFT.enableWhiteListing(true);

      });
      
      it("Should mint new tokens", async function () {
        whitelist.push(addr1.address);
        let leaves = whitelist.map((addr) => keccak256(addr));
        merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const merkleRootHash = await merkleTree.getHexRoot()
        decaNFT.setMerkleRoot(merkleRootHash);
      
        let hashedAddress = keccak256(addr1.address)
        proof = merkleTree.getHexProof(hashedAddress)
        await decaNFT.connect(addr1).mintNFT(2, proof);
    
        expect(await decaNFT.whiteListingPeriod()).to.equal(true);
        expect(await decaNFT.ownerOf(1)).to.equal(addr1.address);
        expect(await decaNFT.ownerOf(2)).to.equal(addr1.address);
        expect(await decaNFT.balanceOf(addr1.address)).to.equal(2);
      });

      it("Should fail with whitelist error", async function () {
        await expect(decaNFT.connect(addr2).mintNFT(1, [])).to.be.revertedWith("Invalid minter.");
      });
    });
  });

  describe("Token URI test", function () {
    it("Should show prereveal token URI", async function() {
      await decaNFT.setPrerevealTokenURI("PrerevealURI");
      await decaNFT.mintNFT(1, []);

      expect(await decaNFT.tokenURI(1)).to.equal("PrerevealURI");
    });

    it("Should show individual token URI", async function () {
      await decaNFT.setBaseURI("BaseURI");
      await decaNFT.setRevealed(true);
      await decaNFT.mintNFT(2, []);

      expect(await decaNFT.tokenURI(1)).to.equal("BaseURI1");
      expect(await decaNFT.tokenURI(2)).to.equal("BaseURI2");
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
      expect(await decaNFT.ownerOf(2)).to.equal(addr1.address);

      expect(await decaNFT.treasuryMintedCount()).to.equal(2);
    });
  });
});
