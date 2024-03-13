// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

//import "@layerzerolabs/solidity-examples/contracts/token/onft721/ONFT721A.sol";

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "erc721a/contracts/ERC721A.sol";
import "./closedsea/OperatorFilterer.sol";
import "./MultisigOwnable.sol";
import "./Whitelist.sol";

error InvalidPeriodSetup();
error MaxPeriodMintSupplyReached();
error RedeemBagNotOpen();
error BagRedeemerNotSet();
error RegistryNotSet();
error NotAllowedByRegistry();
error WithdrawFailed();
error InitialTransferLockOn();
error InsufficientFunds();
error OverMaxSupply();
error PeriodNotOpen();
error MintingTooMuchInPeriod();

//The interface of a sphera head nft contract
interface IBagRedeemer {
    function redeemBags(address to, uint256[] calldata BagIds)
        external
        returns (uint256[] memory);
}

//Used for openzeppelin contract registry
interface IRegistry {
    function isAllowedOperator(address operator) external view returns (bool);
}

contract SpheraKitBag is ERC2981, MultisigOwnable, OperatorFilterer, ERC721A, Whitelist {
    event PeriodMint(address indexed minter, uint256 period, uint16 indexed amount); // Period mint event

    bool public operatorFilteringEnabled = true; //Operator Filtering for Openzepplin contract registry
    bool public initialTransferLockOn = true;   //Initial lock on transfer functionality
    bool public isRegistryActive = false;       //Openzeppelin registry checker
    address public registryAddress;             //Openzeppelin registry address

    uint256 public immutable MAX_SUPPLY;

    //----- Period mint variables definition start -----
    // Constants for period 
    uint256 public constant GTD_PERIOD = 1;     
    uint256 public constant FCFS_PERIOD = 2;
    uint256 public constant PUBLIC_PERIOD = 3;

    //Structure for Period Information
    struct PeriodInfo {
        uint32 startTime;
        uint32 endTime;
        uint64 price;
        uint64 MAX_MINT_ALLOWED;
        uint64 MAX_SUPPLY;
    }

    //Period-mint related functions
    uint256 public currentPeriod;
    mapping(uint256 => PeriodInfo) public periodInfo;
    mapping(uint256 => mapping(address => uint256)) public individualMintedInPeriod;
    mapping(uint256 => uint64) public totalMintedInPeriod;
    //----- Period mint variables definition end -----
    struct RedeemInfo {
        bool redeemBagOpen;
        address BagRedeemer;
    }
    RedeemInfo public redeemInfo;

    string private _baseTokenURI;

    address payable public immutable WITHDRAW_ADDRESS;

    constructor(
        uint256 _maxSupply,
        address payable _withdrawAddress
    ) ERC721A("SpheraKitBag", "SKB") {
        MAX_SUPPLY = _maxSupply;
        WITHDRAW_ADDRESS = _withdrawAddress;
        
    }

    // This function allows users to mint tokens during a specific period, with certain conditions and validations.
    function periodMint(
        uint256 _period,  // The period during which the minting is allowed.
        uint16 amount,     // The number of tokens the user wants to mint.
        bytes32[] memory proof // Proof of eligibility, required for GTD and FCFS periods.
    ) external payable {
        // Retrieve the period information from the contract's storage.
        PeriodInfo memory info = periodInfo[_period];

        // Check if the current period matches the requested period and if the minting period is open.
        if (
            currentPeriod != _period || // Ensure the requested period is the current active period.
            info.startTime ==  0 || // Check if the period has been set up.
            block.timestamp < info.startTime || // Ensure the current time is after the start of the period.
            block.timestamp >= info.endTime // Ensure the current time is before the end of the period.
        ) {
            revert PeriodNotOpen(); // If any of the above conditions are not met, revert the transaction.
        }
        
        // For GTD and FCFS periods, validate the sender's address using the provided proof.
        if (_period == GTD_PERIOD) {
            require(gtd_validateAddress(proof, msg.sender) == true, "Invalid minter.");
        }
        else if (_period == FCFS_PERIOD) {
            require(fcfs_validateAddress(proof, msg.sender) == true, "Invalid minter.");
        }

        // Retrieve the number of tokens already minted by the sender in this period.
        uint256 numMintedInPeriodLoc = individualMintedInPeriod[_period][msg.sender];

        // Check if the sender is trying to mint more tokens than allowed in this period.
        if (amount >= info.MAX_MINT_ALLOWED - individualMintedInPeriod[_period][msg.sender]) {
            revert MintingTooMuchInPeriod(); // Revert if the sender exceeds their limit.
        }

        // Retrieve the total number of tokens minted in this period so far.
        uint64 totalPeriodMintedLocal = totalMintedInPeriod[_period];

        // Check if the sender is trying to mint more tokens than the period's total supply limit.
        if (amount + totalPeriodMintedLocal >= info.MAX_SUPPLY) {
            revert MaxPeriodMintSupplyReached(); // Revert if the total supply limit is exceeded.
        }

        // Check if the minting would exceed the contract's overall supply limit.
        if (_totalMinted() + amount >= MAX_SUPPLY) {
            revert OverMaxSupply(); // Revert if the overall supply limit is exceeded.
        }

        // Calculate the total cost of minting the requested amount of tokens.
        uint256 totalCost = uint256(info.price) * amount;

        // Ensure the sender has sent enough Ether to cover the cost.
        if (msg.value < totalCost) {
            revert InsufficientFunds(); // Revert if the sender has not sent enough Ether.
        }

        // Update the number of tokens minted by the sender in this period and the total minted in this period.
        unchecked {
            individualMintedInPeriod[_period][msg.sender] = amount + numMintedInPeriodLoc;
            totalMintedInPeriod[_period] = totalPeriodMintedLocal + amount;
        }

        //Send current balance of the contract to withdraw address
        assert(WITHDRAW_ADDRESS != address(0));
        (bool sent, ) = WITHDRAW_ADDRESS.call{value: address(this).balance}("");
        if (!sent) {
            revert WithdrawFailed();
        }

        // Mint the requested amount of tokens to the sender's address.
        _mint(msg.sender, amount);

        // Emit an event to log the minting transaction.
        emit PeriodMint(msg.sender, _period, amount);
    }


    /*
        This function sets which stage are we in.
        1:GTD phase
        2:FCFS phase
        3:public phase
    */
    function openPeriod(uint256 _period) public onlyOwner{
        currentPeriod = _period;
    }

    // This function allows the contract owner to set the parameters for a specific minting period.
    function setPeriodParams(
        uint256 _period, // The identifier of the period for which parameters are being set.
        uint32 _startTime, // The start time of the period in seconds since the Unix epoch.
        uint32 _endTime, // The end time of the period in seconds since the Unix epoch.
        uint64 _price, // The price per token in wei for this period.
        uint64 _MAX_MINT_ALLOWED, // The maximum number of tokens allowed to be minted by a single address during this period.
        uint64 _MAX_SUPPLY // The maximum total supply of tokens for this period.
    ) external onlyOwner {
        // Validate the input parameters to ensure they are valid and do not conflict.
        if (
            _startTime ==  0 || _endTime ==  0 || _price ==  0 // Ensure that start time, end time, and price are not zero.
        ) {
            revert InvalidPeriodSetup(); // Revert if any of the required parameters are missing or invalid.
        }
        if (_startTime >= _endTime) { // Ensure the start time is before the end time.
            revert InvalidPeriodSetup(); // Revert if the start time is not before the end time.
        }

        // Set the period information in the contract's storage.
        periodInfo[_period] = PeriodInfo(
            _startTime,
            _endTime,
            _price,
            _MAX_MINT_ALLOWED,
            _MAX_SUPPLY
        );
    }

    function withdraw() external onlyOwner() {
        (bool sent, ) = WITHDRAW_ADDRESS.call{value: address(this).balance}("");
        if (!sent) {
            revert WithdrawFailed();
        }
    }

    // -----------
    // Redeem Bag
    // -----------
    function redeemBags(uint256[] calldata BagIds)
        external
        returns (uint256[] memory)
    {
        RedeemInfo memory info = redeemInfo;
        if (!info.redeemBagOpen) {
            revert RedeemBagNotOpen();
        }
        return _redeemBagsImpl(msg.sender, BagIds, true, info.BagRedeemer);
    }

    function _redeemBagsImpl(
        address BagOwner,
        uint256[] memory BagIds,
        bool burnOwnerOrApprovedCheck,
        address BagRedeemer
    ) private returns (uint256[] memory) {
        for (uint256 i; i < BagIds.length; ) {
            _burn(BagIds[i], burnOwnerOrApprovedCheck);
            unchecked {
                ++i;
            }
        }
        return IBagRedeemer(BagRedeemer).redeemBags(BagOwner, BagIds);
    }

    function openRedeemBagState() external onlyOwner {
        RedeemInfo memory info = redeemInfo;
        if (info.BagRedeemer == address(0)) {
            revert BagRedeemerNotSet();
        }
        redeemInfo = RedeemInfo(true, info.BagRedeemer);
    }

    function setBagRedeemer(address contractAddress) external onlyOwner {
        redeemInfo = RedeemInfo(redeemInfo.redeemBagOpen, contractAddress);
    }

    // -------------------
    // Break transfer lock
    // -------------------
    function breakTransferLock() external onlyOwner {
        initialTransferLockOn = false;
    }

    // --------
    // Metadata
    // --------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // --------
    // EIP-2981
    // --------
    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // ---------------------------------------------------
    // OperatorFilterer overrides (overrides, values etc.)
    // ---------------------------------------------------
    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721A)
        onlyAllowedOperatorApproval(operator)
    {
        if (initialTransferLockOn) revert InitialTransferLockOn();
        super.setApprovalForAll(operator, approved);
    }

    function setOperatorFilteringEnabled(bool value) public onlyOwner {
        operatorFilteringEnabled = value;
    }

    function _operatorFilteringEnabled() internal view override returns (bool) {
        return operatorFilteringEnabled;
    }

    function approve(address operator, uint256 tokenId)
        public
        payable
        override(ERC721A)
        onlyAllowedOperatorApproval(operator)
    {
        if (initialTransferLockOn) revert InitialTransferLockOn();
        super.approve(operator, tokenId);
    }

    // ERC721A calls transferFrom internally in its two safeTransferFrom functions, so we don't need to override those.
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override(ERC721A) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    // --------------
    // Registry check
    // --------------
    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override {
        if (initialTransferLockOn && from != address(0) && to != address(0))
            revert InitialTransferLockOn();
        if (_isValidAgainstRegistry(msg.sender)) {
            super._beforeTokenTransfers(from, to, startTokenId, quantity);
        } else {
            revert NotAllowedByRegistry();
        }
    }

    function _isValidAgainstRegistry(address operator)
        internal
        view
        returns (bool)
    {
        if (isRegistryActive) {
            IRegistry registry = IRegistry(registryAddress);
            return registry.isAllowedOperator(operator);
        }
        return true;
    }

    function setIsRegistryActive(bool _isRegistryActive) external onlyOwner {
        if (registryAddress == address(0)) revert RegistryNotSet();
        isRegistryActive = _isRegistryActive;
    }

    function setRegistryAddress(address _registryAddress) external onlyOwner {
        registryAddress = _registryAddress;
    }
    // ----------------------------------------------
    // EIP-165
    // ----------------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return
            ERC721A.supportsInterface(interfaceId) ||
            ERC2981.supportsInterface(interfaceId);
    }

    //Overriden
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }
}