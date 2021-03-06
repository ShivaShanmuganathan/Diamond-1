/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findAddressPositionInFacets
} = require('../scripts/libraries/diamond.js')
const { expect } = require("chai");
const { deployDiamond } = require('../scripts/deploy.js')

const { assert } = require('chai')

describe('DiamondTest', async function () {
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let ownershipFacet
  let tx
  let receipt
  let result
  const addresses = []
  // const FacetA = artifacts.require('FacetA')
  

  before(async function () {
    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
    
  })

  it('should have three facets -- call to facetAddresses function', async () => {
    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address)
    }

    assert.equal(addresses.length, 3)
  })

  it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
    let selectors = getSelectors(diamondCutFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
    assert.sameMembers(result, selectors)
    selectors = getSelectors(diamondLoupeFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
    assert.sameMembers(result, selectors)
    selectors = getSelectors(ownershipFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
    assert.sameMembers(result, selectors)
  })

  it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
    assert.equal(
      addresses[0],
      await diamondLoupeFacet.facetAddress('0x1f931c1c')
    )
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0xcdffacc6')
    )
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0x01ffc9a7')
    )
    assert.equal(
      addresses[2],
      await diamondLoupeFacet.facetAddress('0xf2fde38b')
    )
  })

  it('should add test1 functions', async () => {
    const Test1Facet = await ethers.getContractFactory('Test1Facet')
    const test1Facet = await Test1Facet.deploy()
    await test1Facet.deployed()
    addresses.push(test1Facet.address)
    const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)'])
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(test1Facet.address)
    assert.sameMembers(result, selectors)
  })

  it('should test function call', async () => {
    const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
    await test1Facet.test1Func10()
  })

  it('should replace supportsInterface function', async () => {
    
    const Test1Facet = await ethers.getContractFactory('Test1Facet')
    const selectors = getSelectors(Test1Facet).get(['supportsInterface(bytes4)'])
    const testFacetAddress = addresses[3]
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: testFacetAddress,
        action: FacetCutAction.Replace,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress)
    assert.sameMembers(result, getSelectors(Test1Facet))

  })

  it('should add test2 functions', async () => {
    const Test2Facet = await ethers.getContractFactory('Test2Facet')
    const test2Facet = await Test2Facet.deploy()
    await test2Facet.deployed()
    addresses.push(test2Facet.address)
    const selectors = getSelectors(test2Facet)
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: test2Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(test2Facet.address)
    assert.sameMembers(result, selectors)
  })

  it('should remove some test2 functions', async () => {
    const test2Facet = await ethers.getContractAt('Test2Facet', diamondAddress)
    const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()', 'test2Func19()', 'test2Func20()']
    const selectors = getSelectors(test2Facet).remove(functionsToKeep)
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[4])
    assert.sameMembers(result, getSelectors(test2Facet).get(functionsToKeep))
  })

  it('should remove some test1 functions', async () => {
    const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
    const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
    const selectors = getSelectors(test1Facet).remove(functionsToKeep)
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3])
    assert.sameMembers(result, getSelectors(test1Facet).get(functionsToKeep))
  })

  it('remove all functions and facets accept \'diamondCut\' and \'facets\'', async () => {
    let selectors = []
    let facets = await diamondLoupeFacet.facets()
    for (let i = 0; i < facets.length; i++) {
      selectors.push(...facets[i].functionSelectors)
    }
    selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)'])
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    facets = await diamondLoupeFacet.facets()
    assert.equal(facets.length, 2)
    assert.equal(facets[0][0], addresses[0])
    assert.sameMembers(facets[0][1], ['0x1f931c1c'])
    assert.equal(facets[1][0], addresses[1])
    assert.sameMembers(facets[1][1], ['0x7a0ed627'])
  })

  it('add most functions and facets', async () => {
    const diamondLoupeFacetSelectors = getSelectors(diamondLoupeFacet).remove(['supportsInterface(bytes4)'])
    const Test1Facet = await ethers.getContractFactory('Test1Facet')
    const Test2Facet = await ethers.getContractFactory('Test2Facet')
    // Any number of functions from any number of facets can be added/replaced/removed in a
    // single transaction
    const cut = [
      {
        facetAddress: addresses[1],
        action: FacetCutAction.Add,
        functionSelectors: diamondLoupeFacetSelectors.remove(['facets()'])
      },
      {
        facetAddress: addresses[2],
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(ownershipFacet)
      },
      {
        facetAddress: addresses[3],
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(Test1Facet)
      },
      {
        facetAddress: addresses[4],
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(Test2Facet)
      }
    ]
    tx = await diamondCutFacet.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const facets = await diamondLoupeFacet.facets()
    const facetAddresses = await diamondLoupeFacet.facetAddresses()
    assert.equal(facetAddresses.length, 5)
    assert.equal(facets.length, 5)
    assert.sameMembers(facetAddresses, addresses)
    assert.equal(facets[0][0], facetAddresses[0], 'first facet')
    assert.equal(facets[1][0], facetAddresses[1], 'second facet')
    assert.equal(facets[2][0], facetAddresses[2], 'third facet')
    assert.equal(facets[3][0], facetAddresses[3], 'fourth facet')
    assert.equal(facets[4][0], facetAddresses[4], 'fifth facet')
    assert.sameMembers(facets[findAddressPositionInFacets(addresses[0], facets)][1], getSelectors(diamondCutFacet))
    assert.sameMembers(facets[findAddressPositionInFacets(addresses[1], facets)][1], diamondLoupeFacetSelectors)
    assert.sameMembers(facets[findAddressPositionInFacets(addresses[2], facets)][1], getSelectors(ownershipFacet))
    assert.sameMembers(facets[findAddressPositionInFacets(addresses[3], facets)][1], getSelectors(Test1Facet))
    assert.sameMembers(facets[findAddressPositionInFacets(addresses[4], facets)][1], getSelectors(Test2Facet))
  })


  it('should add FacetA functions', async () => {
    const FacetA = await ethers.getContractFactory('FacetA')
    const facetA = await FacetA.deploy()


    // let facetA = await FacetA.deployed();
    let selectors = getSelectors(facetA);
    let addresses = [];
    addresses.push(facetA.address);
    // let diamond  = await Diamond.deployed();
    // let diamondCutFacet = await DiamondCutFacet.at(diamond.address);
    await diamondCutFacet.diamondCut([[facetA.address, FacetCutAction.Add, selectors]], ethers.constants.AddressZero, '0x');

    // let diamondLoupeFacet = await DiamondLoupeFacet.at(diamond.address);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0]);
    assert.sameMembers(result, selectors)
  })

  it('should test function call', async () => {
    // let diamond  = await Diamond.deployed();
    // let facetAViaDiamond = await FacetA.at(diamond.address);
    
    // await facetAViaDiamond.setDataA(dataToStore);
    // let dataA = await facetAViaDiamond.getDataA();
    // assert.equal(dataA,web3.eth.abi.encodeParameter('bytes32', dataToStore));
    const [owner, addr1, addr2] = await ethers.getSigners();

    const dataToStore = '0xabcdef';
    const padded_data = ethers.utils.hexZeroPad(dataToStore, 32)
    const testFacetA = await ethers.getContractAt('FacetA', diamondAddress)
    await testFacetA.setDataA(padded_data, 500)
    
    await expect(testFacetA.connect(addr1).getDataA()).to.be.revertedWith('Must be owner.');
    
    result = await testFacetA.connect(owner).getDataA();
    console.log(result.digits.toNumber());
    console.log(result.owner.toString());
    
  })


  it('should add FacetB functions', async () => {
    const FacetB = await ethers.getContractFactory('FacetB')
    const facetB = await FacetB.deploy()


    // let facetB = await FacetB.deployed();
    let selectors = getSelectors(facetB);
    let addresses = [];
    addresses.push(facetB.address);
    // let diamond  = await Diamond.deployed();
    // let diamondCutFacet = await DiamondCutFacet.at(diamond.address);
    await diamondCutFacet.diamondCut([[facetB.address, FacetCutAction.Add, selectors]], ethers.constants.AddressZero, '0x');

    // let diamondLoupeFacet = await DiamondLoupeFacet.at(diamond.address);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0]);
    assert.sameMembers(result, selectors)
  })


  it('should test function call -- FacetB', async () => {
    console.log("Testing Facet B");
    console.log();
    // let diamond  = await Diamond.deployed();
    // let facetAViaDiamond = await FacetA.at(diamond.address);
    
    // await facetAViaDiamond.setDataA(dataToStore);
    // let dataA = await facetAViaDiamond.getDataA();
    // assert.equal(dataA,web3.eth.abi.encodeParameter('bytes32', dataToStore));
    const [owner, addr1, addr2] = await ethers.getSigners();

    const dataToStore = '0xabcdef';
    const padded_data = ethers.utils.hexZeroPad(dataToStore, 32)
    const testFacetB = await ethers.getContractAt('FacetB', diamondAddress)
    await testFacetB.setDataB(padded_data, 200)
    
    await expect(testFacetB.connect(addr1).getDataB()).to.be.revertedWith('Must be owner.');
    
    result = await testFacetB.connect(owner).getDataB();
    console.log(result.digits.toNumber());
    console.log(result.owner.toString());
    
  })

  it('should test function call -- FacetA', async () => {
    console.log("Testing Facet A again");
    console.log();

    // let diamond  = await Diamond.deployed();
    // let facetAViaDiamond = await FacetA.at(diamond.address);
    
    // await facetAViaDiamond.setDataA(dataToStore);
    // let dataA = await facetAViaDiamond.getDataA();
    // assert.equal(dataA,web3.eth.abi.encodeParameter('bytes32', dataToStore));
    const [owner, addr1, addr2] = await ethers.getSigners();

    const dataToStore = '0xabcdef';
    const padded_data = ethers.utils.hexZeroPad(dataToStore, 32)

    const testFacetA = await ethers.getContractAt('FacetA', diamondAddress)
    // await testFacetA.setDataA(padded_data, 500)
    
    await expect(testFacetA.connect(addr1).getDataA()).to.be.revertedWith('Must be owner.');
    
    result = await testFacetA.connect(owner).getDataA();
    console.log(result.digits.toNumber());
    console.log(result.owner.toString());
    
  })


  it('should add FacetC functions', async () => {
    const FacetC = await ethers.getContractFactory('FacetC')
    const facetC = await FacetC.deploy()


    // let facetC = await FacetC.deployed();
    let selectors = getSelectors(facetC);
    let addresses = [];
    addresses.push(facetC.address);
    // let diamond  = await Diamond.deployed();
    // let diamondCutFacet = await DiamondCutFacet.at(diamond.address);
    await diamondCutFacet.diamondCut([[facetC.address, FacetCutAction.Add, selectors]], ethers.constants.AddressZero, '0x');

    // let diamondLoupeFacet = await DiamondLoupeFacet.at(diamond.address);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0]);
    assert.sameMembers(result, selectors)
  })

  it('should test function call -- FacetC', async () => {
    console.log("Testing Facet C");
    console.log();
    // let diamond  = await Diamond.deployed();
    // let facetAViaDiamond = await FacetA.at(diamond.address);
    
    // await facetAViaDiamond.setDataA(dataToStore);
    // let dataA = await facetAViaDiamond.getDataA();
    // assert.equal(dataA,web3.eth.abi.encodeParameter('bytes32', dataToStore));
    const [owner, addr1, addr2] = await ethers.getSigners();

    const dataToStore = '0xabcdef';
    const padded_data = ethers.utils.hexZeroPad(dataToStore, 32)
    const testFacetC = await ethers.getContractAt('FacetC', diamondAddress)
    await testFacetC.setDataC(padded_data, 200)
    
    await expect(testFacetC.connect(addr1).getDataC()).to.be.revertedWith('Must be owner.');
    
    result = await testFacetC.connect(owner).getDataC();
    console.log(result.digits.toNumber());
    console.log("FacetC new state variable");
    console.log("new_digits ", result.new_digits.toNumber());
    console.log();
    console.log(result.owner.toString());
   
  })



})
