import React, { useState, useEffect, useCallback } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [itemComments, setItemComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const API_URL = "https://hackathon-backend-242925435490.asia-northeast1.run.app";

  const fetchNotifications = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/notifications?user_email=${loginUser.email}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      }
    } catch (error) {
      console.error("通知取得エラー:", error);
    }
  }, [loginUser]);

  const fetchRecommendations = useCallback(async (latestPrice) => {
    try {
      const response = await fetch(`${API_URL}/recommend?price=${latestPrice}`);
      if (response.ok) setRecommendations(await response.json() || []);
    } catch (error) { console.error(error); }
  }, []);

  const fetchCommentsForItem = useCallback(async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/get-comments?item_id=${itemId}`);
      if (response.ok) setItemComments((prev) => ({ ...prev, [itemId]: await response.json() || [] }));
    } catch (error) { console.error(error); }
  }, []);

  const fetchItems = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/get-items?user_email=${loginUser.email}&keyword=${searchKeyword}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
        if (data && data.length > 0) {
          fetchRecommendations(data[0].price);
          data.forEach((item) => fetchCommentsForItem(item.id));
        } else {
          setRecommendations([]);
        }
      }
    } catch (error) { console.error(error); }
  }, [loginUser, searchKeyword, fetchRecommendations, fetchCommentsForItem]);

  useEffect(() => {
    if (loginUser) {
      fetchItems();
      fetchNotifications();
    }
  }, [loginUser, searchKeyword, fetchItems, fetchNotifications]);

  const handleAuth = (e) => {
    e.preventDefault();
    setLoginUser({ email: email });
    alert(`🎉 ${isLoginMode ? "ログイン" : "登録"}成功: ` + email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, price: parseInt(price, 10), user_email: loginUser.email }),
      });
      if (response.ok) { setName(""); setPrice(""); fetchItems(); }
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
      if (response.ok) {
        setCommentInputs((prev) => ({ ...prev, [itemId]: "" }));
        fetchCommentsForItem(itemId);
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteComment = async (itemId, commentId) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    try {
      const response = await fetch(`${API_URL}/delete-comment?comment_id=${commentId}&user_email=${loginUser.email}`, { method: "DELETE" });
      if (response.ok) fetchCommentsForItem(itemId);
    } catch (error) { console.error(error); }
  };

  const handleLike = async (item) => {
    if (!loginUser) return;
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? (p.like_count || 1) - 1 : (p.like_count || 0) + 1 } : p));
    try {
      const response = await fetch(`${API_URL}/like-item?item_id=${item.id}&user_email=${loginUser.email}`, { method: "POST" });
      if (!response.ok) fetchItems(); 
    } catch (e) { fetchItems(); }
  };

  const handleBuy = async (item) => {
    if (!window.confirm(`「${item.name}」を購入しますか？`)) return;
    try {
      const response = await fetch(`${API_URL}/buy-item?id=${item.id}&user_email=${loginUser.email}`, { method: "POST" });
      if (response.ok) { alert("🎉 購入が完了しました！"); fetchItems(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;
    try {
      const response = await fetch(`${API_URL}/delete-item?id=${item.id}&user_email=${loginUser.email}`, { method: "DELETE" });
      if (response.ok) fetchItems();
    } catch (e) { console.error(e); }
  };

  // 💡 タブ切り替え時に通知を既読にする処理
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === "notifications") {
      const hasUnread = notifications.some(n => !n.is_read);
      if (hasUnread) {
        fetch(`${API_URL}/notifications/read?user_email=${loginUser.email}`, { method: "POST" });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    }
  };

  // 💡 通知をクリックした時に商品へジャンプする処理
  const handleNotificationClick = (itemId) => {
    if (!itemId) return;
    setActiveTab("home");
    setSearchKeyword(""); // 検索を解除して表示させる
    setTimeout(() => {
      const element = document.getElementById(`item-card-${itemId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // 一瞬だけ色を変えて光らせる（注目させる）
        element.style.transition = "background-color 0.5s";
        element.style.backgroundColor = "#fef08a"; // 薄い黄色
        setTimeout(() => element.style.backgroundColor = "#ffffff", 1500);
      }
    }, 300); // 画面が切り替わるのを少し待つ
  };

  // 未読の通知の数を計算
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
                  <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
                    <input type="text" placeholder="商品名" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 2, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <input type="number" placeholder="価格" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <button type="submit" style={{ padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>出品</button>
                  </form>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {items.map((item) => (
                    <div id={`item-card-${item.id}`} key={item.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "1.1rem", textDecoration: item.is_sold ? "line-through" : "none" }}>
                            <span style={{ fontSize: "0.85rem", color: "#94a3b8", marginRight: "6px" }}>[ID:{item.id}]</span>
                            {item.name}
                          </div>
                          <div style={{ color: item.is_sold ? "#94a3b8" : "#059669", fontWeight: "800", fontSize: "1.05rem" }}>{item.price.toLocaleString()} 円</div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleLike(item)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", backgroundColor: item.is_liked ? "#fff1f2" : "#f8fafc" }}>
                            {item.is_liked ? "❤️" : "🖤"} {item.like_count || 0}
                          </button>
                          
                          {item.is_sold ? (
                            <span style={{ background: "#f1f5f9", color: "#64748b", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700" }}>SOLD</span>
                          ) : item.user_email === loginUser.email ? (
                            <span style={{ background: "#f8fafc", color: "#94a3b8", border: "1px dashed #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700" }}>自分の商品</span>
                          ) : (
                            <button onClick={() => handleBuy(item)} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem" }}>購入</button>
                          )}
                          
                          {item.user_email === loginUser.email && (
                            <button onClick={() => handleDelete(item)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px", marginTop: "12px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>💬 コメント</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px", maxHeight: "150px", overflowY: "auto" }}>
                          {(itemComments[item.id] || []).map((c) => (
                            <div key={c.id} style={{ backgroundColor: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>👤 {c.user_email} ({c.created_at})</div>
                                <div style={{ fontSize: "0.85rem" }}>{c.content}</div>
                              </div>
                              {(c.user_email === loginUser.email || item.user_email === loginUser.email) && (
                                <button onClick={() => handleDeleteComment(item.id, c.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input type="text" placeholder="コメント" value={commentInputs[item.id] || ""} onChange={(e) => setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))} style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }}/>
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
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif.item_id)}
                      style={{ padding: "12px 15px", backgroundColor: notif.is_read ? "#f8fafc" : "#eff6ff", borderRadius: "8px", borderLeft: "4px solid #3b82f6", cursor: "pointer", transition: "background-color 0.2s" }}
                    >
                      {notif.message}
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>タップで商品へ移動 👉</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 5px 0" }}>マイページ</h3>
                <p style={{ color: "#64748b" }}>{loginUser.email}</p>
                <button onClick={() => { setLoginUser(null); setActiveTab("home"); }} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px" }}>ログアウト</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;