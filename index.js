const net = require('net')
const bp = require('bitcoin-protocol')
const nodeIP = '5.45.111.210'
const port = 8333

const socket = net.connect(port, nodeIP)
//Creates a stream which parses raw network bytes and outputs message objects
const decoder = bp.createDecodeStream()
//Create a stream which encodes message objects to raw network bytes
const encoder = bp.createEncodeStream()

socket.pipe(decoder)
encoder.pipe(socket)

/**
 * Version payload
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
  }
})

socket.on('error', function (err) {
  console.error('Connection error:', err)
})

socket.on('close', function () {
  console.log('Connection closed')
})
