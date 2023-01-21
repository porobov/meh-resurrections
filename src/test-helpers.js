function blockID(x, y) {
    return (y - 1) * 100 + x;
  }
  
function countBlocks(fx, fy, tx, ty) {
return (tx - fx + 1) * (ty - fy + 1)
}

module.exports = { 
    countBlocks,
    blockID
}