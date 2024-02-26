module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    // get the Endpoint address
    const _maxSupply = 3000;
    const _withdrawAddress = "0x43b1DB0EC2167C8811cA0216A35B3bEfc339689c";
    await deploy("SpheraKitBag", {
        from: deployer,
        args: [_maxSupply, _withdrawAddress],
        log: true,
        waitConfirmations: 3,
        skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "SpheraKitBag" })
}

module.exports.tags = ["SpheraKitBag"]