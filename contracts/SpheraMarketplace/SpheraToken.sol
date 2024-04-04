// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SpheraToken is ERC20, Ownable {
    // Error Codes
    constructor(string memory _name, string memory _symbol) Ownable() ERC20(_name, _symbol) {
        _mint(address(this), 200000000 * (10**18));
    }

    function issueToken(address _to, uint _amount) public onlyOwner {
        transfer(_to, _amount);
    }
}
