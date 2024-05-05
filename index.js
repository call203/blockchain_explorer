const net = require('net')
const crypto = require('crypto')
const socket = new net.Socket()
const fs = require('fs')
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

const handleHeader = async (offset, data) => {
  const magic = reverse(data.slice(offset, offset + 4)).toString('hex') //4byte
  const command = data.slice(offset + 4, offset + 16).toString() //12byte
  const length = parseInt(
    reverse(data.slice(offset + 16, offset + 20)).toString('hex'),
    16,
  ) // byte, convert the hex string into an integer

  const checksum = data.slice(offset + 20, offset + 24) //4byte
  const payload = data.slice(offset + 24, offset + 24 + length) //rest of data
  return { magic, length, checksum, payload, command }
}

/**
 *`inv`
 *count: Nu,ber of inventory entries
 *inventory: inveryory vectors []
 */
function printInventory(data) {
  let offset = 0
  const count = parseInt(
    reverse(data.slice(offset, offset + 1)).toString('hex'),
    16,
  ) //1byte
  console.log('count :' + count)

  while (offset + 36 < data.length) {
    const type = parseInt(
      reverse(data.slice(offset + 1, offset + 5)).toString('hex'),
      16,
    )
    const hash = reverse(data.slice(offset + 5, offset + 37)).toString('hex') //36byte
    console.log(`{ type: ${type}, hash:${hash} }`)
    offset += 36 // Move to the next item
  }
}

function printAddr(data) {
  let offset = 0
  const count = decodeVarInt(data)
  console.log('count:', count.count)

  const addresses = []
  offset = count.offset

  while (offset + 30 < data.length) {
    const timestamp = new Date(
      parseInt(reverse(data.slice(offset, offset + 4)).toString('hex'), 16) *
        1000,
    ).toISOString()

    const services = reverse(data.slice(offset + 4, offset + 12)).toString(
      'hex',
    )
    // IPv4 to IPv6:
    const address = data.slice(offset + 12, offset + 28)

    const port = parseInt(
      reverse(data.slice(offset + 28, offset + 30)).toString('hex'),
      16,
    )
    addresses.push({
      timestamp: timestamp,
      services: services,
      address: address,
      port: port,
    })
    offset += 30
  }
  fs.writeFile('addresses.json', JSON.stringify(addresses, null, 2), (err) => {
    if (err) throw err
    console.log('Saved addresses')
  })
}
function decodeVarInt(data) {
  let count = 0
  let offset = 0
  const firstByte = parseInt(
    reverse(data.slice(0, offset + 1)).toString('hex'),
    16,
  )
  //if 1byte
  if (firstByte < 0xfd) {
    count = firstByte
    offset = 1
  } else if (firstByte === 0xfd) {
    //if 2byte
    count = parseInt(reverse(data.slice(0, offset + 2)).toString('hex'), 16)
    offset = 3
  } else if (firstByte === 0xfe) {
    //if 3byte
    count = parseInt(reverse(data.slice(0, offset + 4)).toString('hex'), 16)
    offset = 5
  }
  return { count, offset }
}

function sendPing() {
  const nonce = crypto.randomBytes(8)
  socket.write(getMessage('ping', nonce))
  console.log('Ping has been sent')
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
    console.log('Received inventory message:')
    printInventory(payload)
  } else if (command === 'addr') {
    console.log('Received addr message:')
    printAddr(payload)
  } else if (command === 'ping') {
    console.log('Pong has been sent')
    socket.write(getMessage('pong', payload))
  } else if (command === 'pong') {
    console.log('Pong received, connection established.')
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
    let offset = 0
    while (offset < data.length) {
      const { length, command, payload } = await handleHeader(offset, data)

      await handleMessage(command, payload)
      offset += 24 + length // size of header (24) + playload length
    }
  })
  setInterval(() => {
    sendPing() //Check connection every 60 sec
  }, 60000)
})()
