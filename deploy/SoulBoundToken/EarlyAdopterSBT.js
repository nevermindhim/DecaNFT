const deployArgs = require("../../constants/spheraHeadDeployArgs.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    await deploy("EarlyAdopterSBT", {
        from: deployer,
        args: [deployArgs.manager, deployArgs.backend],
        log: true,
        waitConfirmations: 3,
    })
    await hre.run("verifyContract", { contract: "EarlyAdopterSBT" })
}

module.exports.tags = ["EarlyAdopterSBT"]
