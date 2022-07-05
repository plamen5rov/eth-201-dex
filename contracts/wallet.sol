// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";


using SafeMath for uint256;

contract Wallet is Ownable {
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

    mapping(bytes32 => Token) public tokenMapping;
    bytes32[] public tokenList;

    mapping(address => mapping(bytes32 => uint256)) public balances;

    modifier tokenExists(bytes32 ticker){
        require(tokenMapping[ticker].tokenAddress != address(0), "Token does NOT exists!");
        _;
    }

    function addToken(bytes32 ticker, address tokenAddress) external onlyOwner {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit(uint256 amount, bytes32 ticker) tokenExists(ticker) external {
        IERC20(tokenMapping[ticker].tokenAddress)
        .transferFrom(msg.sender,address(this), amount);
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    }

    function withdraw(uint256 amount, bytes32 ticker) tokenExists(ticker) external  {
        require(balances[msg.sender][ticker]>=amount, "Insufficient balance!");
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }
}
