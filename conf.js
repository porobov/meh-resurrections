module.exports = { 
    oldMehAbi: '[{\"constant\":false,\"inputs\":[{\"name\":\"newDelayInSeconds\",\"type\":\"uint32\"},{\"name\":\"newCharityAddress\",\"type\":\"address\"},{\"name\":\"newImagePlacementPriceInWei\",\"type\":\"uint256\"}],\"name\":\"adminContractSettings\",\"outputs\":[],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"emergencyRefund\",\"outputs\":[],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"priceForEachBlockInWei\",\"type\":\"uint256\"}],\"name\":\"sellBlocks\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"getAreaPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"getBlockInfo\",\"outputs\":[{\"name\":\"landlord\",\"type\":\"address\"},{\"name\":\"imageID\",\"type\":\"uint256\"},{\"name\":\"sellPrice\",\"type\":\"uint256\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"name\":\"adUrl\",\"type\":\"string\"},{\"name\":\"adText\",\"type\":\"string\"}],\"name\":\"placeImage\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":true,\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"buyBlocks\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":true,\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"userAddress\",\"type\":\"address\"}],\"name\":\"getUserInfo\",\"outputs\":[{\"name\":\"referal\",\"type\":\"address\"},{\"name\":\"handshakes\",\"type\":\"uint8\"},{\"name\":\"balance\",\"type\":\"uint256\"},{\"name\":\"activationTime\",\"type\":\"uint32\"},{\"name\":\"banned\",\"type\":\"bool\"},{\"name\":\"userID\",\"type\":\"uint256\"},{\"name\":\"refunded\",\"type\":\"bool\"},{\"name\":\"investments\",\"type\":\"uint256\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"userID\",\"type\":\"uint256\"}],\"name\":\"getUserAddressByID\",\"outputs\":[{\"name\":\"userAddress\",\"type\":\"address\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getMyInfo\",\"outputs\":[{\"name\":\"balance\",\"type\":\"uint256\"},{\"name\":\"activationTime\",\"type\":\"uint32\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getStateInfo\",\"outputs\":[{\"name\":\"_numUsers\",\"type\":\"uint256\"},{\"name\":\"_blocksSold\",\"type\":\"uint16\"},{\"name\":\"_totalWeiInvested\",\"type\":\"uint256\"},{\"name\":\"_numImages\",\"type\":\"uint256\"},{\"name\":\"_setting_imagePlacementPriceInWei\",\"type\":\"uint256\"},{\"name\":\"_numNewStatus\",\"type\":\"uint256\"},{\"name\":\"_setting_delay\",\"type\":\"uint32\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"withdrawAll\",\"outputs\":[],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"referal\",\"type\":\"address\"}],\"name\":\"signIn\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"imageID\",\"type\":\"uint256\"}],\"name\":\"getImageInfo\",\"outputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"name\":\"adUrl\",\"type\":\"string\"},{\"name\":\"adText\",\"type\":\"string\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"charityBalance\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"charityAddress\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"violator\",\"type\":\"address\"},{\"name\":\"banViolator\",\"type\":\"bool\"},{\"name\":\"pauseContract\",\"type\":\"bool\"},{\"name\":\"refundInvestments\",\"type\":\"bool\"}],\"name\":\"adminContractSecurity\",\"outputs\":[],\"payable\":false,\"type\":\"function\"},{\"inputs\":[],\"type\":\"constructor\"},{\"payable\":false,\"type\":\"fallback\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"newUser\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"invitedBy\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"activationTime\",\"type\":\"uint32\"}],\"name\":\"NewUser\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"price\",\"type\":\"uint256\"}],\"name\":\"NewAreaStatus\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adText\",\"type\":\"string\"}],\"name\":\"NewImage\",\"type\":\"event\"}]',
    newMehAbi: '[{\"constant\":true,\"inputs\":[{\"name\":\"_interfaceId\",\"type\":\"bytes4\"}],\"name\":\"supportsInterface\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetMarket\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"getBlockOwner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"getApproved\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"areaPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"InterfaceId_ERC165\",\"outputs\":[{\"name\":\"\",\"type\":\"bytes4\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"}],\"name\":\"balances\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenOfOwnerByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"withdraw\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_payer\",\"type\":\"address\"},{\"name\":\"_recipient\",\"type\":\"address\"},{\"name\":\"_amount\",\"type\":\"uint256\"}],\"name\":\"operatorTransferFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"unpause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"rentals\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"exists\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"adminImportOldMEBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"priceForEachBlockWei\",\"type\":\"uint256\"}],\"name\":\"sellArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"ownerOf\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_blockId\",\"type\":\"uint16\"}],\"name\":\"_mintCrowdsaleBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"imageSource\",\"type\":\"string\"},{\"name\":\"link\",\"type\":\"string\"},{\"name\":\"text\",\"type\":\"string\"}],\"name\":\"placeAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"market\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"rentOutArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"blockID\",\"outputs\":[{\"name\":\"\",\"type\":\"uint16\"}],\"payable\":false,\"stateMutability\":\"pure\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"pause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetRentals\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"buyArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"adminRescueFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"setApprovalForAll\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"advertiser\",\"type\":\"address\"},{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"canAdvertise\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"areaRentPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"ads\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"name\":\"_data\",\"type\":\"bytes\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"tokenURI\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_operator\",\"type\":\"address\"}],\"name\":\"isApprovedForAll\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"rentArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"isMEH\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"newLandlord\",\"type\":\"address\"}],\"name\":\"LogBuys\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"sellPrice\",\"type\":\"uint256\"}],\"name\":\"LogSells\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"LogRentsOut\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"numberOfPeriods\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"rentedFrom\",\"type\":\"uint256\"}],\"name\":\"LogRents\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adText\",\"type\":\"string\"},{\"indexed\":true,\"name\":\"advertiser\",\"type\":\"address\"}],\"name\":\"LogAds\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"payerOrPayee\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"balanceChange\",\"type\":\"int256\"}],\"name\":\"LogContractBalance\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"newAddress\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"moduleName\",\"type\":\"string\"}],\"name\":\"LogModuleUpgrade\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Pause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Unpause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"}],\"name\":\"OwnershipRenounced\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_from\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_to\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_approved\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_operator\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"ApprovalForAll\",\"type\":\"event\"}]',
    wethAbi: '[{\"constant\":true,\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"guy\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"src\",\"type\":\"address\"},{\"name\":\"dst\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"withdraw\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"decimals\",\"outputs\":[{\"name\":\"\",\"type\":\"uint8\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"dst\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"transfer\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"deposit\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"},{\"name\":\"\",\"type\":\"address\"}],\"name\":\"allowance\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"fallback\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"guy\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"dst\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"dst\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Deposit\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Withdrawal\",\"type\":\"event\"}]',
    oldMehAddress: "0x15dbdB25f870f21eaf9105e68e249E0426DaE916",
    newMehAddress: '0xCEf41878Db032586C835eE0890484399402A64f6',
    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
};
