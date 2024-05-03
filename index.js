const net = require('net')
const bp = require('bitcoin-protocol')
const fs = require('fs')
const NODEIP = '34.93.152.123'
const PORT = 8333

//Connect to a Bitcoin node's IP address using net library supporing socket
const socket = net.connect(PORT, NODEIP)
//Creates a stream which parses raw network bytes and outputs message objects
const decoder = bp.createDecodeStream()
//Create a stream which encodes message objects to raw network bytes
const encoder = bp.createEncodeStream()

socket.pipe(decoder)
encoder.pipe(socket)

/**
 * Version payload creation as the frist message
 */
encoder.write({
  magic: 0xd9b4bef9,
  command: 'version',
  payload: {
    version: 70012,
    services: Buffer(8).fill(0),
    timestamp: Math.round(Date.now() / 1000),
    receiverAddress: {
      services: Buffer('0100000000000000', 'hex'),
      address: '0.0.0.0',
      port: 8333,
    },
    senderAddress: {
      services: Buffer(8).fill(0),
      address: '0.0.0.0',
      port: 8333,
    },
    nonce: Buffer(8).fill(123),
    userAgent: 'foobar',
    startHeight: 0,
    relay: true,
  },
})
decoder.on('data', function (message) {
  console.log('Received message:', message.command)
  if (message.command === 'version') {
    // Handle received version message
    console.log('Version message:', message)
    encoder.write({ magic: 0xd9b4bef9, command: 'verack', payload: {} })
  } else if (message.command === 'verack') {
    // Handle received verack message
    console.log('Verack received, connection established.')
  } else if (message.command === 'inv') {
    console.log('Inventory message received:', message.payload)
  }
})

socket.on('error', function (err) {
  console.error('Connection error:', err)
})

socket.on('close', function () {
  console.log('Connection closed')
})

/** HandShake */
//  if (message.command === 'version') {
//   // 1. Handle received version message
//   console.log('Version message:', message)
//   //2. Send Verack
//   encoder.write({
//     magic: 0xd9b4bef9,
//     command: 'verack',
//     payload: {},
//   })
// }
// if (message.command === 'verack') {
//   // After connection is established and verack is received, request data
//   encoder.write({
//     magic: 0xd9b4bef9,
//     command: 'getdata',
//     payload: {},
//   })
// } else if (message.command === 'block' || message.command === 'tx') {
//   console.log(`Received ${message.command} data:`, message.payload)
//   // Process the block or transaction here
// } else if (message.command === 'inv') {
//   console.log('Inventory message received:', message.payload)
//   // Handle inventory message by requesting data for each item
//   const getdataPayload = message.payload.map((inv) => ({
//     type: inv.type,
//     hash: inv.hash,
//   }))
// } else if (message.command === 'addr') {
//   // Handle received list of known peers
//   console.log('Received addr message:', message)
//   const addresses = message.payload.map((info) => ({
//     ip: info.address,
//     port: info.port,
//     services: info.services.toString('hex'),
//     timestamp: new Date(info.timestamp * 1000),
//   }))
//   fs.writeFileSync('addresses.json', JSON.stringify(addresses))
//   console.log('Addresses saved to file.')
// } else if (message.command === 'ping') {
//   // Respond to ping with a pong
//   encoder.write({
//     magic: 0xd9b4bef9,
//     command: 'pong',
//     payload: { nonce: message.payload.nonce },
//   })
// } else if (message.command === 'pong') {
//   console.log('Pong received with nonce:', message.payload.nonce)
// }
