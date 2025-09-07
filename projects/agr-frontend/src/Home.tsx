// src/components/Home.tsx
import { useWallet } from "@txnlab/use-wallet-react";
import React, { useEffect, useMemo, useState } from "react";
import AppCalls from "./components/AppCalls";
import ConnectWallet from "./components/ConnectWallet";
import Transact from "./components/Transact";

type TabKey = "market" | "list" | "purchases" | "verify";

type ProduceItem = {
  name: string;
  price: string;
  stock: string;
  category: "Grains" | "Vegetables" | "Fruits" | "Other";
  image: string;
  description: string;
  recordedOnBlockchain?: boolean;
  blockchainTxHash?: string;
};

// Define a PurchaseRecord type for better type safety
type PurchaseRecord = ProduceItem & {
  txHash: string;
  buyer: string;
  date: string;
  timestamp: number;
  id: string;
  verified: boolean;
  verifiedDetails?: TransactionDetails;
};

// Transaction details from Lora blockchain explorer
type TransactionDetails = {
  id: string;
  amount: number;
  sender: string;
  receiver: string;
  timestamp: number;
  confirmedRound: number;
  fee: number;
  note?: string;
  status: "confirmed" | "pending" | "failed";
};

export default function Home() {
  const [openWalletModal, setOpenWalletModal] = useState(false);
  const [openDemoModal, setOpenDemoModal] = useState(false);
  const [appCallsDemoModal, setAppCallsDemoModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<ProduceItem | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationResult, setVerificationResult] = useState<TransactionDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("market");
  const [tickerPosition, setTickerPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState<"idle" | "success" | "error">("idle");
  const [recordTxHash, setRecordTxHash] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const { activeAddress } = useWallet();

  // Load saved purchases with proper typing
  const [myPurchases, setMyPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const stored = localStorage.getItem("myPurchases");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load purchases:", error);
      return [];
    }
  });

  // Save purchases persistently
  useEffect(() => {
    localStorage.setItem("myPurchases", JSON.stringify(myPurchases));
  }, [myPurchases]);

  // Animate ticker
  useEffect(() => {
    const tickerWidth = 1600;
    const animationDuration = 22000;
    const animate = () => {
      setTickerPosition((prev) => (prev <= -tickerWidth ? 0 : prev - 1));
    };
    const interval = setInterval(animate, animationDuration / tickerWidth);
    return () => clearInterval(interval);
  }, []);

  // Initial marketplace data
  const initialProduce: ProduceItem[] = useMemo(
    () => [
      {
        name: "Wheat (50kg)",
        price: "20",
        stock: "120 bags",
        category: "Grains",
        image: "https://plus.unsplash.com/premium_photo-1670909649532-d1d68ee475cd?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        description: "Freshly harvested wheat directly from farmers",
        recordedOnBlockchain: true,
        blockchainTxHash: "IPH7X2KAYKHAYYOEXV5XEKTOXYFTHCJ4EKEN5BSHGH2XC7NRSBLA"
      },
      {
        name: "Rice (50kg)",
        price: "25",
        stock: "200 bags",
        category: "Grains",
        image: "https://images.unsplash.com/photo-1752424564550-dbada9062781?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        description: "High-quality rice with transparent pricing",
        recordedOnBlockchain: true,
        blockchainTxHash: "KPH7X2KAYKHAYYOEXV5XEKTOXYFTHCJ4EKEN5BSHGH2XC7NRSBLB"
      },
      {
        name: "Tomatoes (100kg)",
        price: "15",
        stock: "500 crates",
        category: "Vegetables",
        image: "https://images.unsplash.com/photo-1534940519139-f860fb3c6e38?q=80&w=867&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        description: "Farm-fresh tomatoes at wholesale rates",
        recordedOnBlockchain: true,
        blockchainTxHash: "LPH7X2KAYKHAYYOEXV5XEKTOXYFTHCJ4EKEN5BSHGH2XC7NRSBLC"
      },
      {
        name: "Potatoes (100kg)",
        price: "12",
        stock: "300 sacks",
        category: "Vegetables",
        image: "https://images.unsplash.com/photo-1585910176634-1c6b85c83127?q=80&w=388&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        description: "Directly from farmers, no middlemen markup",
        recordedOnBlockchain: true,
        blockchainTxHash: "MPH7X2KAYKHAYYOEXV5XEKTOXYFTHCJ4EKEN5BSHGH2XC7NRSBLD"
      },
    ],
    []
  );

  const [produceItems, setProduceItems] = useState<ProduceItem[]>(initialProduce);

  // Start purchase flow
  const startPurchase = (item: ProduceItem) => {
    setPurchasedItem(item);
    setTxHash(null);
    setOpenDemoModal(true);
  };

  // After successful payment
  const handlePaymentSuccess = (transactionHash: string) => {
    if (purchasedItem && activeAddress) {
      const purchaseRecord: PurchaseRecord = {
        ...purchasedItem,
        txHash: transactionHash,
        buyer: activeAddress,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        id: `${transactionHash}-${Date.now()}`,
        verified: false,
      };
      setTxHash(transactionHash);
      setMyPurchases((prev) => [purchaseRecord, ...prev]);
      setShowReceipt(true);
      setActiveTab("purchases");
    }
  };

  // Record crop on blockchain
  const recordCropOnBlockchain = async (cropData: ProduceItem) => {
    if (!activeAddress) {
      setRecordError("Please connect your wallet first");
      return;
    }

    setIsRecording(true);
    setRecordStatus("idle");
    setRecordError(null);

    try {
      // Simulate blockchain interaction (replace with actual smart contract call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a mock transaction hash
      const mockTxHash = `TX${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`.toUpperCase();

      setRecordTxHash(mockTxHash);
      setRecordStatus("success");

      // Update the produce item with blockchain info
      const updatedItems = produceItems.map(item =>
        item.name === cropData.name ? {
          ...item,
          recordedOnBlockchain: true,
          blockchainTxHash: mockTxHash
        } : item
      );

      setProduceItems(updatedItems);

    } catch (error) {
      console.error("Error recording on blockchain:", error);
      setRecordStatus("error");
      setRecordError("Failed to record on blockchain. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  // Fetch transaction details from Lora AlgoKit explorer
  const fetchTransactionFromLora = async (hash: string): Promise<TransactionDetails | null> => {
    try {
      const response = await fetch(`https://testnet-api.lora.algokit.io/v2/transactions/${hash}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Convert from microAlgos to Algos
      const amountInAlgos = data.amount ? data.amount / 1000000 : 0;

      return {
        id: data.id,
        amount: amountInAlgos,
        sender: data.sender,
        receiver: data['payment-transaction']?.receiver || data.sender,
        timestamp: data['round-time'] ? data['round-time'] * 1000 : Date.now(), // Convert to milliseconds
        confirmedRound: data['confirmed-round'] || 0,
        fee: data.fee ? data.fee / 1000000 : 0, // Convert from microAlgos to Algos
        note: data.note ? new TextDecoder().decode(new Uint8Array(data.note.split(',').map(Number))) : undefined,
        status: data['confirmed-round'] ? 'confirmed' : 'pending'
      };
    } catch (error) {
      console.error('Error fetching transaction from Lora:', error);
      return null;
    }
  };

  // Verify transaction using Lora explorer
  const verifyTransaction = async (hash: string) => {
    setIsVerifying(true);
    setVerificationError("");
    setVerificationResult(null);

    try {
      const transactionDetails = await fetchTransactionFromLora(hash);

      if (!transactionDetails) {
        setVerificationError("Transaction not found on Algorand blockchain. Make sure it's a valid testnet transaction.");
        return;
      }

      setVerificationResult(transactionDetails);

      // Check if this transaction matches any purchase
      const matchingPurchase = myPurchases.find(purchase => purchase.txHash === hash);

      if (matchingPurchase) {
        // Update purchase record as verified with details
        setMyPurchases(prev => prev.map(purchase =>
          purchase.txHash === hash
            ? { ...purchase, verified: true, verifiedDetails: transactionDetails }
            : purchase
        ));
        setShowReceipt(true);
      } else {
        // If no matching purchase found, still show the transaction details
        setVerificationError("Transaction found on blockchain but no matching purchase record. This may be a different transaction.");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setVerificationError("Failed to verify transaction. Please check the hash and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Redirect to Lora explorer
  const redirectToLoraExplorer = (hash: string) => {
    if (hash) {
      window.open(`https://lora.algokit.io/testnet/transaction/${hash}`, '_blank');
    }
  };

  // Form for listing produce
  const [form, setForm] = useState({
    name: "",
    price: "1",
    stock: "",
    category: "Grains" as ProduceItem["category"],
    image: "",
    description: "",
  });

  const resetForm = () => setForm({
    name: "",
    price: "1",
    stock: "",
    category: "Grains",
    image: "",
    description: "",
  });

  const addProduce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.stock) return;

    const imgFallback = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
    const newItem: ProduceItem = {
      name: form.name,
      price: form.price,
      stock: form.stock,
      category: form.category,
      image: form.image || imgFallback,
      description: form.description || "Listed by farmer via AgroChain",
      recordedOnBlockchain: false
    };

    setProduceItems((prev) => [newItem, ...prev]);
    resetForm();
  };

  const supplyChainTicker = [
    "🌾 Direct farmer → buyer reduces middlemen markup.",
    "📉 Transparent on-chain prices discourage inflation.",
    "🔍 Every purchase is traceable end-to-end.",
    "⚡ Real-time stock visibility across the chain.",
    "🤝 Retailers & Govt buy directly from farmers.",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-100 to-green-50 font-sans">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-wide flex items-center">
          <span className="mr-2">🌾</span>
          AgroChain POC
        </div>
        <ul className="flex gap-6 text-lg font-medium items-center">
          {["market", "list", "purchases", "verify"].map((tab) => (
            <li
              key={tab}
              className={`hover:text-green-200 cursor-pointer transition ${
                activeTab === tab ? "text-green-200 underline decoration-2" : ""
              }`}
              onClick={() => setActiveTab(tab as TabKey)}
            >
              {tab === "market" && "Marketplace"}
              {tab === "list" && "List Produce"}
              {tab === "purchases" && "My Purchases"}
              {tab === "verify" && "Verify Tx"}
            </li>
          ))}
          <li>
            <button
              className="bg-white text-green-800 font-semibold px-4 py-1 rounded-md hover:bg-green-100 transition shadow-sm"
              onClick={() => setOpenWalletModal((v) => !v)}
            >
              {activeAddress ? "My Account" : "Connect Wallet"}
            </button>
          </li>
        </ul>
      </nav>

      {/* Ticker */}
      <div className="bg-gradient-to-r from-green-600 via-teal-500 to-lime-500 py-3 overflow-hidden">
        <div
          className="flex whitespace-nowrap text-white font-bold text-sm md:text-lg"
          style={{ transform: `translateX(${tickerPosition}px)` }}
        >
          {[...supplyChainTicker, ...supplyChainTicker].map((msg, idx) => (
            <div key={idx} className="inline-flex items-center mx-8">
              <span className="animate-pulse">✅</span>
              <span className="mx-4">{msg}</span>
              <span className="animate-pulse">✅</span>
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace */}
      {activeTab === "market" && (
        <section className="py-10 px-6 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-green-800">Farmer Marketplace</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {produceItems.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <img src={item.image} alt={item.name} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <h4 className="text-lg font-bold text-green-900">{item.name}</h4>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                  <div className="mt-2">
                    {item.recordedOnBlockchain ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ✅ On Blockchain
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        ⚠️ Not Recorded
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-green-700 mt-2">
                    {item.price} ALGO | Stock: {item.stock}
                  </p>
                  <button
                    onClick={() => startPurchase(item)}
                    className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* List Produce */}
      {activeTab === "list" && (
        <section className="py-10 px-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-green-800 mb-6">List New Produce</h2>
          {!activeAddress ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <p className="mb-3 font-semibold">Connect your wallet to list produce.</p>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                onClick={() => setOpenWalletModal(true)}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              <form
                onSubmit={addProduce}
                className="bg-white rounded-xl p-6 shadow grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              >
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Produce Name"
                  className="border p-2 rounded"
                  required
                />
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Price in ALGO"
                  className="border p-2 rounded"
                  type="number"
                />
                <input
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="Stock"
                  className="border p-2 rounded"
                  required
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="border p-2 rounded"
                >
                  <option value="Grains">Grains</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="Image URL"
                  className="border p-2 rounded col-span-2"
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Description"
                  className="border p-2 rounded col-span-2"
                />
                <div className="col-span-2 flex justify-end gap-2">
                  <button type="button" onClick={resetForm} className="border px-4 py-2 rounded">
                    Reset
                  </button>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                    List Produce
                  </button>
                </div>
              </form>

              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-xl font-bold text-green-800 mb-4">Your Listed Crops</h3>
                {produceItems.filter(item => !item.recordedOnBlockchain).length === 0 ? (
                  <p className="text-gray-600">No unrecorded crops. Add a crop using the form above.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {produceItems
                      .filter(item => !item.recordedOnBlockchain)
                      .map((item, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-bold text-green-700">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <p className="text-sm text-green-600 mt-1">{item.price} ALGO | {item.stock}</p>
                          <button
                            onClick={() => recordCropOnBlockchain(item)}
                            disabled={isRecording}
                            className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm"
                          >
                            {isRecording ? "Recording..." : "Record on Blockchain"}
                          </button>

                          {/* Record on Blockchains */}
                          {activeAddress && (
                            <button
                              data-test-id="appcalls-demo"
                              className="btn m-2 w-full bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                              onClick={() => setAppCallsDemoModal(true)}
                            >
                              Record via Smart Contract
                            </button>
                          )}

                          {recordStatus === "success" && recordTxHash && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                              <p className="text-green-700 font-semibold">✅ Recorded successfully!</p>
                              <p className="text-green-600">Tx: {recordTxHash.substring(0, 10)}...</p>
                            </div>
                          )}

                          {recordStatus === "error" && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                              <p className="text-red-700">{recordError}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* My Purchases */}
      {activeTab === "purchases" && (
        <section className="py-10 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-green-800 mb-6">My Purchases</h2>
          {myPurchases.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-600 text-lg mb-4">No purchases yet.</p>
              <button
                onClick={() => setActiveTab("market")}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-white rounded-xl shadow-lg p-4 border border-green-200 hover:shadow-xl transition"
                >
                  <img src={purchase.image} alt={purchase.name} className="h-32 w-full object-cover rounded" />
                  <h3 className="font-bold mt-2 text-green-800">{purchase.name}</h3>
                  <p className="text-sm text-gray-600">{purchase.description}</p>
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-sm font-semibold text-green-700">{purchase.price} ALGO</p>
                    <p className="text-xs text-green-600 mt-1">
                      Tx: {purchase.txHash.substring(0, 8)}...{purchase.txHash.substring(56)}
                    </p>
                    <p className="text-xs text-green-600">
                      Buyer: {purchase.buyer.substring(0, 8)}...{purchase.buyer.substring(purchase.buyer.length - 8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Date: {purchase.date}</p>
                    <div className="mt-2">
                      {purchase.verified ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          ✅ Verified
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          ⚠️ Pending Verification
                        </span>
                      )}
                    </div>
                    {purchase.verified && purchase.verifiedDetails && (
                      <div className="mt-2 text-xs text-blue-600">
                        <a
                          href={`https://lora.algokit.io/testnet/transaction/${purchase.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          View on Lora Explorer
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Verify Transaction */}
      {activeTab === "verify" && (
        <section className="py-10 px-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-green-800 mb-6">Verify Transaction</h2>
          <div className="bg-white rounded-xl p-6 shadow">
            <p className="mb-4 text-gray-600">
              Paste your transaction hash to verify your purchase on the blockchain
            </p>
            <div className="space-y-4">
              <input
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                placeholder="Enter transaction hash (e.g., IPH7X2KAYKHAYYOEXV5XEKTOXYFTHCJ4EKEN5BSHGH2XC7NRSBLA)"
                className="w-full border p-3 rounded-lg"
              />
              {verificationError && <div className="text-red-600 text-sm">{verificationError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={() => verifyTransaction(verifyHash)}
                  disabled={isVerifying || !verifyHash}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {isVerifying ? "Verifying..." : "Verify Transaction"}
                </button>
                <button
                  onClick={() => redirectToLoraExplorer(verifyHash)}
                  disabled={!verifyHash}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  View on Lora Explorer
                </button>
              </div>
              {verificationResult && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-3">Transaction Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`font-semibold ${
                          verificationResult.status === "confirmed"
                            ? "text-green-700"
                            : verificationResult.status === "pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {verificationResult.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-mono text-green-700">{verificationResult.amount} ALGO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sender:</span>
                      <span className="font-mono text-green-700">
                        {verificationResult.sender.substring(0, 8)}...{verificationResult.sender.substring(verificationResult.sender.length - 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receiver:</span>
                      <span className="font-mono text-green-700">
                        {verificationResult.receiver.substring(0, 8)}...{verificationResult.receiver.substring(verificationResult.receiver.length - 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-mono text-green-700">{verificationResult.fee} ALGO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmed Round:</span>
                      <span className="font-mono text-green-700">{verificationResult.confirmedRound}</span>
                    </div>
                    {verificationResult.note && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Note:</span>
                        <span className="font-mono text-green-700">{verificationResult.note}</span>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t">
                      <a
                        href={`https://lora.algokit.io/testnet/transaction/${verifyHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        View on Lora Explorer →
                      </a>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">How to verify:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-600 space-y-1">
                  <li>Complete your purchase using the Algorand wallet</li>
                  <li>Copy the transaction hash from your wallet</li>
                  <li>Paste it in the field above and click Verify</li>
                  <li>We'll fetch details from Lora blockchain explorer to confirm your purchase</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      <Transact
        openModal={openDemoModal}
        setModalState={setOpenDemoModal}
        onComplete={handlePaymentSuccess}
        purchasedItem={purchasedItem}
      />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />

      {/* Enhanced Receipt */}
      {showReceipt && purchasedItem && txHash && activeAddress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
            <div className="text-center mb-4">
              <div className="text-4xl text-green-500 mb-2">✅</div>
              <h2 className="text-2xl font-bold text-green-700">Purchase Successful!</h2>
              <p className="text-sm text-gray-500 mt-1">Your transaction has been confirmed on the blockchain</p>
            </div>
            <div className="border-t border-b py-4 my-4">
              <div className="flex items-center mb-3">
                <img src={purchasedItem.image} alt={purchasedItem.name} className="h-16 w-16 object-cover rounded-lg" />
                <div className="ml-3">
                  <h3 className="font-bold text-green-900">{purchasedItem.name}</h3>
                  <p className="text-sm text-gray-600">{purchasedItem.category}</p>
                  <p className="text-lg font-semibold text-green-700">{purchasedItem.price} ALGO</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Hash:</span>
                <span className="font-mono text-green-700">
                  {txHash.substring(0, 8)}...{txHash.substring(56)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Buyer Address:</span>
                <span className="font-mono text-green-700">
                  {activeAddress.substring(0, 8)}...{activeAddress.substring(activeAddress.length - 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="text-green-700">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-700 font-semibold">Confirmed</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 border border-green-600 text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReceipt(false);
                  setActiveTab("verify");
                  setVerifyHash(txHash);
                }}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Verify on Blockchain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-green-700 text-white text-center py-6 mt-16">
        © {new Date().getFullYear()} AgroChain POC. All rights reserved.
      </footer>

      <style>
        {`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.4s ease-out;
          }
        `}
      </style>
    </div>
  );
}
