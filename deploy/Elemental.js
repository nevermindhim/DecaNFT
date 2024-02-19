module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    // get the Endpoint address
    const _name = "Elemental"
    const _symbol = "ELEM"
    const _maxSupply = 20000;
    await deploy("Elemental", {
        from: deployer,
        args: [_name, _symbol, _maxSupply],
        log: true,
        waitConfirmations: 3,
        skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "Elemental" })
}

module.exports.tags = ["Elemental"]