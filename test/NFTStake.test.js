const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getAmountInWei, getAmountFromWei, moveTime } = require('../utils/helper-scripts');

describe("NFTStake.sol", () => {
    let owner;
    let stakingVault;
    let nftContract;
    let tokenContract;

    const mintCost = getAmountInWei(0.01)
    const maxSupply = 2024

    beforeEach(async () => {
        [owner, user1, user2, randomUser] = await ethers.getSigners()

        // Deploy DecaNFT NFT contract 
        const NFTContract = await ethers.getContractFactory("DecaNFT");
        nftContract = await NFTContract.deploy("", "DecaNFT", "DNFT", 100000, ethers.constants.AddressZero);

        // Deploy DecaNFT ERC20 token contract 
        const TokenContract = await ethers.getContractFactory("DecaFT");
        tokenContract = await TokenContract.deploy(ethers.constants.AddressZero);

        // Deploy NFTStake contract 
        const Vault = await ethers.getContractFactory("NFTStake");
        stakingVault = await Vault.deploy(nftContract.address, tokenContract.address);
    });

    describe("Correct Deployement", () => {
        it("NFT contract should have correct owner address", async () => {
            const nftContractOnwer = await nftContract.owner();
            const ownerAddress = await owner.getAddress();
            expect(nftContractOnwer).to.equal(ownerAddress);
        });

        it("NFT contract should have correct initial parameters", async () => {
            expect(await nftContract.baseTokenURI()).to.equal("");
            expect(await nftContract.MAX_ELEMENTS()).to.equal(maxSupply);
            expect(await nftContract.paused()).to.equal(false);

            expect(await nftContract.tokenURI(1)).to.equal("");
        });

        it("ERC20 contract should have correct owner address", async () => {
            const tokenContractOnwer = await tokenContract.owner();
            const ownerAddress = await owner.getAddress();
            expect(tokenContractOnwer).to.equal(ownerAddress);
        });
    });

    describe("Core Functions", () => {
        it("should allow user to stake its NFTs", async () => {
            await nftContract.connect(user1).mintNFT(3, [])
            const tokenIds = [1, 3]
            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            await stakingVault.connect(user1).stake(tokenIds)

            expect(await nftContract.balanceOf(stakingVault.address)).to.equal(2);
            expect(await nftContract.balanceOf(user1.address)).to.equal(1);
            expect(await stakingVault.totalItemsStaked()).to.equal(2);
            expect(await stakingVault.balanceOf(user1.address)).to.equal(2);

            const userNftWallet = Array.from((await nftContract.walletOfOwner(user1.address)), x => Number(x))
            expect(userNftWallet).to.have.members([2]);

            const userStakingWallet = Array.from((await stakingVault.tokensOfOwner(user1.address)), x => Number(x))
            expect(userStakingWallet).to.have.members(tokenIds);
        });

        it("should allow user to claim reward earned from staking", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]

            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            var userWallet = Array.from((await stakingVault.tokensOfOwner(user1.address)), x => Number(x))
            expect(userWallet).to.have.members([]);

            await stakingVault.connect(user1).stake(tokenIds)

            expect(await stakingVault.balanceOf(user1.address)).to.equal(2);
            userWallet = Array.from((await stakingVault.tokensOfOwner(user1.address)), x => Number(x))
            expect(userWallet).to.have.members(tokenIds);

            expect(await stakingVault.getTotalRewardEarned(user1.address)).to.equal(0);
            expect(await stakingVault.getRewardEarnedPerNft(tokenIds[0])).to.equal(0);

            // skip 15 days
            let waitingPeriod = 15 * 24 * 60 * 60;
            await moveTime(waitingPeriod)

            // After 15 days => daily reward = 1 tokens/day
            expect(
                Math.floor(getAmountFromWei(await stakingVault.getRewardEarnedPerNft(tokenIds[0])))
            ).to.equal(15);

            // skip 45 days
            waitingPeriod = 45 * 24 * 60 * 60;
            await moveTime(waitingPeriod)

            // After 60 days = 2 months => daily reward = 2 tokens/day
            expect(
                Math.floor(getAmountFromWei(await stakingVault.getTotalRewardEarned(user1.address)))
            ).to.equal(240);

            await stakingVault.connect(user1).claim(tokenIds)

            const user1_tokenBalance = await tokenContract.balanceOf(user1.address)
            expect(
                Math.floor(getAmountFromWei(await tokenContract.totalSupply()))
            ).to.equal(240);
            expect(Math.floor(getAmountFromWei(user1_tokenBalance))).to.equal(240);
            expect(await stakingVault.getTotalRewardEarned(user1.address)).to.equal(0);
            expect(await stakingVault.getRewardEarnedPerNft(tokenIds[0])).to.equal(0);
        });

        it("should allow user to unstake his tokens", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]

            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }
            await stakingVault.connect(user1).stake(tokenIds)

            // skip 120 days = 4 months
            const waitingPeriod = 120 * 24 * 60 * 60;
            moveTime(waitingPeriod)

            await stakingVault.connect(user1).unstake(tokenIds)

            const user1_tokenBalance = await tokenContract.balanceOf(user1.address)
            expect(
                Math.floor(getAmountFromWei(await tokenContract.totalSupply()))
            ).to.equal(960);
            expect(Math.floor(getAmountFromWei(user1_tokenBalance))).to.equal(960);

            expect(await stakingVault.balanceOf(user1.address)).to.equal(0);
            expect(await nftContract.balanceOf(stakingVault.address)).to.equal(0);
            expect(await nftContract.balanceOf(user1.address)).to.equal(3);

            const userNftWallet = Array.from((await nftContract.walletOfOwner(user1.address)), x => Number(x))
            expect(userNftWallet).to.have.members([1, 2, 3]);

        });

        it("should calculate correct daily reward based on staking period", async () => {
            const lessThanOneMonthPeriod = 20 * 24 * 60 * 60;
            const lessThanThreeMonthPeriod = 80 * 24 * 60 * 60;
            const lessThanSixMonthPeriod = 150 * 24 * 60 * 60;
            const moreThanSixMonthPeriod = 210 * 24 * 60 * 60;

            expect(await stakingVault.getDailyReward(lessThanOneMonthPeriod)).to.equal(1);
            expect(await stakingVault.getDailyReward(lessThanThreeMonthPeriod)).to.equal(2);
            expect(await stakingVault.getDailyReward(lessThanSixMonthPeriod)).to.equal(4);
            expect(await stakingVault.getDailyReward(moreThanSixMonthPeriod)).to.equal(8);
        });

        it("should not allow user to mint NFT while contract is paused", async () => {
            await nftContract.connect(owner).pause()
            await expect(nftContract.connect(user1).mintNFT(3, [])).to.be.revertedWith("Pausable: paused")
        });

        it("should not allow not NFT owner to stake his nfts", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]
            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            await expect(stakingVault.connect(user2).stake(tokenIds)).to.be.revertedWith("NFTStakingVault__NotItemOwner")
        });

        it("should not allow user to stake same NFT twice", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]
            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            await stakingVault.connect(user1).stake(tokenIds)

            // skip 30 days
            const waitingPeriod = 30 * 24 * 60 * 60;
            moveTime(waitingPeriod)

            await expect(stakingVault.connect(user1).stake([1])).to.be.revertedWith("NFTStakingVault__ItemAlreadyStaked")
        });

        it("should not allow not NFT owner to claim staking reward", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]
            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            await stakingVault.connect(user1).stake(tokenIds)

            // skip 30 days
            const waitingPeriod = 30 * 24 * 60 * 60;
            moveTime(waitingPeriod)

            await expect(stakingVault.connect(user2).claim(tokenIds)).to.be.revertedWith("NFTStakingVault__NotItemOwner")
        });

        it("should not allow not NFT owner to unstake others NFTs", async () => {
            await nftContract.connect(user1).mintNFT(3, [])

            const tokenIds = [1, 3]
            for (let i = 0; i < tokenIds.length; i++) {
                await nftContract.connect(user1).approve(stakingVault.address, tokenIds[i])
            }

            await stakingVault.connect(user1).stake(tokenIds)

            // skip 60 days
            const waitingPeriod = 60 * 24 * 60 * 60;
            moveTime(waitingPeriod)

            await expect(stakingVault.connect(user2).unstake(tokenIds)).to.be.revertedWith("NFTStakingVault__NotItemOwner")
        });
        it("only owner should be allowed to change NFT contract parametres & withdraw balance", async () => {
            await expect(nftContract.connect(randomUser).setBaseURI('ipfs://new-Nft-Uri/')).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(nftContract.connect(randomUser).pause()).to.be.revertedWith('Ownable: caller is not the owner');
        })
    });
});