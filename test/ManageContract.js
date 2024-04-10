const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("ManageContract", function () {
    let ManageContract, manageContract, ISBT, iSBT, owner, addr1, addr2

    beforeEach(async function () {
        // Deploy the ManageContract
        ManageContract = await ethers.getContractFactory("ManageContract")
        manageContract = await ManageContract.deploy()
        ;[owner, addr1, addr2, _] = await ethers.getSigners()
    })

    it("Should set the right owner", async function () {
        expect(await manageContract.owner()).to.equal(owner.address)
    })

    it("Should register a new SBT contract", async function () {
        console.log(addr1)
        await manageContract.registerSBTContract(1, addr1.address)
        expect(await manageContract.getSBTContract(1)).to.equal(addr1.address)
    })

    it("Should revert if not owner tries to register a contract", async function () {
        await expect(manageContract.connect(addr1).registerSBTContract(1, addr2.address)).to.be.revertedWith(
            "Only the owner can call this function"
        )
    })
})
