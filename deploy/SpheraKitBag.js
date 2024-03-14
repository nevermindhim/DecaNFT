const deployArgs = require('../constants/spheraKitBagDeployArgs.json');

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)
    console.log(deployArgs.withdrawAddress);
    
    await deploy("SpheraKitBag", {
        from: deployer,
        args: [deployArgs.name, deployArgs.symbol, deployArgs.maxSupply, deployArgs.withdrawAddress],
        log: true,
        waitConfirmations: 3
    })
    console.log(`Contract was deployed with\n
        name: ${deployArgs.name}\n
        symbol: ${deployArgs.symbol}\n
        maxSupply: ${deployArgs.maxSupply}\n
        withDrawAddress: ${deployArgs.withdrawAddress}`);
    await hre.run("verifyContract", { contract: "SpheraKitBag" })
}

module.exports.tags = ["SpheraKitBag"]