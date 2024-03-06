const { expect } = require("chai");
const { ethers } = require("hardhat");
// const { BigNumber } = require("ethers")

// const conf = require('../conf.js')
const WANNA_CHECK_ALL_COORDS = false

let usingToolsAdapter

describe("Block coordinates tools", function () {
  
    this.timeout(142000)
    before('setup', async () => {
        const UsingToolsAdapter = await ethers.getContractFactory("UsingToolsAdapter");
        usingToolsAdapter = await UsingToolsAdapter.deploy();
        await usingToolsAdapter.waitForDeployment();
    })

    // blockID
    it("Calculating blockID correctly", async function () {
        expect(await usingToolsAdapter.blockIDExt(1,1)).to.equal(1)
        expect(await usingToolsAdapter.blockIDExt(2,1)).to.equal(2)
        expect(await usingToolsAdapter.blockIDExt(100,1)).to.equal(100)
        expect(await usingToolsAdapter.blockIDExt(1,2)).to.equal(101)
        expect(await usingToolsAdapter.blockIDExt(100,2)).to.equal(200)
        expect(await usingToolsAdapter.blockIDExt(1,100)).to.equal(9901)
        expect(await usingToolsAdapter.blockIDExt(100,99)).to.equal(9900)
        expect(await usingToolsAdapter.blockIDExt(99,100)).to.equal(9999)
        expect(await usingToolsAdapter.blockIDExt(100,100)).to.equal(10000)
    })

    // blockXY
    it("Calculating blockXY correctly", async function () {
        expect(await usingToolsAdapter.blockXYExt(1)).to.eql([1,1])
        expect(await usingToolsAdapter.blockXYExt(2)).to.eql([2,1])
        expect(await usingToolsAdapter.blockXYExt(100)).to.eql([100,1])
        expect(await usingToolsAdapter.blockXYExt(101)).to.eql([1,2])
        expect(await usingToolsAdapter.blockXYExt(200)).to.eql([100,2])
        expect(await usingToolsAdapter.blockXYExt(201)).to.eql([1,3])
        expect(await usingToolsAdapter.blockXYExt(9900)).to.eql([100,99])
        expect(await usingToolsAdapter.blockXYExt(9901)).to.eql([1,100])
        expect(await usingToolsAdapter.blockXYExt(9999)).to.eql([99,100])
        expect(await usingToolsAdapter.blockXYExt(10000)).to.eql([100,100])
    })

    // blockXY
    if (WANNA_CHECK_ALL_COORDS) {
        it("Calculating blockXY correctly", async function () {
            for (let x = 1; x<=100; x++) {
                for (let y = 1; y<=100; y++) {
                    let blockID = await usingToolsAdapter.blockIDExt(x,y)
                    expect(await usingToolsAdapter.blockXYExt(blockID)).to.eql([x,y])
                }
            }
        })
    }

    // blocksList
    it("Calculating blocksList correctly", async function () {
        expect(await usingToolsAdapter.blocksListExt(1,1,1,1)).to.eql([1])

        async function checkCoords(c) {
            let blocklist = []
            for (let x = c.fx; x <= c.tx; x++) {
                for (let y = c.fy; y <=c.ty; y++) {
                    blocklist.push(await usingToolsAdapter.blockIDExt(x,y))
                }
            }
        expect(await usingToolsAdapter.blocksListExt(c.fx, c.fy, c.tx, c.ty)).to.eql(blocklist)
        }
        await checkCoords({fx:1, fy:1, tx:2, ty:2})
        await checkCoords({fx:34, fy:34, tx:35, ty:35})
        await checkCoords({fx:1, fy:1, tx:99, ty:1})
    })

    // countBlocks
    it("Counting blocks correctly", async function () {
        expect(await usingToolsAdapter.countBlocksExt(1,1,1,1)).to.equal(1)
        expect(await usingToolsAdapter.countBlocksExt(1,1,2,2)).to.equal(4)
        expect(await usingToolsAdapter.countBlocksExt(1,1,99,1)).to.equal(99)
        expect(await usingToolsAdapter.countBlocksExt(1,1,100,1)).to.equal(100)
        expect(await usingToolsAdapter.countBlocksExt(1,1,100,2)).to.equal(200)
        expect(await usingToolsAdapter.countBlocksExt(1,1,100,100)).to.equal(10000)
    })

    // isLegalCoordinates
    // ref:
    // return ((_fromX >= 1) && (_fromY >=1)  && (_toX <= 100) && (_toY <= 100) 
    // && (_fromX <= _toX) && (_fromY <= _toY));
    it("Counting blocks correctly", async function () {
        let legal = [
            {fx:1, fy:1, tx:1, ty:1},
            {fx:1, fy:1, tx:2, ty:2},
            {fx:1, fy:1, tx:99, ty:1},
            {fx:1, fy:1, tx:100, ty:100}
        ]
        for (let c of legal) {
            expect(await usingToolsAdapter.isLegalCoordinatesExt(c.fx, c.fy, c.tx, c.ty)).to.equal(true)
        }

        let illegal = [
            {fx:0, fy:1, tx:1, ty:1},
            {fx:1, fy:1, tx:2, ty:0},
            {fx:1, fy:1, tx:101, ty:1},
            {fx:1, fy:101, tx:100, ty:100},
            {fx:2, fy:2, tx:1, ty:2},
            {fx:2, fy:2, tx:2, ty:1},
        ]
        for (let c of illegal) {
            expect(await usingToolsAdapter.isLegalCoordinatesExt(c.fx, c.fy, c.tx, c.ty)).to.equal(false)
        }
    })
})