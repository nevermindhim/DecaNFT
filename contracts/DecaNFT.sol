// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@layerzerolabs/solidity-examples/contracts/token/onft721/ONFT721A.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

error ReachedMaxTotalSupply();
error ReachedMaxTreasurySupply();
error InvalidMinter(address minter);
error MintNotAvailable();
error MintLimitExceeded(uint256 quantity);

contract DecaNFT is ONFT721A, ERC2981 {
    string public baseTokenURI;
    string public prerevealTokenURI;

    bool public revealed;
    bool public minterOnly;
    bool public mintState;

    uint256 public mintLimit = 5;
    uint256 public constant MAX_ELEMENTS = 2024;
    uint256 public treasuryMintedCount = 0;
    uint256 private constant MAX_TREASURY_MINT_LIMIT = 100;

    address public treasuryAddress;

    // permitted cashier minters
    mapping(address => bool) public minters;

    constructor(string memory baseURI, string memory _name, string memory _symbol, uint256 _minGasToTransfer, address _lzEndpoint) ONFT721A(_name, _symbol, _minGasToTransfer, _lzEndpoint) {
        setBaseURI(baseURI);
    }

    event TreasuryMint(
        address indexed recipient,
        uint256 quantity,
        uint256 fromIndex
    );

    event MintStateChanged(
        bool state
    );

    function walletOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokensId = new uint256[](tokenCount);

        if(tokenCount == 0){
            return tokensId;
        }

        uint256 key = 0;
        for (uint256 i = 0; i < MAX_ELEMENTS; i++) {
            if(ownerOf(i) == _owner){
                tokensId[key] = i;
                key++;
                if(key == tokenCount){break;}
            }
        }

        return tokensId;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @dev pre-revealing image URI for all NFTs
     */
    function setPrerevealTokenURI(string memory prerevealURI) public onlyOwner {
        prerevealTokenURI = prerevealURI;
    }

    /**
     * @dev toggle for showing default Image or individual images.
     */
    function setRevealed(bool _revealed) public onlyOwner {
        revealed = _revealed;
    }

    /**
     * @dev set address for treasury wallet
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        treasuryAddress = _treasuryAddress;
    }
    /**
     * @dev mint certain number of NFTs to a treasury wallet
     */
    function treasuryMint(uint256 quantity) external onlyOwner {
        require(treasuryAddress != address(0), 'Treasury Address should be set up.');
        _treasuryMint(quantity, treasuryAddress);
    }

    function _treasuryMint(uint256 quantity, address receiver) internal {
        if (treasuryMintedCount + quantity > MAX_TREASURY_MINT_LIMIT)
        revert ReachedMaxTreasurySupply();

        if (totalSupply() + quantity > MAX_ELEMENTS)
        revert ReachedMaxTotalSupply();

        uint256 indexBeforeMint = _nextTokenId();

        _safeMint(receiver, quantity);

        treasuryMintedCount += quantity;

        emit TreasuryMint(receiver, quantity, indexBeforeMint);
    }

    function setMintLimit(uint256 _mintLimit) external onlyOwner {
        mintLimit = _mintLimit;
    }

    function setMintState(bool _mintState) external onlyOwner {
        mintState = _mintState;
        emit MintStateChanged(mintState);
    }

    modifier onlyMinters() {
        if (minterOnly && !minters[msg.sender]) {
            revert InvalidMinter(msg.sender);
        }
        _;
    }

    function mint(uint256 quantity) external onlyMinters {
        if (mintState == false) {
            revert MintNotAvailable();
        }
        if (quantity > mintLimit) {
            revert MintLimitExceeded(quantity);
        }
        if (totalSupply() + quantity > MAX_ELEMENTS)
            revert ReachedMaxTotalSupply();
        _safeMint(_msgSender(), quantity);
    }

    function addMinter(address minterAddress) external onlyOwner {
        minters[minterAddress] = true;
    }

    function removeMinter(address minterAddress) external onlyOwner {
        delete minters[minterAddress];
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId, true);
    }

    // ERC2981 Royalty START
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ONFT721A, ERC2981) returns (bool) {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return
        ERC721A.supportsInterface(interfaceId) ||
        ERC2981.supportsInterface(interfaceId);
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // ERC2981 Royalty END

    //Setting WhiteListing Round
    function enableWhiteListing(bool _minterOnly) external onlyOwner {
        minterOnly = _minterOnly;
    }
}