task("getSigners", "show the signers of the current mnemonic", require("./getSigners")).addOptionalParam("n", "how many to show", 3, types.int)

task(
    "setTrustedRemote",
    "setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts",
    require("./setTrustedRemote")
).addParam("targetNetwork", "the target network to set as a trusted remote")
    .addOptionalParam("localContract", "Name of local contract if the names are different")
    .addOptionalParam("remoteContract", "Name of remote contract if the names are different")
    .addOptionalParam("contract", "If both contracts are the same name")

task("mintNFT", "mint tokens", require("./mintNFT.js"))
    .addParam("tokenId", "id of tokens to mint")
    .addParam("contract", "If both contracts are the same name")

task("sendToken", "send an ONFT nftId from one chain to another", require("./sendToken"))
    .addParam("targetNetwork", "the chainId to transfer to")

//
task("sendNFT", "send an ONFT nftId from one chain to another", require("./sendNFT.js"))
    .addParam("tokenId", "the tokenId of ONFT")
    .addParam("targetNetwork", "the chainId to transfer to")
    .addParam("contract", "ONFT contract name")

task("setMinDstGas", "set min gas required on the destination gas", require("./setMinDstGas"))
    .addParam("packetType", "message Packet type")
    .addParam("targetNetwork", "the chainId to transfer to")
    .addParam("contract", "contract name")
    .addParam("minGas", "min gas")
    
task("verifyContract", "", require("./verifyContract.js"))
    .addParam("contract", "contract name")

task("estimateGas", "estimateGas", require("./estimateGas"))
