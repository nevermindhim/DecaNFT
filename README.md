<div align="center">
    <img alt="LayerZero" src="resources/LayerZeroLogo.png"/>
</div>

---

# DecaNFT

npx hardhat --network ethereum-goerli setTrustedRemote --target-network manta-testnet --contract DecaNFT
npx hardhat --network manta-testnet setTrustedRemote --target-network ethereum-goerli --contract DecaNFT

npx hardhat --network ethereum-goerli decaNFTMint --contract DecaNFT --to-address 0x43b1DB0EC2167C8811cA0216A35B3bEfc339689c --token-id 1
npx hardhat --network manta-testnet decaNFTMint --contract DecaNFT --to-address 0x43b1DB0EC2167C8811cA0216A35B3bEfc339689c --token-id 2

npx hardhat --network ethereum-goerli decaNFTMint --contract DecaNFT --qty 3