import React, { useState, useEffect, useCallback, useRef } from "react";

function App() {
  // --- 認証用ステート ---
  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- 出品・商品管理用ステート ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [userPoints, setUserPoints] = useState(10000);
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]); // AIレコメンド用
  const [searchKeyword, setSearchKeyword] = useState("");

  // --- コメント用ステート ---
  const [itemComments, setItemComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  // --- 通知・履歴・ナビゲーション用ステート ---
  const [notifications, setNotifications] = useState([]);
  const [historyList, setHistoryList] = useState([]); // 💡 警告対象だった変数を下部でしっかり使用します
  const [historyTab, setHistoryTab] = useState("all");
  const [activeTab, setActiveTab] = useState("home");

  // --- プロフィール用ステート ---
  const [viewProfile, setViewProfile] = useState(null); 
  const [bioInput, setBioInput] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);

  // --- DM（チャット）用ステート ---
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState("");
  const chatEndRef = useRef(null);

  // --- 取引・評価用ステート ---
  const [transactionItem, setTransactionItem] = useState(null);  
  const [rating, setRating] = useState(5);                       
  const [reviewComment, setReviewComment] = useState("");        

  const API_URL = "https://hackathon-backend-242925435490.asia-northeast1.run.app";

  // --- APIデータ取得系関数 ---

  const fetchHistory = useCallback(async () => {
  if (!loginUser) return;
  try {
    // 💡 新しく作った商品の取引履歴用APIを叩くように修正
    const response = await fetch(`${API_URL}/get-trade-history?user_email=${encodeURIComponent(loginUser.email)}`);
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

  // --- 副作用 (useEffect) ---

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

  // --- アクションハンドラー関数 ---

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
        alert(`🎉 ${isLoginMode ? "ログイン" : "登録"} に成功しました！`);
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
      if (response.ok) { 
        alert("🎉 商品を出品しました！"); 
        setName(""); setPrice(""); setDescription(""); setImageUrl(""); fetchItems(); 
      } else {
        alert("⚠️ 出品に失敗しました。（バックエンドサーバーのエラーです）");
      }
    } catch (error) { 
      console.error(error); 
      alert("⚠️ 通信エラーが発生しました。");
    }
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
      alert(`⚠️ ポイントが足りません！\n 現在の所持： ${userPoints.toLocaleString()} pt\n 商品の価格： ${item.price.toLocaleString()} pt`);
      return;
    }
    if (!window.confirm(`「 ${item.name} 」を ${item.price.toLocaleString()} pt で購入しますか？`)) return;
    try {
      const response = await fetch(`${API_URL}/buy-item?id=${item.id}&user_email=${encodeURIComponent(loginUser.email)}`, { method: "POST" });
      if (response.ok) { 
        alert("🎉 購入が完了しました！続けて出品者に取引メッセージを送りましょう！"); 
        fetchItems(); fetchPoints(); fetchRecommendations(); 
        
        // ⭐ 追加：購入後、自動的に取引相手とのDM画面を立ち上げる！
        setActiveChatUser(item.user_email);
      } else {
        alert("⚠️ 購入に失敗しました。");
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`「 ${item.name} 」を削除してもよろしいですか？`)) return;
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

  // --- プロフィール・フォロー・ナビゲーション系 ---

  const handleUserClick = async (email) => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/user-profile?target_email=${encodeURIComponent(email)}&current_user_email=${encodeURIComponent(loginUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setViewProfile(data);
        if (email === loginUser.email) {
          setBioInput(data.bio || ""); 
          setActiveTab("myProfile");  
          fetchHistory(); // 履歴を同時に再取得
        } else {
          setActiveTab("otherProfile");
        }
      }
    } catch (e) { console.error("プロフィール取得エラー", e); }
  };

  const handleToggleFollow = async () => {
    if (!loginUser || !viewProfile) return;
    try {
      const response = await fetch(`${API_URL}/toggle-follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_email: loginUser.email, followee_email: viewProfile.email })
      });
      if (response.ok) {
        setViewProfile(prev => ({
          ...prev,
          is_following: !prev.is_following,
          follower_count: prev.is_following ? prev.follower_count - 1 : prev.follower_count + 1
        }));
      }
    } catch (e) { console.error("フォローエラー", e); }
  };

  const handleUpdateBio = async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/update-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginUser.email, bio: bioInput })
      });
      if (response.ok) {
        setIsEditingBio(false);
        handleUserClick(loginUser.email);
      }
    } catch (e) { console.error("自己紹介更新エラー", e); }
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

  // --- 取引フロー処理関数 ---

  const handleShipItem = async (item) => {
    try {
      const response = await fetch(`${API_URL}/ship-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, user_email: loginUser.email })
      });
      if (response.ok) {
        alert("発送通知を送りました！");
        fetchItems(); 
        if (viewProfile) handleUserClick(viewProfile.email);
      } else {
        alert("⚠️ 発送処理に失敗しました。（バックエンドに /ship-item が作られていない可能性があります）");
      }
    } catch (e) { 
      console.error("発送エラー", e); 
      alert("⚠️ 通信エラーが発生しました。");
    }
  };

  const handleCompleteTransaction = async () => {
    if (!transactionItem) return;
    try {
      const response = await fetch(`${API_URL}/complete-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: transactionItem.id,
          user_email: loginUser.email,
          rating: rating,
          comment: reviewComment
        })
      });
      if (response.ok) {
        alert("取引が完了しました！評価を送信しました。");
        setTransactionItem(null); 
        setRating(5);
        setReviewComment("");
        fetchItems();
        fetchPoints();
        if (viewProfile) handleUserClick(viewProfile.email);
      }
    } catch (e) { console.error("取引完了エラー", e); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f6f9", padding: "20px 20px 80px 20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#333" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#1e293b", margin: "0 0 5px 0" }}>🤖 AI Fleamarket App</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}> GCP × Python フルスタックシステム </p>
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
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}> 切替 </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#ffffff", padding: "15px 20px", borderRadius: "14px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>💰 アプリ内通貨アカウント</div>
              <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>{userPoints.toLocaleString()} <span style={{ fontSize: "1rem", fontWeight: "normal" }}>pt</span></div>
            </div>

            {/* ナビゲーションタブ */}
            <div style={{ display: "flex", background: "#fff", borderRadius: "12px", padding: "6px", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
              <button onClick={() => handleTabChange("home")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "home" ? "#f1f5f9" : "transparent" }}>🏠 ホーム</button>
              <button onClick={() => handleTabChange("notifications")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "notifications" ? "#f1f5f9" : "transparent", display: "flex", justifyContent: "center", gap: "6px" }}>
                🔔 通知 {unreadCount > 0 && <span style={{ background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem" }}>{unreadCount}</span>}
              </button>
              <button onClick={() => handleUserClick(loginUser.email)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: (activeTab === "myProfile" || activeTab === "profile") ? "#f1f5f9" : "transparent" }}>👤 マイページ</button>
            </div>

            {/* 各タブのコンテンツ表示 */}
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
                    <button type="submit" style={{ padding: "12px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}> 商品をフリマに出品する </button>
                  </form>
                </div>

                {/* AIレコメンド */}
                {searchKeyword.trim() === "" && recommendations.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", padding: "20px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #fde68a", boxShadow: "0 4px 6px rgba(253, 230, 138, 0.3)" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#d97706", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1.2rem" }}> ✨ </span> AIが選ぶ！あなたへのおすすめ
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
                        }} style={{ minWidth: "140px", maxWidth: "140px", background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #fde047", cursor: "pointer", flexShrink: 0, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"} >
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

                {/* 商品一覧 */}
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
                          <button onClick={() => handleLike(item)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", backgroundColor: item.is_liked ? "#fff1f2" : "#f8fafc", width: "100%" }}> {item.is_liked ? "❤️" : "🖤"} {item.like_count || 0} </button>
                          
                          {item.is_sold ? (
                            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ background: "#f1f5f9", color: "#64748b", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", textAlign: "center", boxSizing: "border-box" }}> 売り切れ </span>
                              {/* 出品者かつ未発送の場合のみ発送ボタン表示 */}
                              {item.user_email === loginUser.email && !item.is_shipped && (
                                <button onClick={() => handleShipItem(item)} style={{ background: "#f59e0b", color: "white", border: "none", padding: "6px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}> 商品を発送する </button>
                              )}
                              {/* 購入者かつ発送済み・未完了の場合に受取評価ボタン表示 */}
                              {item.buyer_email === loginUser.email && item.is_shipped && !item.is_completed && (
                                <button onClick={() => setTransactionItem(item)} style={{ background: "#10b981", color: "white", border: "none", padding: "6px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}> 受取評価をする </button>
                              )}
                            </div>
                          ) : item.user_email === loginUser.email ? (
                            <span style={{ background: "#f8fafc", color: "#64748b", border: "1px dashed #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", textAlign: "center", width: "100%", display: "block", boxSizing: "border-box" }}> あなたの商品 </span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                              <div onClick={() => handleUserClick(item.user_email)} style={{ background: "#eff6ff", color: "#2563eb", padding: "8px 12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", textAlign: "center", cursor: "pointer", border: "1px solid #bfdbfe" }} > 👤 プロフ </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => handleBuy(item)} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px", borderRadius: "6px", flex: 1, cursor: "pointer", fontWeight: "bold" }}> 購入 </button>
                                <button onClick={() => setActiveChatUser(item.user_email)} style={{ background: "#fff", color: "#2563eb", border: "1px solid #2563eb", padding: "8px", borderRadius: "6px", flex: 1, cursor: "pointer", fontWeight: "bold" }}> DM </button>
                              </div>
                            </div>
                          )}
                          
                          {item.user_email === loginUser.email && (
                            <button onClick={() => handleDelete(item)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", width: "100%" }}>削除 🗑️</button>
                          )}
                        </div>
                      </div>

                      {/* コメント欄 */}
                      <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px", marginTop: "12px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "8px" }}> 💬 コメント ({(itemComments[item.id] || []).length}) </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                          {(itemComments[item.id] || []).map((c) => (
                            <div key={c.id} style={{ fontSize: "0.85rem", backgroundColor: "#fff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                              <div><strong>{c.user_email === item.user_email ? "出品者" : c.user_email.split("@")[0]}:</strong> {c.content}</div>
                              {c.user_email === loginUser.email && (
                                <span onClick={() => handleDeleteComment(item.id, c.id)} style={{ color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}>削除</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input type="text" placeholder="質問・コメントを入力..." value={commentInputs[item.id] || ""} onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}/>
                          <button onClick={() => handlePostComment(item.id)} style={{ padding: "6px 12px", background: "#475569", color: "white", border: "none", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}>送信</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>🔔 通知一覧</h3>
                {notifications.length === 0 ? <p style={{ color: "#64748b" }}>通知はありません</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {notifications.map((n) => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: n.is_read ? "#fff" : "#eff6ff", cursor: "pointer" }}>
                        <div style={{ fontSize: "0.9rem" }}>{n.message}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>{n.created_at}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(activeTab === "myProfile" || activeTab === "otherProfile") && viewProfile && (
              <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>👤 {viewProfile.email === loginUser.email ? "マイプロフィール" : "ユーザープロフィール"}</h3>
                  {viewProfile.email !== loginUser.email && (
                    <button onClick={handleToggleFollow} style={{ padding: "8px 16px", background: viewProfile.is_following ? "#cbd5e1" : "#2563eb", color: viewProfile.is_following ? "#333" : "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                      {viewProfile.is_following ? "フォロー中 ✓" : "➕ フォローする"}
                    </button>
                  )}
                </div>

                <div style={{ padding: "15px", backgroundColor: "#f8fafc", borderRadius: "10px", marginBottom: "20px" }}>
                  <div><strong>メールアドレス:</strong> {viewProfile.email}</div>
                  <div style={{ display: "flex", gap: "15px", marginTop: "10px", fontSize: "0.9rem" }}>
                    <div><strong>フォロー:</strong> {viewProfile.following_count || 0} 人</div>
                    <div><strong>フォロワー:</strong> {viewProfile.follower_count || 0} 人</div>
                    <div><strong>評価数:</strong> {viewProfile.reviews ? viewProfile.reviews.length : 0} 件</div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 8px 0" }}>📝 自己紹介</h4>
                  {viewProfile.email === loginUser.email ? (
                    isEditingBio ? (
                      <div>
                        <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value)} rows="3" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}/>
                        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                          <button onClick={handleUpdateBio} style={{ padding: "6px 12px", background: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>保存</button>
                          <button onClick={() => setIsEditingBio(false)} style={{ padding: "6px 12px", background: "#cbd5e1", border: "none", borderRadius: "6px", cursor: "pointer" }}>キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>{viewProfile.bio || "自己紹介が未設定です。"}</p>
                        <button onClick={() => setIsEditingBio(true)} style={{ padding: "6px 12px", background: "#475569", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>自己紹介を編集</button>
                      </div>
                    )
                  ) : (
                    <p style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>{viewProfile.bio || "自己紹介はありません。"}</p>
                  )}
                </div>

                {/* 💡 【復活＆統合】購入・販売履歴タブエリア */}
                {viewProfile.email === loginUser.email && (
                  <div style={{ marginBottom: "25px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                    <h4 style={{ margin: "0 0 12px 0" }}>📋 取引履歴</h4>
                    
                    {/* 履歴フィルタータブ */}
                    <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", marginBottom: "12px" }}>
                      <button onClick={() => setHistoryTab("all")} style={{ flex: 1, padding: "6px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", backgroundColor: historyTab === "all" ? "#fff" : "transparent" }}>すべて</button>
                      <button onClick={() => setHistoryTab("buy")} style={{ flex: 1, padding: "6px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", backgroundColor: historyTab === "buy" ? "#fff" : "transparent" }}>購入履歴</button>
                      <button onClick={() => setHistoryTab("sell")} style={{ flex: 1, padding: "6px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", backgroundColor: historyTab === "sell" ? "#fff" : "transparent" }}>出品履歴</button>
                    </div>

                   {/* 履歴リストの一覧表示 */}
                    {historyList.length === 0 ? (
                      <p style={{ color: "#64748b", fontSize: "0.9rem" }}>取引履歴はまだありません</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {historyList
                          .filter(h => {
                            if (historyTab === "buy") return h.buyer_email === loginUser.email;
                            if (historyTab === "sell") return h.user_email === loginUser.email;
                            return true;
                          })
                          .map((h, idx) => {
                            const isBuyer = h.buyer_email === loginUser.email;
                            // 💡 購入者が存在するか（購入されているか）の判定
                            const hasBuyer = h.buyer_email && h.buyer_email !== "";
                            
                            return (
                              <div key={idx} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: isBuyer ? "#dbeafe" : "#d1fae5", color: isBuyer ? "#1e40af" : "#065f46", marginRight: "6px" }}>
                                    {isBuyer ? "購入" : "出品"}
                                  </span>
                                  <strong>{h.name}</strong>
                                  <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>
                                    価格: {h.price.toLocaleString()}pt | 相手: {isBuyer ? h.user_email?.split("@")[0] : (hasBuyer ? h.buyer_email?.split("@")[0] : "未購入")}
                                  </div>
                                </div>
                                
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  {/* 💡 ステータス表示の条件分岐を正確に修正（未購入なら出品中、購入済みなら取引中） */}
                                  <div style={{ 
                                    fontSize: "0.8rem", 
                                    fontWeight: "bold", 
                                    color: h.is_completed ? "#10b981" : h.is_shipped ? "#f59e0b" : (hasBuyer ? "#64748b" : "#3b82f6") 
                                  }}>
                                    {h.is_completed ? "取引完了" : h.is_shipped ? "発送済み" : (hasBuyer ? "取引中" : "出品中")}
                                  </div>

                                  {/* ⭐ 追加：購入者側（自分＝buyer_email）かつ、発送済み（is_shipped）かつ、未完了（!is_completed）なら受取評価ボタンを出す */}
                                  {isBuyer && h.is_shipped && !h.is_completed && (
                                    <button 
                                      onClick={() => {
                                        // 💡 もし既存の評価用モーダルを開く関数（例: handleOpenReviewModal）があればそれに書き換えてください
                                        // なければ、臨時のポップアップ通知等で完了APIを叩くように調整します
                                        const rating = prompt("出品者の評価を1〜5の数字で入力してください", "5");
                                        const comment = prompt("評価コメントを入力してください", "ありがとうございました！");
                                        if (rating) {
                                          fetch(`${API_URL}/complete-transaction`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ item_id: h.id, user_email: loginUser.email, rating: parseInt(rating, 10), comment: comment })
                                          }).then(res => {
                                            if (res.ok) {
                                              alert("🎉 取引が完了しました！");
                                              fetchHistory(); // 履歴を再読み込み
                                            } else {
                                              alert("評価の送信に失敗しました。");
                                            }
                                          });
                                        }
                                      }}
                                      style={{ padding: "4px 8px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "bold" }}
                                    >
                                      🌟 受取評価
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* ユーザー評価履歴 */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0" }}>⭐ 最近の評価一覧</h4>
                  {!viewProfile.reviews || viewProfile.reviews.length === 0 ? <p style={{ color: "#64748b", fontSize: "0.9rem" }}>まだ評価はありません</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {viewProfile.reviews.map((r, idx) => (
                        <div key={idx} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#ffc107", fontWeight: "bold" }}>
                            <span>{"★".repeat(r.rating || 5)}</span>
                            <span style={{ color: "#64748b" }}>{r.reviewer_email ? r.reviewer_email.split("@")[0] : "ゲスト"}</span>
                          </div>
                          {r.comment && <div style={{ marginTop: "4px", color: "#334155" }}>{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- 全画面・ポップアップモーダルエリア --- */}

      {/* DM（チャット）用ポップアップ画面 */}
      {activeChatUser && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ width: "90%", maxWidth: "450px", height: "80vh", backgroundColor: "white", borderRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "15px", background: "#2563eb", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>✉️ DM: {activeChatUser.split("@")[0]}</div>
              <button onClick={() => setActiveChatUser(null)} style={{ background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: "15px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc" }}>
              {dmMessages.length === 0 ? <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "20px" }}>メッセージはまだありません</p> : dmMessages.map((msg, index) => {
                const isMe = msg.sender_email === loginUser?.email;
                return (
                  <div key={index} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                    <div style={{ background: isMe ? "#2563eb" : "#e2e8f0", color: isMe ? "white" : "#333", padding: "10px 14px", borderRadius: "12px", borderTopRightRadius: isMe ? 0 : "12px", borderTopLeftRadius: isMe ? "12px" : 0, fontSize: "0.9rem", wordBreak: "break-all" }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: isMe ? "right" : "left", marginTop: "2px" }}>{msg.created_at}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendDm} style={{ display: "flex", padding: "10px", borderTop: "1px solid #e2e8f0" }}>
              <input type="text" placeholder="メッセージを入力..." value={dmInput} onChange={(e) => setDmInput(e.target.value)} style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none" }}/>
              <button type="submit" style={{ marginLeft: "8px", padding: "10px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>送信</button>
            </form>
          </div>
        </div>
      )}

      {/* 取引受取評価用ポップアップモーダル */}
      {transactionItem && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1001 }}>
          <div style={{ width: "90%", maxWidth: "400px", backgroundColor: "white", padding: "25px", borderRadius: "16px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 15px 0" }}>⭐ 受取評価</h3>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "20px" }}> 取引が完了しました。出品者「{transactionItem.user_email?.split("@")[0]}」の評価をお願いします。 </p>

            {/* 星マーク選択 */}
            <div style={{ fontSize: "2.5rem", marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setRating(star)} style={{ color: star <= rating ? "#ffc107" : "#e2e8f0", cursor: "pointer" }}>★</span>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="評価コメントを入力してください（任意）"
              rows="3"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setTransactionItem(null); setRating(5); setReviewComment(""); }} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}> キャンセル </button>
              <button onClick={handleCompleteTransaction} style={{ flex: 1, padding: "12px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}> 評価を送信して完了 </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;