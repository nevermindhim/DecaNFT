module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    await deploy("ManageContract", {
        from: deployer,
        log: true,
        waitConfirmations: 3,
    })
    await hre.run("verifyContract", { contract: "ManageContract" })
}

module.exports.tags = ["ManageContract"]
