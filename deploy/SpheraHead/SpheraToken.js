module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    await deploy("SpheraToken", {
        from: deployer,
        args: ["SpheraToken", "SPH", deployer],
        log: true,
        waitConfirmations: 3,
    })
    await hre.run("verifyContract", { contract: "SpheraToken" })
}

module.exports.tags = ["SpheraToken"]
