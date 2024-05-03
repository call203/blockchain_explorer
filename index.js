const net = require('net')
const crypto = require('crypto')
const socket = new net.Socket()
const fs = require('fs')
//'110.141.252.80'
const NODEIP = '34.93.152.123'
const PORT = 8333
const MAGIC = 'd9b4bef9'

const reverse = (d) => Buffer.from(d.toString('hex'), 'hex').reverse() //to little-endian btye
const sha256 = (data) => crypto.createHash('sha256').update(data).digest()

/**
 * Create the payload for `verson` message
 * folling https://en.bitcoin.it/wiki/Protocol_documentation
 */
const getVersionPayload = () => {
  const version = reverse(
    Buffer.from(Number(31900).toString(16).padStart(8, '0'), 'hex'),
  )
  const services = Buffer.from('0'.repeat(16), 'hex')
  const timestamp = Buffer.from('0'.repeat(16), 'hex')
  const addrRecv = Buffer.from('0'.repeat(52), 'hex')
  const addrFrom = Buffer.from('0'.repeat(52), 'hex')
  const nonce = crypto.randomBytes(8)
  const userAgent = Buffer.from('\x0f/Satoshi:0.7.2', 'utf-8')
  const startHeight = Buffer.from('0'.repeat(8), 'hex')
  const relay = Buffer.from('0'.repeat(2), 'hex')
  const payload = Buffer.concat([
    version,
    services,
    timestamp,
    addrRecv,
    addrFrom,
    nonce,
    userAgent,
    startHeight,
    relay,
  ])
  return payload
}

const getMessage = (type, payload) => {
  /**Header**/
  const magic = reverse(Buffer.from(MAGIC, 'hex'))
  const command = Buffer.from(
    Buffer.from(type, 'utf-8').toString('hex').padEnd(24, '0'),
    'hex',
  ) // the type of message
  const length = Buffer.from(
    Number(payload.length).toString(16).padEnd(8, '0'),
    'hex',
  ) //size of the upcoming payload
  const checksum = sha256(sha256(payload)).subarray(0, 4) //1st 4 bytes of SHA-256
  return Buffer.concat([magic, command, length, checksum, payload])
}

const handleHeader = async (index, data) => {
  const magic = reverse(data.subarray(index, index + 4)).toString('hex')
  const command = data.subarray(index + 4, index + 16).toString()
  const length = parseInt(
    reverse(data.subarray(index + 16, index + 20)).toString('hex'),
    16,
  )
  const checksum = data.subarray(index + 20, index + 24)
  const payload = data.subarray(index + 24, index + 24 + length)
  return { magic, length, checksum, payload, command }
}

function printInventory(payload) {
  const count = payload.readInt32LE(0)
  let offset = 4
  for (let i = 0; i < count; i++) {
    if (offset + 36 > payload.length) {
      break
    }
    const type = payload.readInt32LE(offset)
    const hash = payload.slice(offset + 4, offset + 36).toString('hex')
    console.log(`{ type: ${type}, hash:${hash} }`)
    offset += 36 // Move to the next item
  }
}

function printAddr(payload) {
  const count = payload.readInt32LE(0) // Read the number of addresses, assuming varint size is small
  console.log(`Address count: ${count}`)
  let offset = 4
  for (let i = 0; i < count; i++) {
    if (offset + 36 > payload.length) {
      break
    }
    const timestamp = payload.readUInt32LE(offset)
    const services = payload.readBigUInt64LE(offset + 4)
    const ipRaw = payload.slice(offset + 12, offset + 28)
    const ip = ipRaw.toString('hex') // Convert raw IP to hex or use a method to parse to human-readable
    const port = payload.readUInt16BE(offset + 28) // Big Endian for port
    console.log(`Address ${i}: ${timestamp}, ${services}, ${ip}, ${port}`)
    offset += 30 // Move to the next address
  }
}

const handleMessage = async (command, payload) => {
  command = command.replace(/\0/g, '')

  /** HandShake */
  if (command == 'version') {
    socket.write(getMessage('verack', Buffer.alloc(0))) //send verack
    console.log('Verack has been sent')
  } else if (command == 'verack') {
    console.log('Verack received, connection established.')
    socket.write(getMessage('getaddr', Buffer.alloc(0))) //send getaddr
  } else if (command === 'inv') {
    console.log('Inventory message recieved:')
    printInventory(payload)
  } else if (command === 'addr') {
    console.log('Received addr message:')
    printAddr(payload)
  } else if (command?.startsWith('ping')) {
    console.log('Pong has been sent')
    socket.write(getMessage('pong', payload))
  }
}

;(async () => {
  //Connect to a Bitcoin node IP address using `net` library in JS
  socket.connect(PORT, NODEIP, () => {
    console.log(`Connected to ${NODEIP}`)
    //Send `version`(header + payload) as a first message to send to a node after connecting to that
    socket.write(getMessage('version', getVersionPayload()))
  })

  //New data is received
  socket.on('data', async (data) => {
    let index = 0
    while (index < data.length) {
      const { length, command, payload } = await handleHeader(index, data)

      await handleMessage(command, payload)
      index += 24 + length // size of header (24) + playload length
    }
  })
})()
