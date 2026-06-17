import React, { useState, useEffect, useCallback } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  // --- 認証用ステート ---
  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- データ用ステート ---
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
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data || []);
      }
    } catch (error) {
      console.error("レコメンドエラー:", error);
    }
  }, []);

  const fetchCommentsForItem = useCallback(async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/get-comments?item_id=${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setItemComments((prev) => ({ ...prev, [itemId]: data || [] }));
      }
    } catch (error) {
      console.error("コメント取得エラー:", error);
    }
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
    } catch (error) {
      console.error("データ取得エラー:", error);
    }
  }, [loginUser, searchKeyword, fetchRecommendations, fetchCommentsForItem]);

  useEffect(() => {
    if (loginUser) {
      fetchItems();
      fetchNotifications();
    }
  }, [loginUser, activeTab, searchKeyword, fetchItems, fetchNotifications]);

  const handleAuth = (e) => {
    e.preventDefault();
    setLoginUser({ email: email });
    alert(`🎉 ${isLoginMode ? "ログイン" : "登録"}成功: ` + email);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, price: parseInt(price, 10), user_email: loginUser.email }),
      });

      if (response.ok) {
        setName("");
        setPrice("");
        fetchItems();
      } else {
        alert("❌ 出品エラーが発生しました");
      }
    } catch (error) {
      console.error("通信エラー:", error);
    }
  };

  const handlePostComment = async (itemId) => {
    const text = commentInputs[itemId];
    if (!text || !text.trim()) return;

    try {
      const response = await fetch(
        `${API_URL}/post-comment?item_id=${itemId}&user_email=${loginUser.email}&content=${encodeURIComponent(text)}`,
        { method: "POST" }
      );
      if (response.ok) {
        setCommentInputs((prev) => ({ ...prev, [itemId]: "" }));
        fetchCommentsForItem(itemId);
      }
    } catch (error) {
      console.error("コメント通信エラー:", error);
    }
  };

  const handleDeleteComment = async (itemId, commentId) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    try {
      const response = await fetch(`${API_URL}/delete-comment?comment_id=${commentId}&user_email=${loginUser.email}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchCommentsForItem(itemId);
      } else {
        alert("❌ 削除権限がありません");
      }
    } catch (error) {
      console.error("コメント削除エラー:", error);
    }
  };

  // 💡 エラー原因だった箇所をきれいに修正しました
  const handleLike = async (item) => {
    if (!loginUser) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? {
              ...p,
              is_liked: !p.is_liked,
              like_count: p.is_liked ? (p.like_count || 1) - 1 : (p.like_count || 0) + 1,
            }
          : p
      )
    );
    try {
      const response = await fetch(`${API_URL}/like-item?item_id=${item.id}&user_email=${loginUser.email}`, { method: "POST" });
      if (!response.ok) fetchItems(); 
    } catch (e) { 
      fetchItems(); 
    }
  };

  const handleBuy = async (item) => {
    if (!window.confirm(`「${item.name}」を購入しますか？`)) return;
    try {
      const response = await fetch(`${API_URL}/buy-item?id=${item.id}`, { method: "POST" });
      if (response.ok) { alert("🎉 購入が完了しました！"); fetchItems(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;
    try {
      const response = await fetch(`${API_URL}/delete-item?id=${item.id}&user_email=${loginUser.email}`, { method: "DELETE" });
      if (response.ok) { fetchItems(); } else { alert("❌ 他人の商品は削除できません"); }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f6f9", padding: "20px 20px 80px 20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#333" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#1e293b", margin: "0 0 5px 0" }}>🤖 AI Fleamarket App</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>GCP × Python フルスタックシステム</p>
        </div>

        {!loginUser ? (
          <div style={{ background: "#ffffff", padding: "40px 30px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1.4rem", color: "#0f172a", textAlign: "center" }}>{isLoginMode ? "🔑 アカウントにログイン" : "📝 新規アカウント登録"}</h3>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", boxSizing: "border-box" }}/>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>パスワード</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", boxSizing: "border-box" }}/>
              </div>
              <button type="submit" style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "1.1rem", fontWeight: "600", cursor: "pointer" }}>{isLoginMode ? "ログインする" : "新規登録する"}</button>
            </form>
            <hr style={{ margin: "30px 0", borderTop: "1px solid #e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", cursor: "pointer" }}>{isLoginMode ? "💡 まだアカウントをお持ちでない方" : "🔑 すでにアカウントをお持ちの方"}</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", background: "#fff", borderRadius: "12px", padding: "6px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
              <button onClick={() => setActiveTab("home")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "home" ? "#f1f5f9" : "transparent", color: activeTab === "home" ? "#0f172a" : "#64748b" }}>🏠 ホーム</button>
              <button onClick={() => setActiveTab("notifications")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "notifications" ? "#f1f5f9" : "transparent", color: activeTab === "notifications" ? "#0f172a" : "#64748b", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                🔔 通知 {notifications.length > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: "0.75rem", padding: "2px 6px", borderRadius: "10px" }}>{notifications.length}</span>}
              </button>
              <button onClick={() => setActiveTab("profile")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: activeTab === "profile" ? "#f1f5f9" : "transparent", color: activeTab === "profile" ? "#0f172a" : "#64748b" }}>👤 マイページ</button>
            </div>

            {activeTab === "home" && (
              <div>
                <div style={{ background: "#ffffff", padding: "15px 20px", borderRadius: "16px", marginBottom: "20px", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🔍</span>
                  <input type="text" placeholder="キーワードで商品を検索" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} style={{ width: "100%", border: "none", outline: "none", fontSize: "0.95rem" }}/>
                  {searchKeyword && <button onClick={() => setSearchKeyword("")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>}
                </div>

                <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 15px 0", fontSize: "1.15rem", color: "#0f172a" }}>🎁 フリマに出品する</h3>
                  <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
                    <input type="text" placeholder="商品名" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 2, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <input type="number" placeholder="価格" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <button type="submit" style={{ padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>出品</button>
                  </form>
                </div>

                {recommendations.length > 0 && (
                  <div style={{ marginBottom: "25px", padding: "15px", background: "linear-gradient(to right, #f0fdf4, #ffffff)", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#14532d", fontSize: "0.95rem" }}>🧠 AIおすすめ商品</h4>
                    {recommendations.map((rec) => (
                      <div key={rec.id} style={{ fontSize: "0.85rem", color: "#16a34a", marginBottom: "4px" }}>👉 <strong>{rec.name}</strong> ({rec.price}円) - {rec.reason}</div>
                    ))}
                  </div>
                )}

                <h3 style={{ margin: "0 0 15px 5px", fontSize: "1.1rem" }}>{searchKeyword ? `🔍 検索結果` : "📋 商品一覧"} ({items.length}件)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "1.1rem", textDecoration: item.is_sold ? "line-through" : "none", color: item.is_sold ? "#94a3b8" : "#1e293b" }}>
                            {item.name} {item.user_email === loginUser.email && <span style={{fontSize:"0.8rem", color:"#3b82f6"}}>(あなた)</span>}
                          </div>
                          <div style={{ color: item.is_sold ? "#94a3b8" : "#059669", fontWeight: "800", fontSize: "1.05rem" }}>{item.price.toLocaleString()} 円</div>
                        </div>
                        
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleLike(item)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", backgroundColor: item.is_liked ? "#fff1f2" : "#f8fafc", color: item.is_liked ? "#e11d48" : "#64748b" }}>
                            {item.is_liked ? "❤️" : "🖤"} {item.like_count || 0}
                          </button>
                          {item.is_sold ? (
                            <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: "6px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "700" }}>SOLD OUT</span>
                          ) : (
                            <button onClick={() => handleBuy(item)} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>購入</button>
                          )}
                          {item.user_email === loginUser.email && (
                            <button onClick={() => handleDelete(item)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                          )}
                        </div>
                      </div>

                      {/* コメント欄 */}
                      <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px", marginTop: "12px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>💬 質問・コメント</div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px", maxHeight: "150px", overflowY: "auto" }}>
                          {(itemComments[item.id] || []).length === 0 ? (
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "4px" }}>質問はまだありません。</div>
                          ) : (
                            (itemComments[item.id] || []).map((c) => (
                              <div key={c.id} style={{ backgroundColor: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "2px" }}><span style={{ fontWeight: "600", color: "#2563eb" }}>👤 {c.user_email}</span> ({c.created_at})</div>
                                  <div style={{ fontSize: "0.85rem", color: "#334155" }}>{c.content}</div>
                                </div>
                                {(c.user_email === loginUser.email || item.user_email === loginUser.email) && (
                                  <button onClick={() => handleDeleteComment(item.id, c.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "700" }}>✕</button>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <input type="text" placeholder="質問を入力" value={commentInputs[item.id] || ""} onChange={(e) => setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))} style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}/>
                          <button onClick={() => handlePostComment(item.id)} style={{ padding: "6px 12px", background: "#475569", color: "white", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>送信</button>
                        </div>
                      </div>

                    </div>
                  ))}
                  {items.length === 0 && <div style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>該当する商品がありません。</div>}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", color: "#0f172a" }}>🔔 お知らせ</h3>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "30px 0" }}>通知はありません。</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {notifications.map((notif) => (
                      <div key={notif.id} style={{ padding: "12px 15px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #3b82f6", fontSize: "0.9rem" }}>{notif.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ width: "80px", height: "80px", backgroundColor: "#3b82f6", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 15px auto", fontWeight: "700" }}>{loginUser.email.charAt(0).toUpperCase()}</div>
                <h3 style={{ margin: "0 0 5px 0", fontSize: "1.3rem" }}>マイページ</h3>
                <p style={{ color: "#64748b", margin: "0 0 25px 0" }}>{loginUser.email}</p>
                <button onClick={() => { setLoginUser(null); setActiveTab("home"); }} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>ログアウト</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;