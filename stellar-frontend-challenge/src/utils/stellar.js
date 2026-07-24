import { FreighterApi } from '@stellar/freighter-api'
import { Horizon, Networks, TransactionBuilder, Asset } from '@stellar/stellar-sdk'

const NETWORK_PASSPHRASE = Networks.TESTNET
const NETWORK_URL = 'https://horizon.stellar.org'
const SERVER = new Horizon.Server(NETWORK_URL)

export async function getNetwork() {
  try {
    const network = await FreighterApi.getNetwork()
    return network
  } catch (err) {
    console.error('Failed to get network:', err)
    return null
  }
}

export async function isConnected() {
  try {
    const connected = await FreighterApi.isConnected()
    return connected
  } catch (err) {
    console.error('Failed to check connection:', err)
    return false
  }
}

export async function connectWallet() {
  try {
    const response = await FreighterApi.requestAccess({
      network: {
        networkPassphrase: NETWORK_PASSPHRASE,
        serverUrl: NETWORK_URL,
      },
    })
    return response
  } catch (err) {
    console.error('Failed to connect wallet:', err)
    return null
  }
}

export async function disconnectWallet() {
  try {
    const result = await FreighterApi.setAllowed()
    return result
  } catch (err) {
    console.error('Failed to disconnect wallet:', err)
    return null
  }
}

export async function getPublicKey() {
  try {
    const result = await FreighterApi.getAddress()
    return result.address
  } catch (err) {
    console.error('Failed to get public key:', err)
    return null
  }
}

export async function getBalance(publicKey) {
  try {
    const account = await SERVER.loadAccount(publicKey)
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native')
    const balance = xlmBalance ? Number(xlmBalance.balance) : 0
    return balance
  } catch (err) {
    console.error('Failed to get balance:', err)
    return 0
  }
}

export async function sendXLM(publicKey, destination, amount) {
  try {
    const source = await SERVER.loadAccount(publicKey)
    const fee = source.baseFee
    const transaction = new TransactionBuilder(source, { fee, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation('payment', {
        destination,
        asset: Asset.native(),
        amount: String(amount),
      })
      .setTimeout(30)
      .build()

    const signedXDR = await FreighterApi.signTransaction({
      xdr: transaction.toXDR(),
      network: {
        networkPassphrase: NETWORK_PASSPHRASE,
        serverUrl: NETWORK_URL,
      },
    })

    const result = await SERVER.submitTransaction(signedXDR.signedTxXdr)
    return { success: true, hash: result.hash }
  } catch (err) {
    console.error('Failed to send XLM:', err)
    return { success: false, error: err.message || 'Transaction failed' }
  }
}
