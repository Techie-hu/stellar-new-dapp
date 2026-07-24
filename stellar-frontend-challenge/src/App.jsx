import { useState, useEffect, useCallback } from 'react'
import './App.css'
import {
  connectWallet,
  disconnectWallet,
  isConnected,
  getPublicKey,
  getBalance,
  sendXLM,
} from './utils/stellar'

function App() {
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState(null)
  const [form, setForm] = useState({ destination: '', amount: '' })
  const [error, setError] = useState('')

  const refreshBalance = useCallback(async (pk) => {
    if (!pk) return
    const bal = await getBalance(pk)
    setBalance(bal)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const conn = await isConnected()
        if (conn) {
          const pk = await getPublicKey()
          if (pk) {
            setPublicKey(pk)
            setConnected(true)
            refreshBalance(pk)
          }
        }
      } catch (err) {
        console.error('Init failed:', err)
      }
    }
    init()
  }, [refreshBalance])

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    const res = await connectWallet()
    if (res?.address) {
      setPublicKey(res.address)
      setConnected(true)
      refreshBalance(res.address)
    } else {
      setError('Failed to connect Freighter wallet. Please make sure Freighter is installed and unlocked.')
    }
    setLoading(false)
  }

  const handleDisconnect = async () => {
    setLoading(true)
    await disconnectWallet()
    setConnected(false)
    setPublicKey('')
    setBalance(0)
    setTxStatus(null)
    setLoading(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setTxStatus(null)

    if (!form.destination || !form.amount) {
      setError('Please provide destination address and amount.')
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number.')
      return
    }

    if (amount > balance) {
      setError('Insufficient balance for this transaction.')
      return
    }

    setLoading(true)
    const result = await sendXLM(publicKey, form.destination, amount)
    setLoading(false)

    if (result.success) {
      setTxStatus({ type: 'success', hash: result.hash })
      setForm({ destination: '', amount: '' })
      refreshBalance(publicKey)
    } else {
      setTxStatus({ type: 'failure', error: result.error })
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return addr.slice(0, 4) + '...' + addr.slice(-4)
  }

  const openExplorer = (hash) => {
    window.open(`https://stellar.expert/explorer/testnet/tx/${hash}`, '_blank')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon">⭐</div>
          <h1>StellarPay</h1>
        </div>
        <p className="tagline">Send XLM on Stellar Testnet</p>
      </header>

      <main className="app-main">
        {!connected ? (
          <section className="card connect-card">
            <h2>Connect Wallet</h2>
            <p>Connect your Freighter wallet to get started on Stellar Testnet.</p>
            <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Freighter'}
            </button>
            {error && <p className="error-text">{error}</p>}
          </section>
        ) : (
          <>
            <section className="card balance-card">
              <h2>Your Wallet</h2>
              <div className="wallet-info">
                <div className="address-row">
                  <span className="label">Address:</span>
                  <span className="value mono" title={publicKey}>{formatAddress(publicKey)}</span>
                </div>
                <div className="balance-row">
                  <span className="label">Balance:</span>
                  <span className="value balance-value">{balance.toFixed(7)} XLM</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleDisconnect} disabled={loading}>
                Disconnect
              </button>
            </section>

            <section className="card send-card">
              <h2>Send XLM</h2>
              <form onSubmit={handleSend}>
                <label className="field">
                  <span className="field-label">Destination Address</span>
                  <input
                    type="text"
                    placeholder="G..."
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    disabled={loading}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Amount (XLM)</span>
                  <input
                    type="number"
                    step="0.0000001"
                    min="0"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    disabled={loading}
                  />
                </label>
                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? 'Processing...' : 'Send Transaction'}
                </button>
              </form>
              {error && <p className="error-text">{error}</p>}
              {txStatus && (
                <div className={`tx-feedback ${txStatus.type}`}>
                  {txStatus.type === 'success' ? (
                    <>
                      <p className="tx-title">Transaction Successful!</p>
                      <p className="tx-hash" onClick={() => openExplorer(txStatus.hash)}>
                        {txStatus.hash.slice(0, 8)}...{txStatus.hash.slice(-8)}
                      </p>
                      <button
                        className="btn btn-link"
                        onClick={() => openExplorer(txStatus.hash)}
                      >
                        View on Stellar Explorer ↗
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="tx-title">Transaction Failed</p>
                      <p className="tx-error">{txStatus.error}</p>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built for Stellar Frontend Challenge — Level 1 White Belt</p>
      </footer>
    </div>
  )
}

export default App
