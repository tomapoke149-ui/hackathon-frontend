import React, { useState, useEffect, useCallback } from "react";

function App() {
  // --- 画面切り替えタブ（"home", "notifications", "profile"） ---
  const [activeTab, setActiveTab] = useState("home");

  // --- 認証用ステート ---
  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- 商品・レコメンド・通知用ステート ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // ⚠️ Cloud Runの本番URL
  const API_URL = "https://hackathon-backend-242925435490.asia-northeast1.run.app";

  // --- 通知を取得する関数 ---
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      }
    } catch (error) {
      console.error("通知取得エラー:", error);
    }
  }, []);

  // --- レコメンドを取得する関数 ---
  const fetchRecommendations = useCallback(async (latestPrice) => {
    try {
      const response = await fetch(`${API_URL}/recommend?price=${latestPrice}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data || []);
      }
    } catch (error) {
      console.error("レコメンド取得エラー:", error);
    }
  }, []);

  // --- 商品一覧を取得する関数 ---
  const fetchItems = useCallback(async () => {
    if (!loginUser) return;
    try {
      const response = await fetch(`${API_URL}/get-items?user_email=${loginUser.email}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
        
        if (data && data.length > 0) {
          fetchRecommendations(data[0].price);
        } else {
          setRecommendations([]);
        }
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
    }
  }, [loginUser, fetchRecommendations]);

  // ログイン時やタブ切り替え時にデータを同期
  useEffect(() => {
    if (loginUser) {
      fetchItems();
      fetchNotifications();
    }
  }, [loginUser, activeTab, fetchItems, fetchNotifications]);

  // --- 認証ハンドラー ---
  const handleAuth = (e) => {
    e.preventDefault();
    setLoginUser({ email: email });
    alert(`🎉 ${isLoginMode ? "ログイン" : "登録"}成功: ` + email);
    setEmail("");
    setPassword("");
  };

  // --- 商品出品ハンドラー ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, price: parseInt(price, 10) }),
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

  // --- いいね！ハンドラー（超快適・即時反映ロジック） ---
  const handleLike = async (item) => {
    if (!loginUser) return;

    // 🚀 API通信を待たずに、手元の画面(State)のデータを最速で書き換える
    setItems((prevItems) =>
      prevItems.map((prevItem) => {
        if (prevItem.id === item.id) {
          return {
            ...prevItem,
            is_liked: !prevItem.is_liked,
            like_count: prevItem.is_liked
              ? (prevItem.like_count || 1) - 1
              : (prevItem.like_count || 0) + 1,
          };
        }
        return prevItem;
      })
    );

    try {
      const response = await fetch(`${API_URL}/like-item?item_id=${item.id}&user_email=${loginUser.email}`, {
        method: "POST",
      });

      if (response.ok) {
        fetchNotifications(); // 通知履歴を更新
      } else {
        alert("❌ いいね処理に失敗しました");
        fetchItems(); 
      }
    } catch (error) {
      console.error("いいね通信エラー:", error);
      fetchItems();
    }
  };

  // --- 商品購入ハンドラー ---
  const handleBuy = async (item) => {
    if (!window.confirm(`「${item.name}」を購入しますか？`)) return;

    try {
      const response = await fetch(`${API_URL}/buy-item?id=${item.id}`, {
        method: "POST",
      });

      if (response.ok) {
        alert("🎉 購入が完了しました！");
        fetchItems();
      } else {
        alert("❌ 購入に失敗しました");
      }
    } catch (error) {
      console.error("購入通信エラー:", error);
    }
  };

  // --- 商品削除ハンドラー ---
  const handleDelete = async (item) => {
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;

    try {
      const response = await fetch(`${API_URL}/delete-item?id=${item.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchItems();
      } else {
        alert("❌ 削除に失敗しました");
      }
    } catch (error) {
      console.error("削除通信エラー:", error);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f4f6f9", 
      padding: "20px 20px 80px 20px", 
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: "#333"
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* ヘッダーエリア */}
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#1e293b", margin: "0 0 5px 0" }}>
            🚀 Fleamarket Demo App
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>GCP × Python フルスタックシステム</p>
        </div>

        {/* 🔒 1. 未ログイン時の画面 */}
        {!loginUser ? (
          <div style={{ 
            background: "#ffffff", padding: "40px 30px", borderRadius: "16px", 
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0"
          }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1.4rem", color: "#0f172a", textAlign: "center" }}>
              {isLoginMode ? "🔑 アカウントにログイン" : "📝 新規アカウント登録"}
            </h3>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>メールアドレス</label>
                <input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", boxSizing: "border-box" }}/>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>パスワード</label>
                <input type="password" placeholder="6文字以上のパスワード" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", boxSizing: "border-box" }}/>
              </div>
              <button type="submit" style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "1.1rem", fontWeight: "600", cursor: "pointer" }}>
                {isLoginMode ? "ログインする" : "新規登録する"}
              </button>
            </form>
            <hr style={{ margin: "30px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", cursor: "pointer" }}>
                {isLoginMode ? "💡 まだアカウントをお持ちでない方" : "🔑 すでにアカウントをお持ちの方"}
              </button>
            </div>
          </div>
        ) : (
          // 🔓 2. ログイン済みのメイン画面（タブ対応）
          <div>
            {/* 上部タブナビゲーション */}
            <div style={{ 
              display: "flex", background: "#fff", borderRadius: "12px", padding: "6px", 
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: "25px", border: "1px solid #e2e8f0" 
            }}>
              <button onClick={() => setActiveTab("home")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", backgroundColor: activeTab === "home" ? "#f1f5f9" : "transparent", color: activeTab === "home" ? "#0f172a" : "#64748b" }}>🏠 ホーム</button>
              <button onClick={() => setActiveTab("notifications")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", backgroundColor: activeTab === "notifications" ? "#f1f5f9" : "transparent", color: activeTab === "notifications" ? "#0f172a" : "#64748b", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                🔔 通知 
                {notifications.length > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: "0.75rem", padding: "2px 6px", borderRadius: "10px" }}>{notifications.length}</span>}
              </button>
              <button onClick={() => setActiveTab("profile")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", backgroundColor: activeTab === "profile" ? "#f1f5f9" : "transparent", color: activeTab === "profile" ? "#0f172a" : "#64748b" }}>👤 マイページ</button>
            </div>

            {/* 各タブの中身コンテンツ */}
            
            {/* 【A. ホームタブ】 */}
            {activeTab === "home" && (
              <div>
                {/* 出品フォーム */}
                <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 15px 0", fontSize: "1.15rem", color: "#0f172a" }}>🎁 フリマに出品する</h3>
                  <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
                    <input type="text" placeholder="商品名" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 2, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <input type="number" placeholder="価格" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}/>
                    <button type="submit" style={{ padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>出品</button>
                  </form>
                </div>

                {/* AIレコメンド */}
                {recommendations.length > 0 && (
                  <div style={{ marginBottom: "25px", padding: "15px", background: "linear-gradient(to right, #f0fdf4, #ffffff)", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#14532d", fontSize: "0.95rem" }}>🧠 AIおすすめ商品（バスケット推薦）</h4>
                    {recommendations.map((rec) => (
                      <div key={rec.id} style={{ fontSize: "0.85rem", color: "#16a34a", marginBottom: "4px" }}>👉 <strong>{rec.name}</strong> ({rec.price}円) - <span style={{ color: "#15803d" }}>{rec.reason}</span></div>
                    ))}
                  </div>
                )}

                {/* 出品済み一覧 */}
                <h3 style={{ margin: "0 0 15px 5px", fontSize: "1.1rem" }}>📋 タイムライン商品一覧</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ background: "#ffffff", padding: "15px", borderRadius: "12px", display: "flex", alignItems: "center", justifyvalue: "space-between", border: "1px solid #e2e8f0" }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", marginRight: "10px" }}>
                        <div style={{ fontWeight: "600", textDecoration: item.is_sold ? "line-through" : "none", color: item.is_sold ? "#94a3b8" : "#1e293b" }}>{item.name}</div>
                        <div style={{ color: item.is_sold ? "#94a3b8" : "#059669", fontWeight: "700", fontSize: "0.95rem" }}>{item.price.toLocaleString()} 円</div>
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
                        <button onClick={() => handleDelete(item)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 【B. 通知センタータブ】 */}
            {activeTab === "notifications" && (
              <div style={{ background: "#ffffff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", color: "#0f172a" }}>🔔 あなたへのお知らせ履歴</h3>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "30px 0" }}>まだ通知はありません。商品に「いいね！」されるとここにリアルタイムで表示されます！</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {notifications.map((notif) => (
                      <div key={notif.id} style={{ padding: "12px 15px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #3b82f6", fontSize: "0.9rem", fontWeight: "500", color: "#334155" }}>
                        {notif.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 【C. プロフィールタブ】 */}
            {activeTab === "profile" && (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ width: "80px", height: "80px", backgroundColor: "#3b82f6", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 15px auto", fontWeight: "700" }}>
                  {loginUser.email.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ margin: "0 0 5px 0", fontSize: "1.3rem", color: "#0f172a" }}>ハッカソン公式ユーザー</h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 25px 0" }}>{loginUser.email}</p>
                
                <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "15px 0", marginBottom: "30px" }}>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a" }}>{items.length}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>出品数</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a" }}>
                      {items.reduce((acc, cur) => acc + (cur.like_count || 0), 0)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>獲得いいね数</div>
                  </div>
                </div>

                <button onClick={() => { setLoginUser(null); setActiveTab("home"); alert("ログアウトしました"); }} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "0.9rem" }}>
                  🔓 アカウントからログアウト
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default App;