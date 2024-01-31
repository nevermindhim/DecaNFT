// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@layerzerolabs/solidity-examples/contracts/token/onft721/ONFT721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract DecaONFT is ONFT721, ERC2981, Pausable {
    using Strings for uint256;

    string public baseTokenURI;
    string public prerevealTokenURI;
    bytes32 private merkleRoot;

    bool public revealed;
    bool public whiteListingPeriod;
    bool public mintState = true;


    uint256 public startTokenId;
    uint256 public mintLimit;
    uint256 public mintPrice;
    uint256 public totalSupply;
    uint256 public constant MAX_ELEMENTS = 2024;
    uint256 public treasuryMintedCount = 0;
    uint256 private constant MAX_TREASURY_MINT_LIMIT = 100;

    address public treasuryAddress;

    // Permitted cashier whitelisted
    // mapping(address => bool) public whitelisted;

    constructor(string memory baseURI, string memory _name, string memory _symbol, uint256 _minGasToStore, address _lzEndpoint) ONFT721(_name, _symbol, _minGasToStore, _lzEndpoint) {
        setBaseURI(baseURI);
    }

    event TreasuryMint(
        address indexed recipient,
        uint256 quantity
    );

    event Mint(
        address indexed recipient,
        uint256 quantity,
        uint256 fromIndex
    );

    event MintStateChanged(
        bool state
    );

    //Base URI for all tokens
    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (revealed == false) {
            return prerevealTokenURI;
        }
        return super.tokenURI(tokenId);
    }

    // Pre-revealing image URI for all NFTs
    function setPrerevealTokenURI(string memory prerevealURI) public onlyOwner {
        prerevealTokenURI = prerevealURI;
    }

    // Toggle for showing default Image or individual images.
    function setRevealed(bool _revealed) public onlyOwner {
        revealed = _revealed;
    }

    // Set limit for NFT batch minting
    function setMintLimit(uint256 _mintLimit) external onlyOwner {
        mintLimit = _mintLimit;
    }

    // Set NFT mint availability
    function setMintState(bool _mintState) external onlyOwner {
        mintState = _mintState;
        emit MintStateChanged(mintState);
    }

    //Sets minimum minting price for one NFT
    function setMintPrice(uint _price) external onlyOwner {
        mintPrice = _price;
    }

    //Sets starting tokenId for this chain
    function setStartTokenId(uint _startTokenId) external onlyOwner {
        startTokenId = _startTokenId;
    }
    
    //Setting WhiteListing Round
    function enableWhiteListing(bool _whiteListingPeriod) external onlyOwner {
        whiteListingPeriod = _whiteListingPeriod;
    }

    // Users can mint NFTs calling this function
    // Mint multiple NFTs at once with merkle proof
    // Merkle proof can be unnecessary if not whitelisting period.
    function mintNFT(uint256 _quantity, bytes32[] memory proof) public payable whenNotPaused() {
        uint256 supply = totalSupply;
        address _sender = msg.sender;
        require(msg.sender == owner() || msg.value >= mintPrice * _quantity, "Must send required eth to mint.");
        require(_quantity > 0, "Quantity cannot be zero.");
        require(mintState, "Mint is not available.");
        require(supply + _quantity <= MAX_ELEMENTS, "Reached max total supply.");
        require(mintLimit == 0 || _quantity <= mintLimit, "Mint limit exceeded.");

        if (whiteListingPeriod) {
            require(validateAddress(proof, msg.sender) == true, "Invalid minter.");
        }

        for (uint256 i = 1; i <= _quantity; i++) {
            _safeMint(_sender, startTokenId + supply + i);
        }
        totalSupply += _quantity;
        emit Mint(_sender, _quantity, supply);

        (bool success, ) = payable(treasuryAddress).call{value: msg.value}("");
        require(success);
    }

    // Mint function used for cross-chain communication
    // Only owner or layerzero endpoints can call this function
    function mint(address _addr, uint id)  external payable {
        require(_msgSender() == address(lzEndpoint) || _msgSender() == owner(), "Only owner and endpoints can call this function");
        _safeMint(_addr, id);
        totalSupply++;
    }

    // Set address for treasury wallet
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        treasuryAddress = _treasuryAddress;
    }

    // Mint certain number of NFTs to a treasury wallet
    function treasuryMint(uint256 _quantity) external onlyOwner {
        require(treasuryAddress != address(0), 'Treasury Address should be set up.');
        
        uint256 supply = totalSupply;
        require(_quantity > 0, "Quantity cannot be zero.");
        require(supply + _quantity <= MAX_ELEMENTS, "Reached max total supply.");
        require(treasuryMintedCount + _quantity <= MAX_TREASURY_MINT_LIMIT, "Reached treasury mint limit.");
        require(mintLimit == 0 || _quantity <= mintLimit, "Mint limit exceeded.");
        for (uint256 i = 1; i <= _quantity; i++) {
            _safeMint(treasuryAddress, startTokenId + supply + i);
        }
        totalSupply += _quantity;
        emit Mint(treasuryAddress, _quantity, supply);
        treasuryMintedCount += _quantity;
    }

    // ERC2981 Royalty START
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ONFT721, ERC2981) returns (bool) {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return
        ERC721.supportsInterface(interfaceId) ||
        ERC2981.supportsInterface(interfaceId);
    }

    //Sets default royalty percent and address
    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    // ERC2981 Royalty END

    //Extracts token ids owned by certain address
    function walletOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokensId = new uint256[](tokenCount);

        if(tokenCount == 0){
            return tokensId;
        }

        uint256 key = 0;
        for (uint256 i = 1; i <= MAX_ELEMENTS; i++) {
            if(_exists(i) && ownerOf(i) == _owner){
                tokensId[key] = i;
                key++;
                if(key == tokenCount){break;}
            }
        }

        return tokensId;
    }

    function pause() external onlyOwner whenNotPaused() {
        _pause();
    }
    
    function unpause() external onlyOwner whenPaused() {
        _unpause();
    }

    function setMerkleRoot(bytes32 newRoot) public onlyOwner() returns (bytes32) {
        merkleRoot = newRoot;
        return merkleRoot;
    }

    function validateAddress(
        bytes32[] memory _merkleProof,
        address addr
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(addr));
        return MerkleProof.verify(_merkleProof, merkleRoot, leaf);
    }
}