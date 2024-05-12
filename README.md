### Simple Blockchain Explorer
This program enables communication with a node on the Bitcoin network. The codebase comprises JavaScript code written to establish a TCP connection with a Bitcoin node and communicate with it.

Here's how it operates:
1. **Connection Establishment :** 
   - it initiates a connection with a Bitcoin node using the provided IP address and port number.
2. **Message Exchange:**
   - It constructs and sends a `version` message payload to the node upon connection.
   - Upon receiving a response, it sends a `verack` message, signifying acknowledgment of the version message, and requests and address (`getaddr`) payload.
3. Message Handling:
   - The program listens for various types of messages received from the node, including `inv`,`pong`,  `addr`.
   - Upon receiving an `addr` message containing information about other nodes, it parses this data and saves it to a JSON file named `addresses.join`.
   
### Overview of Internal Architecture
- It utilizes Node.js's `net` module for TCP socket operations and the `crypto` module for security functions.
- The codebase is organized into functions for constructing and sending various Bitcoin protocol messages, handling incoming messages, and parsing data received from the node. 
- It includes asynchronous event listeners for processing data received over the network.
- This programme is developed based on this:
   https://en.bitcoin.it/wiki/Protocol_documentation


### Finding Nodes
--- 
**DNS Seeds** : You can use online DNS lookup tools to query DNS servers operated by trusted Bitcoin Core developers. These servers provide the IPs of reliable full nodes.
- seed.bitcoin.sipa.be - Pieter Wuille
- dnsseed.bitcoin.dashjr.org - Luke Dashjr
- seed.bitcoin.sprovoost.nl - Sjors Provoost

**Command line**
MacOS and Linux:    `dig seed.bitcoin.sipa.be
Windows:   `nslookup dig seed.bitcoin.sipa.be`


### Requirements
---
**Node.js**
- Ensure that Node.js is installed on your system. you can download and install it from the official Node.js website: [https://nodejs.org/](https://nodejs.org/).


### Install / Run
---- 
This programme doesn't have any dependencies, it will work simply follow some command below. There are dependencies such as `net` and `crypto` that are part of the Node.js standard library, so no external installation is required.

#### Run from source
1. `git clone https://github.com/call203/blockchain_explorer.git`
2. `npm install`
3. `node index.js`


### Additional Notes
--- 
- Ensure that your system has proper network access if the code connects to Bitcoin nodes.
- You can replace `NODEIP` and `PORT` variables with the appropriate IP address and port of the Bitcoin node you want to connect to.



### Demo Video
--- 






### Functions
---
###### **`getVersionPayload()`**
This function generates a payload for the `version` message, which is essential for the initial communication with the Bitcoin node upon connection.

###### **`getMessage(type, payload)`**
`type` : `version` | `getaddr` | `pong`
This function constructs a message by assembling its header, including the message type, length, and checksum, along with the payload.

###### **`handleHeader(offset, data)`**
Upon receiving data from the Bitcoin node, this function parses the header of the message, extracting information such as the magic number, message length, checksum, payload, and command type.

###### **`printInventory(data)`**
When receiving inventory (`inv`) data from the Bitcoin node, this function decodes it to extract the count and details of each inventory item, such as transaction hashes or block hashes.

###### **`printAddr(data)`**
Upon receiving address (`addr`) data from the Bitcoin node, this function decodes it to extract the count and details of each address entry, including timestamps, services, IP addresses, and ports. It then saves this information into a JSON file named `addresses.json`.

###### **`parseIP(rawAddress)`**
This function determines whether an address is IPv4 or IPv6 based on its format and parses it.
###### **`decodeVarInt(data)`**
For variable-length integer decoding, this function parses the count data embedded within `addr`, allowing proper extraction of variable length data structures.

###### **`sendPing()`**
To maintain the connection and check its vitality, this function sends ping data to the Bitcoin node at regular intervals (every 60 seconds), ensuring the network connection still active.

###### **`handleMessage(command, payload)`**
Asynchronous and versatile, this function processes incoming messages based on their command types. It handles various message types such as `version`, `verack`, `inv`, `addr`, `ping`, and `pong.







