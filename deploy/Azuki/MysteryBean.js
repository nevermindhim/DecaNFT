module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    // get the Endpoint address
    const _azukiAddress = "0x9DF66E7019fd1C02346ae835B06d67a68096F6eb";
    const _maxSupply = 20000;
    const _totalPresaleAndAuctionSupply = 10000;
    const _withdrawAddress = "0x43b1DB0EC2167C8811cA0216A35B3bEfc339689c";
    await deploy("MysteryBean", {
        from: deployer,
        args: [_azukiAddress, _maxSupply, _totalPresaleAndAuctionSupply, _withdrawAddress],
        log: true,
        waitConfirmations: 3,
        skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "MysteryBean" })
}

module.exports.tags = ["MysteryBean"]