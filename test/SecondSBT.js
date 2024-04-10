const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("SecondSBT", function () {
    let SecondSBT, secondSBT, owner, manager, backend, addr1, addr2

    beforeEach(async function () {
        // Deploy the contract
        SecondSBT = await ethers.getContractFactory("SecondSBT")
        ;[owner, manager, backend, addr1, addr2] = await ethers.getSigners()
        secondSBT = await SecondSBT.deploy(manager.address, backend.address)
    })

    it("Should fail if non-manager tries to mint", async function () {
        await expect(secondSBT.connect(addr1).safeMint(addr2.address, "0x")).to.be.revertedWith("Only the manager can call this function")
    })

    it("Should fail to permit a transfer with an invalid signature", async function () {
        const signature = "0x" // Placeholder for an invalid signature
        await expect(secondSBT.connect(manager).safeMint(addr1.address, signature)).to.be.revertedWith("INVALID_SIGNER")
    })
})
