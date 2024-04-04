// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@layerzerolabs/solidity-examples/contracts/token/onft721/ONFT721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import {BitMaps} from "@openzeppelin/contracts/utils/structs/BitMaps.sol";

import "./closedsea/OperatorFilterer.sol";
import "./MultisigOwnable.sol";

error NotAllowedByRegistry();
error RegistryNotSet();
error InvalidTokenId();
error BagAddressNotSet();
error RedeemBagNotOpen();
error InvalidRedeemer();
error NoMoreTokenIds();

interface IRegistry {
    function isAllowedOperator(address operator) external view returns (bool);
}

contract SpheraHead is ERC2981, ONFT721, MultisigOwnable, OperatorFilterer {
    using Strings for uint;
    using BitMaps for BitMaps.BitMap;

    event BagRedeemed(address indexed to, uint indexed tokenId, uint indexed bagId);

    bool public operatorFilteringEnabled = true;
    bool public isRegistryActive = false;
    address public registryAddress;

    struct RedeemInfo {
        bool redeemBagOpen;
        address bagAddress;
    }
    RedeemInfo public redeemInfo;

    uint16 public immutable MAX_SUPPLY;
    uint16 internal _numAvailableRemainingTokens;
    // Data structure used for Fisher Yates shuffle
    uint16[65536] internal _availableRemainingTokens;

    constructor(string memory _name, string memory _symbol, uint16 maxSupply_, uint _minGasToStore, address _lzEndpoint) ONFT721(_name, _symbol, _minGasToStore, _lzEndpoint) {
        MAX_SUPPLY = maxSupply_;
        _numAvailableRemainingTokens = maxSupply_;

        _registerForOperatorFiltering();
        operatorFilteringEnabled = true;
    }

    // ------------
    // Redeem bags
    // ------------
    function redeemBags(address to, uint[] calldata bagIds) public returns (uint[] memory) {
        RedeemInfo memory info = redeemInfo;

        if (!info.redeemBagOpen) {
            revert RedeemBagNotOpen();
        }
        if (msg.sender != info.bagAddress) {
            revert InvalidRedeemer();
        }

        uint amount = bagIds.length;
        uint[] memory tokenIds = new uint[](amount);

        // Assume data has already been validated by the bag contract
        for (uint i; i < amount; ) {
            uint bagId = bagIds[i];

            uint tokenId = _useRandomAvailableTokenId();
            // Don't need safeMint, as the calling address has a SpheraKitBag in it already
            _mint(to, tokenId);
            emit BagRedeemed(to, tokenId, bagId);
            tokenIds[i] = tokenId;
            unchecked {
                ++i;
            }
        }
        return tokenIds;
    }

    // Generates a pseudorandom number between [1,MAX_SUPPLY) that has not yet been generated before, in O(1) time.
    //
    // Uses Durstenfeld's version of the Yates Shuffle https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    // with a twist to avoid having to manually spend gas to preset an array's values to be values 0...n.
    // It does this by interpreting zero-values for an index X as meaning that index X itself is an available value
    // that is returnable.
    //
    // How it works:
    //  - zero-initialize a mapping (_availableRemainingTokens) and track its length (_numAvailableRemainingTokens). functionally similar to an array with dynamic sizing
    //    - this mapping will track all remaining valid values that haven't been generated yet, through a combination of its indices and values
    //      - if _availableRemainingTokens[x] == 0, that means x has not been generated yet
    //      - if _availableRemainingTokens[x] != 0, that means _availableRemainingTokens[x] has not been generated yet
    //  - when prompted for a random number between [0,MAX_SUPPLY) that hasn't already been used:
    //    - generate a random index randIndex between [0,_numAvailableRemainingTokens)
    //    - examine the value at _availableRemainingTokens[randIndex]
    //        - if the value is zero, it means randIndex has not been used, so we can return randIndex
    //        - if the value is non-zero, it means the value has not been used, so we can return _availableRemainingTokens[randIndex]
    //    - update the _availableRemainingTokens mapping state
    //        - set _availableRemainingTokens[randIndex] to either the index or the value of the last entry in the mapping (depends on the last entry's state)
    //        - decrement _numAvailableRemainingTokens to mimic the shrinking of an array
    function _useRandomAvailableTokenId() internal returns (uint) {
        uint numAvailableRemainingTokens = _numAvailableRemainingTokens;
        if (numAvailableRemainingTokens == 0) {
            revert NoMoreTokenIds();
        }

        uint randomNum = _getRandomNum(numAvailableRemainingTokens);
        uint randomIndex = (randomNum % numAvailableRemainingTokens) + 1;
        uint valAtIndex = _availableRemainingTokens[randomIndex];

        uint result;
        if (valAtIndex == 0) {
            // This means the index itself is still an available token
            result = randomIndex;
        } else {
            // This means the index itself is not an available token, but the val at that index is.
            result = valAtIndex;
        }

        uint lastIndex = numAvailableRemainingTokens;
        if (randomIndex != lastIndex) {
            // Replace the value at randomIndex, now that it's been used.
            // Replace it with the data from the last index in the array, since we are going to decrease the array size afterwards.
            uint lastValInArray = _availableRemainingTokens[lastIndex];
            if (lastValInArray == 0) {
                // This means the index itself is still an available token
                // Cast is safe as we know that lastIndex cannot > MAX_SUPPLY, which is a uint16
                _availableRemainingTokens[randomIndex] = uint16(lastIndex);
            } else {
                // This means the index itself is not an available token, but the val at that index is.
                // Cast is safe as we know that lastValInArray cannot > MAX_SUPPLY, which is a uint16
                _availableRemainingTokens[randomIndex] = uint16(lastValInArray);
                delete _availableRemainingTokens[lastIndex];
            }
        }

        --_numAvailableRemainingTokens;

        return result;
    }

    // On-chain randomness tradeoffs are acceptable here as it's only used for the SpheraHead's id number itself, not the resulting Elemental's metadata (which is determined by the source SpheraKitBag).
    function _getRandomNum(uint numAvailableRemainingTokens) internal view returns (uint) {
        return uint(keccak256(abi.encode(block.prevrandao, blockhash(block.number - 1), address(this), numAvailableRemainingTokens)));
    }

    function setBagAddress(address contractAddress) external onlyOwner {
        redeemInfo = RedeemInfo(redeemInfo.redeemBagOpen, contractAddress);
    }

    function setRedeemBagState(bool _redeemBagOpen) external onlyOwner {
        address bagAddress = redeemInfo.bagAddress;
        if (bagAddress == address(0)) {
            revert BagAddressNotSet();
        }
        redeemInfo = RedeemInfo(_redeemBagOpen, bagAddress);
    }

    // ------------
    // Total Supply
    // ------------
    function totalSupply() external view returns (uint) {
        unchecked {
            // Does not need to account for burns as they aren't supported.
            return MAX_SUPPLY - _numAvailableRemainingTokens;
        }
    }

    // --------
    // Metadata
    // --------
    function tokenURI(uint tokenId) public view override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) {
            revert InvalidTokenId();
        }
        string memory baseURI = _getBaseURIForToken(tokenId);
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    string private _baseTokenURI;
    string private _baseTokenURIPermanent;
    // Keys are SpheraHead token ids
    BitMaps.BitMap private _isUriPermanentForToken;

    function _getBaseURIForToken(uint tokenId) private view returns (string memory) {
        return _isUriPermanentForToken.get(tokenId) ? _baseTokenURIPermanent : _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setBaseURIPermanent(string calldata baseURIPermanent) external onlyOwner {
        _baseTokenURIPermanent = baseURIPermanent;
    }

    function setIsUriPermanent(uint[] calldata tokenIds) external onlyOwner {
        for (uint i = 0; i < tokenIds.length; ) {
            _isUriPermanentForToken.set(tokenIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    // --------
    // EIP-2981
    // --------
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(uint tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // ---------------------------------------------------
    // OperatorFilterer overrides (overrides, values etc.)
    // ---------------------------------------------------
    function setApprovalForAll(address operator, bool approved) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    function setOperatorFilteringEnabled(bool value) public onlyOwner {
        operatorFilteringEnabled = value;
    }

    function _operatorFilteringEnabled() internal view override returns (bool) {
        return operatorFilteringEnabled;
    }

    function approve(address operator, uint tokenId) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    // --------------
    // Registry check
    // --------------
    // Solbase ERC721 calls transferFrom internally in its two safeTransferFrom functions, so we don't need to override those.
    // Also, onlyAllowedOperator is from closedsea
    function transferFrom(address from, address to, uint id) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        if (!_isValidAgainstRegistry(msg.sender)) {
            revert NotAllowedByRegistry();
        }
        super.transferFrom(from, to, id);
    }

    function _isValidAgainstRegistry(address operator) internal view returns (bool) {
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

    // -------
    // EIP-165
    // -------
    function supportsInterface(bytes4 interfaceId) public view override(ONFT721, ERC2981) returns (bool) {
        return ONFT721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }
}
