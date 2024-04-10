const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("EarlyAdopterSBT", function () {
    let EarlyAdopterSBT, earlyAdopterSBT, owner, manager, backend, addr1, addr2

    beforeEach(async function () {
        // Deploy the contract
        EarlyAdopterSBT = await ethers.getContractFactory("EarlyAdopterSBT")
        ;[owner, manager, backend, addr1, addr2] = await ethers.getSigners()
        earlyAdopterSBT = await EarlyAdopterSBT.deploy(manager.address, backend.address)
    })

    it("Should fail if non-manager tries to mint", async function () {
        await expect(earlyAdopterSBT.connect(addr1).safeMint(addr2.address, "0x")).to.be.revertedWith("Only the manager can call this function")
    })

    it("Should fail to permit a transfer with an invalid signature", async function () {
        const signature = "0x" // Placeholder for an invalid signature
        await expect(earlyAdopterSBT.connect(manager).safeMint(addr1.address, signature)).to.be.revertedWith("INVALID_SIGNER")
    })
})
