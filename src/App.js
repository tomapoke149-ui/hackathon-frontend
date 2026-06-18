import React, { useState, useEffect, useCallback, useRef } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [userPoints, setUserPoints] = useState(10000);
  
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]); // 💡 AIレコメンド用
  const [notifications, setNotifications] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [itemComments, setItemComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const [historyList, setHistoryList] = useState([]); 
  const [historyTab, setHistoryTab] = useState("all"); 
  
  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [dmMessages, setDmMessages] = useState([]);          
  const [dmInput, setDmInput] = useState("");                
  const chatEndRef = useRef(null);                           

  const API_URL = "https://hackathon-backend-242925435490.asia-northeast1.run.app";

  const fetchHistory = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/get-history?user_email=${encodeURIComponent(loginUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data || []);
      }
    } catch (error) { console.error("履歴取得エラー:", error); }
  }, [loginUser]); 

  const fetchPoints = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/get-points?user_email=${encodeURIComponent(loginUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUserPoints(data.points ?? 10000);
      }
    } catch (error) { console.error("ポイント取得エラー:", error); }
  }, [loginUser]);

  const fetchNotifications = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/notifications?user_email=${encodeURIComponent(loginUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      }
    } catch (error) { console.error("通知取得エラー:", error); }
  }, [loginUser]);

  const fetchCommentsForItem = useCallback(async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/get-comments?item_id=${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setItemComments((prev) => ({ ...prev, [itemId]: data || [] }));
      }
    } catch (error) { console.error(error); }
  }, []);

  const fetchItems = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/get-items?user_email=${encodeURIComponent(loginUser.email)}&keyword=${encodeURIComponent(searchKeyword)}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
        if (data && data.length > 0) {
          data.forEach((item) => fetchCommentsForItem(item.id));
        }
      }
    } catch (error) { console.error(error); }
  }, [loginUser, searchKeyword, fetchCommentsForItem]);

  // 💡 AIレコメンドを取得する関数（本物のバックエンドデータ専用・ダミー排除）
  const fetchRecommendations = useCallback(async (targetEmail) => {
    const emailToUse = targetEmail || (loginUser ? loginUser.email : null);
    if (!emailToUse) return;
    try {
      const response = await fetch(`${API_URL}/recommend?user_email=${encodeURIComponent(emailToUse)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setRecommendations(data);
        } else {
          setRecommendations([]);
        }
      } else {
        console.error("レコメンドAPIエラー: ステータス", response.status);
        setRecommendations([]);
      }
    } catch (error) { 
      console.error("レコメンド取得通信エラー:", error); 
      setRecommendations([]);
    }
  }, [loginUser]);

  const fetchDmMessages = useCallback(async () => {
    if (!loginUser || !activeChatUser) return;
    try {
      const response = await fetch(`${API_URL}/get-dms?user_email=${encodeURIComponent(loginUser.email)}&other_email=${encodeURIComponent(activeChatUser)}`);
      if (response.ok) {
        const data = await response.json();
        setDmMessages(data || []);
      }
    } catch (error) { console.error("DM取得エラー:", error); }
  }, [loginUser, activeChatUser]);

  useEffect(() => {
    if (loginUser) {
      fetchItems();
      fetchNotifications();
      fetchPoints();
      fetchRecommendations(); 
    }
  }, [loginUser, searchKeyword, fetchItems, fetchNotifications, fetchPoints, fetchRecommendations]);

  useEffect(() => {
    if (activeChatUser) {
      fetchDmMessages();
      const interval = setInterval(fetchDmMessages, 4000); 
      return () => clearInterval(interval);
    }
  }, [activeChatUser, fetchDmMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? "/login" : "/register";
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });
      const data = await response.json();
      if (response.ok) {
        setLoginUser({ email: email });
        alert(`🎉 ${isLoginMode ? "ログイン" : "登録"}に成功しました！`);
        
        // 💡 ログイン直後に確実におすすめデータを取得させる
        fetchRecommendations(email);
        
        fetchPoints();
        fetchHistory();
        fetchItems();
        fetchNotifications();
      } else {
        alert(`⚠️ エラー: ${data.detail || "認証に失敗しました"}`);
      }
    } catch (error) {
      console.error("認証エラー:", error);
      alert("⚠️ サーバーとの通信に失敗しました。");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, price: parseInt(price, 10), user_email: loginUser.email, description: description, image_url: imageUrl }),
      });
      if (response.ok) { setName(""); setPrice(""); setDescription(""); setImageUrl(""); fetchItems(); }
    } catch (error) { console.error(error); }
  };

  const handlePostComment = async (itemId) => {
    const text = commentInputs[itemId];
    if (!text || !text.trim()) return;
    try {
      const response = await fetch(`${API_URL}/post-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, user_email: loginUser.email, content: text })
      });
      if (response.ok) { setCommentInputs((prev) => ({ ...prev, [itemId]: "" })); fetchCommentsForItem(itemId); }
    } catch (error) { console.error(error); }
  };

  const handleDeleteComment = async (itemId, commentId) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    try {
      const response = await fetch(`${API_URL}/delete-comment?comment_id=${commentId}&user_email=${encodeURIComponent(loginUser.email)}`, { method: "DELETE" });
      if (response.ok) fetchCommentsForItem(itemId);
    } catch (error) { console.error(error); }
  };

  const handleLike = async (item) => {
    if (!loginUser) return;
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? (p.like_count || 1) - 1 : (p.like_count || 0) + 1 } : p));
    try {
      const response = await fetch(`${API_URL}/like-item?item_id=${item.id}&user_email=${encodeURIComponent(loginUser.email)}`, { method: "POST" });
      if (!response.ok) fetchItems(); 
    } catch (e) { fetchItems(); }
  };

  const handleBuy = async (item) => {
    if (userPoints < item.price) {
      alert(`⚠️ ポイントが足りません！\n現在の所持：${userPoints.toLocaleString()} pt\n商品の価格：${item.price.toLocaleString()} 円`);
      return;
    }
    if (!window.confirm(`「${item.name}」を ${item.price.toLocaleString()} pt で購入しますか？`)) return;
    try {
      const response = await fetch(`${API_URL}/buy-item?id=${item.id}&user_email=${encodeURIComponent(loginUser.email)}`, { method: "POST" });
      if (response.ok) { alert("🎉 購入が完了しました！"); fetchItems(); fetchPoints(); fetchRecommendations(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;
    try {
      const response = await fetch(`${API_URL}/delete-item?id=${item.id}&user_email=${encodeURIComponent(loginUser.email)}`, { method: "DELETE" });
      if (response.ok) fetchItems();
    } catch (e) { console.error(e); }
  };

  const handleSendDm = async (e) => {
    e.preventDefault();
    if (!dmInput.trim() || !activeChatUser) return;
    try {
      const response = await fetch(`${API_URL}/send-dm?sender_email=${encodeURIComponent(loginUser.email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_email: activeChatUser, message: dmInput })
      });
      if (response.ok) {
        setDmInput("");
        fetchDmMessages();
      }
    } catch (error) { console.error("DM送信エラー:", error); }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === "notifications") {
      const hasUnread = notifications.some(n => !n.is_read);
      if (hasUnread) {
        fetch(`${API_URL}/notifications/read?user_email=${encodeURIComponent(loginUser.email)}`, { method: "POST" });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    }
    if (tab === "profile") {
      fetchPoints();
      fetchHistory(); 
    }
    if (tab === "home") { fetchPoints(); }
  };

  const handleNotificationClick = (notif) => {
    if (notif.message.includes("DM") || notif.message.includes("メッセージ") || notif.message.includes("チャット")) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
      const match = notif.message.match(emailRegex);
      if (match && match[0]) {
        setActiveChatUser(match[0]); 
        return;
      }
    }
    const itemId = notif.item_id;
    if (!itemId) return;
    setActiveTab("home");
    setSearchKeyword("");
    setTimeout(() => {
      const element = document.getElementById(`item-card-${itemId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.transition = "background-color 0.5s";
        element.style.backgroundColor = "#fef08a";
        setTimeout(() => element.style.backgroundColor = "#ffffff", 1500);
      }
    }, 300);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f6f9", padding: "20px 20px 80px 20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#333" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#1e293b", margin: "0 0 5px 0" }}>🤖 AI Fleamarket App</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>GCP × Python フルスタックシステム</p>
        </div>

        {!loginUser ? (
          <div style={{ background: "#ffffff", padding: "40px 30px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1.4rem", color: "#0f172a", textAlign: "center" }}>{isLoginMode ? "🔑 ログイン" : "📝 新規登録"}</h3>
            <form onSubmit={handleAuth}>
              <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px", marginBottom: "18px", borderRadius: "10px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}/>
              <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", padding: "12px", marginBottom: "24px", borderRadius: "10px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}/>
              <button type="submit" style={{ width: "100%", padding: "14px", background: "#2563eb", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>{isLoginMode ? "ログイン" : "登録"}</button>
            </form>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}>切替</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#ffffff", padding: "15px 20px", borderRadius: "14px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>💰 アプリ内通貨アカウント</div>
              <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>{userPoints.toLocaleString()} <span style={{ fontSize: "1rem", fontWeight: "normal" }}>pt</span></div>
            </div>

            <div style={{ display: "flex", background: "#fff", borderRadius: "12px", padding: "6px", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
              <button onClick={() => handleTabChange("home")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "home" ? "#f1f5f9" : "transparent" }}>🏠 ホーム</button>
              <button onClick={() => handleTabChange("notifications")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "notifications" ? "#f1f5f9" : "transparent", display: "flex", justifyContent: "center", gap: "6px" }}>
                🔔 通知 {unreadCount > 0 && <span style={{ background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem" }}>{unreadCount}</span>}
              </button>
              <button onClick={() => handleTabChange("profile")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "profile" ? "#f1f5f9" : "transparent" }}>👤 マイページ</button>
            </div>

            {activeTab === "home" && (
              <div>
                <div style={{ background: "#ffffff", padding: "15px 20px", borderRadius: "16px", marginBottom: "20px", border: "1px solid #cbd5e1", display: "flex", gap: "10px" }}>
                  <span>🔍</span><input type="text" placeholder="商品を検索" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} style={{ width: "100%", border: "none", outline: "none" }}/>
                </div>

                <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ margin: "0 0 15px 0", color: "#475569" }}>📦 商品を出品する</h4>
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" placeholder="商品名" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 2, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                      <input type="number" placeholder="価格 (pt)" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    </div>
                    <textarea placeholder="商品の詳細な説明" value={description} onChange={(e) => setDescription(e.target.value)} rows="2" style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", resize: "none", fontFamily: "inherit" }}/>
                    <input type="url" placeholder="画像URL (空欄なら自動割り当て)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <button type="submit" style={{ padding: "12px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>商品をフリマに出品する</button>
                  </form>
                </div>

                {/* 💡 ✨ AIレコメンドセクション（リアルタイムデータ表示） */}
                {searchKeyword.trim() === "" && recommendations.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", padding: "20px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #fde68a", boxShadow: "0 4px 6px rgba(253, 230, 138, 0.3)" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#d97706", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}>✨</span> AIが選ぶ！あなたへのおすすめ
                    </h4>
                    <div style={{ display: "flex", gap: "15px", overflowX: "auto", paddingBottom: "5px" }}>
                      {recommendations.map((item) => (
                        <div key={`rec-${item.id}`} onClick={() => {
                          const element = document.getElementById(`item-card-${item.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                            element.style.transition = "background-color 0.5s";
                            element.style.backgroundColor = "#fef08a";
                            setTimeout(() => element.style.backgroundColor = "#ffffff", 1500);
                          }
                        }} style={{ minWidth: "140px", maxWidth: "140px", background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #fde047", cursor: "pointer", flexShrink: 0, transition: "transform 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                          <div style={{ width: "100%", height: "90px", backgroundColor: "#f1f5f9", borderRadius: "8px", marginBottom: "8px", overflow: "hidden" }}>
                            <img src={item.image_url && item.image_url.trim() !== "" ? item.image_url : `https://picsum.photos/id/${(item.id % 50) + 10}/600/400`} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: item.is_sold ? "grayscale(40%)" : "none" }} />
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: "800", marginTop: "4px" }}>{item.price.toLocaleString()} pt</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {items.map((item) => (
                    <div id={`item-card-${item.id}`} key={item.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                      <div style={{ width: "100%", height: "200px", backgroundColor: "#f1f5f9", borderRadius: "12px", marginBottom: "15px", overflow: "hidden", border: "1px solid #e2e8f0", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
                        <img src={item.image_url && item.image_url.trim() !== "" ? item.image_url : `https://picsum.photos/id/${(item.id % 50) + 10}/600/400`} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: item.is_sold ? "grayscale(40%)" : "none" }} onError={(e) => { e.target.src = "https://picsum.photos/600/400?blur=2"; }}/>
                        {item.is_sold && (
                          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <span style={{ color: "white", fontSize: "1.8rem", fontWeight: "900", border: "3px solid white", padding: "6px 20px", transform: "rotate(-10deg)" }}>SOLD OUT</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ flex: 1, paddingRight: "10px" }}>
                          <div style={{ fontWeight: "700", fontSize: "1.2rem", textDecoration: item.is_sold ? "line-through" : "none" }}>{item.name}</div>
                          <div style={{ color: item.is_sold ? "#94a3b8" : "#2563eb", fontWeight: "800", fontSize: "1.2rem", marginTop: "2px" }}>{item.price.toLocaleString()} pt</div>
                          {item.description && <p style={{ fontSize: "0.9rem", color: "#475569", margin: "8px 0 0 0", backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "8px", borderLeft: "3px solid #cbd5e1" }}>{item.description}</p>}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", minWidth: "110px" }}>
                          <button onClick={() => handleLike(item)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", backgroundColor: item.is_liked ? "#fff1f2" : "#f8fafc", width: "100%" }}>
                            {item.is_liked ? "❤️" : "🖤"} {item.like_count || 0}
                          </button>
                          
                          {item.is_sold ? (
                            <span style={{ background: "#f1f5f9", color: "#64748b", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", textAlign: "center", width: "100%", boxSizing: "border-box" }}>売り切れ</span>
                          ) : item.user_email === loginUser.email ? (
                            <span style={{ background: "#f8fafc", color: "#94a3b8", border: "1px dashed #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", textAlign: "center", width: "100%", boxSizing: "border-box" }}>マイ出品</span>
                          ) : (
                            <>
                              <button onClick={() => handleBuy(item)} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "700", width: "100%" }}>購入する</button>
                              <button onClick={() => setActiveChatUser(item.user_email)} style={{ background: "#fff", color: "#4f46e5", border: "1px solid #4f46e5", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", width: "100%" }}>💬 出品者とDM</button>
                            </>
                          )}
                          
                          {item.user_email === loginUser.email && (
                            <button onClick={() => handleDelete(item)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", width: "100%" }}>削除 🗑️</button>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px", marginTop: "12px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>💬 コメント</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px", maxHeight: "150px", overflowY: "auto" }}>
                          {(itemComments[item.id] || []).map((c) => (
                            <div key={c.id} style={{ backgroundColor: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>👤 {c.user_email}</div>
                                <div style={{ fontSize: "0.85rem" }}>{c.content}</div>
                              </div>
                              {(c.user_email === loginUser.email || item.user_email === loginUser.email) && (
                                <button onClick={() => handleDeleteComment(item.id, c.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input type="text" placeholder="コメントする..." value={commentInputs[item.id] || ""} onChange={(e) => setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))} style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }}/>
                          <button onClick={() => handlePostComment(item.id)} style={{ padding: "6px 12px", background: "#475569", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>送信</button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem" }}>🔔 お知らせ</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {notifications.map((notif) => (
                    <div key={notif.id} onClick={() => handleNotificationClick(notif)} style={{ padding: "12px 15px", backgroundColor: notif.is_read ? "#f8fafc" : "#eff6ff", borderRadius: "8px", borderLeft: "4px solid #3b82f6", cursor: "pointer", marginBottom: "8px" }}>
                      {notif.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 5px 0", textAlign: "center" }}>マイページ</h3>
                <p style={{ color: "#64748b", textAlign: "center" }}>{loginUser.email}</p>
                <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", margin: "20px 0", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <div style={{ color: "#64748b", fontSize: "0.85rem" }}>現在の所持ポイント</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#1d4ed8", marginTop: "4px" }}>{userPoints.toLocaleString()} pt</div>
                </div>

                <div style={{ textAlign: "left", marginTop: "25px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "1.1rem" }}>📊 取引・ポイント履歴</h4>
                  <div style={{ display: "flex", gap: "5px", marginBottom: "15px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
                    <button onClick={() => setHistoryTab("all")} style={{ flex: 1, padding: "6px", fontSize: "0.8rem", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", backgroundColor: historyTab === "all" ? "#ffffff" : "transparent", boxShadow: historyTab === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>すべて</button>
                    <button onClick={() => setHistoryTab("buy")} style={{ flex: 1, padding: "6px", fontSize: "0.8rem", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", backgroundColor: historyTab === "buy" ? "#ffffff" : "transparent", boxShadow: historyTab === "buy" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>🛍️ 購入履歴</button>
                    <button onClick={() => setHistoryTab("sell")} style={{ flex: 1, padding: "6px", fontSize: "0.8rem", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", backgroundColor: historyTab === "sell" ? "#ffffff" : "transparent", boxShadow: historyTab === "sell" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>💰 販売履歴</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", paddingRight: "5px" }}>
                    {historyList
                      .filter(h => historyTab === "all" || h.action_type === historyTab)
                      .length === 0 ? (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", padding: "20px 0" }}>該当する履歴はありません。</div>
                      ) : (
                        historyList
                          .filter(h => historyTab === "all" || h.action_type === historyTab)
                          .map((h) => (
                            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: h.amount < 0 ? "4px solid #ef4444" : "4px solid #10b981" }}>
                              <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: "700" }}>
                                  {h.action_type === "buy" ? "🛍️ 購入: " : "💰 販売: "}{h.item_name}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>{h.created_at}</div>
                              </div>
                              <div style={{ fontWeight: "800", fontSize: "0.95rem", color: h.amount < 0 ? "#ef4444" : "#10b981" }}>
                                {h.amount < 0 ? "" : "+"}{h.amount.toLocaleString()} pt
                              </div>
                            </div>
                          ))
                      )}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "25px 0" }} />
                <button onClick={() => { setLoginUser(null); setActiveTab("home"); }} style={{ width: "100%", padding: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>ログアウト</button>
              </div>
            )}

            {activeChatUser && (
              <div style={{ position: "fixed", bottom: 0, right: "20px", width: "320px", height: "400px", backgroundColor: "#ffffff", borderRadius: "12px 12px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,0.15)", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", zIndex: 1000, fontFamily: "inherit" }}>
                <div style={{ padding: "12px", background: "#4f46e5", color: "white", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>📩 {activeChatUser} とのDM</div>
                  <button onClick={() => setActiveChatUser(null)} style={{ background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
                
                <div style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", backgroundColor: "#f8fafc" }}>
                  {dmMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", marginTop: "40px" }}>メッセージの履歴がありません。<br/>値下げ交渉などをしてみましょう！</div>
                  ) : (
                    dmMessages.map((msg) => {
                      const isMe = msg.sender_email === loginUser.email;
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: "12px", fontSize: "0.85rem", lineHeight: "1.4", wordBreak: "break-all", backgroundColor: isMe ? "#4f46e5" : "#e2e8f0", color: isMe ? "white" : "#1e293b" }}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendDm} style={{ padding: "10px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "6px", backgroundColor: "#ffffff" }}>
                  <input type="text" placeholder="メッセージを入力..." value={dmInput} onChange={(e) => setDmInput(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "20px", fontSize: "0.85rem", outline: "none" }}/>
                  <button type="submit" style={{ padding: "8px 14px", background: "#4f46e5", color: "white", border: "none", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}>送信</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;