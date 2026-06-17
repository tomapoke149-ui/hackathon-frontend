import React, { useState, useEffect, useCallback } from "react";

// ⚠️ Firebaseのインポートは削除しました

function App() {
  // --- 認証用ステート（初期値は未ログイン） ---
  const [loginUser, setLoginUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- 商品・レコメンド用ステート ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // ⚠️ Cloud Runの本番URL
  const API_URL = "https://hackathon-backend-242925435490.asia-northeast1.run.app";

  // --- API通信用関数 ---
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

  const fetchItems = useCallback(async () => {
    if (!loginUser) return;
    try {
      // 💡 修正点：ログイン中のユーザーのメールを添えて商品を取得する
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

  useEffect(() => {
    if (loginUser) {
      fetchItems();
    }
  }, [loginUser, fetchItems]);

  // --- 認証ハンドラー（Firebaseなしの仮ログイン） ---
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

  // --- ★新設：いいね！ハンドラー ---
  
// --- ★超快適版：いいね！ハンドラー（即時反映ロジック付き） ---
  const handleLike = async (item) => {
    if (!loginUser) return;

    // 🚀 【即時反映の魔法】APIの通信を待たずに、まず手元の画面(State)のデータを書き換える！
    setItems((prevItems) =>
      prevItems.map((prevItem) => {
        if (prevItem.id === item.id) {
          return {
            ...prevItem,
            is_liked: !prevItem.is_liked, // ハートを反転
            like_count: prevItem.is_liked
              ? (prevItem.like_count || 1) - 1  // すでにいいねしてたら-1
              : (prevItem.like_count || 0) + 1, // まだなら+1
          };
        }
        return prevItem;
      })
    );

    try {
      // バックエンドのデータベースを裏でこっそり更新に行く
      const response = await fetch(`${API_URL}/like-item?item_id=${item.id}&user_email=${loginUser.email}`, {
        method: "POST",
      });

      if (!response.ok) {
        // もし万が一、通信エラー等で失敗した場合は、データを正しい状態に戻す
        alert("❌ いいね処理に失敗しました");
        fetchItems(); 
      }
    } catch (error) {
      console.error("いいね通信エラー:", error);
      fetchItems(); // エラー時は元に戻す
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
      padding: "40px 20px", 
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: "#333"
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* ヘッダーエリア */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1e293b", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>
            🤖 AI Recommendation App
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "1.1rem" }}>GCP × Python フルスタックシステム</p>
        </div>

        {/* 🔒 1. ログインしていない場合の画面 */}
        {!loginUser ? (
          <div style={{ 
            background: "#ffffff", 
            padding: "40px 30px", 
            borderRadius: "16px", 
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0"
          }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1.4rem", color: "#0f172a", textAlign: "center" }}>
              {isLoginMode ? "🔑 アカウントにログイン" : "📝 新規アカウント登録"}
            </h3>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>メールアドレス</label>
                <input 
                  type="email" 
                  placeholder="example@email.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  style={{ width: "100%", padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "1rem", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>パスワード</label>
                <input 
                  type="password" 
                  placeholder="6文字以上のパスワード"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength="6"
                  style={{ width: "100%", padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "1rem", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "1.1rem", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>
                {isLoginMode ? "ログインする" : "新規登録する"}
              </button>
            </form>
            <hr style={{ margin: "30px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", cursor: "pointer", fontSize: "0.95rem" }}>
                {isLoginMode ? "💡 まだアカウントをお持ちでない方はこちら" : "🔑 すでにアカウントをお持ちの方はこちら"}
              </button>
            </div>
          </div>
        ) : (
          // 🔓 2. ログインに成功している場合のダッシュボード画面
          <div>
            {/* ユーザー情報ヘッダーバー */}
            <div style={{ 
              background: "#e2e8f0", 
              padding: "12px 20px", 
              borderRadius: "12px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: "30px"
            }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155" }}>
                👤 ログイン中: <strong style={{ color: "#0f172a" }}>{loginUser.email}</strong>
              </span>
              <button 
                type="button" 
                onClick={() => { setLoginUser(null); alert("ログアウトしました"); }}
                style={{ background: "#ffffff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                ログアウト
              </button>
            </div>

            {/* 商品出品カード */}
            <div style={{ 
              background: "#ffffff", 
              padding: "30px", 
              borderRadius: "16px", 
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              marginBottom: "35px"
            }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "1.3rem", color: "#0f172a" }}>
                🎁 商品を出品する（商品情報入力）
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>商品名</label>
                  <input 
                    type="text" 
                    placeholder="例: 中古のゲーム機"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    style={{ width: "100%", padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "1rem", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>価格 (円)</label>
                  <input 
                    type="number" 
                    placeholder="金額を入力"
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    required 
                    style={{ width: "100%", padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "1rem", boxSizing: "border-box" }}
                  />
                </div>
                <button type="submit" style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "1.1rem", fontWeight: "600", cursor: "pointer" }}>
                  出品する！
                </button>
              </form>
            </div>

            {/* AIレコメンド商品表示エリア */}
            <div style={{ marginBottom: "35px" }}>
              <h3 style={{ margin: "0 0 15px 10px", fontSize: "1.2rem", color: "#059669", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🧠</span> AIによるあなたへの特別レコメンド
              </h3>
              {recommendations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", background: "#fff", borderRadius: "16px", color: "#64748b", border: "1px dashed #cbd5e1" }}>
                  商品を登録すると、AIが自動的に分析しておすすめを表示します。
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {recommendations.map((rec) => (
                    <div key={rec.id} style={{ 
                      background: "linear-gradient(to right, #f0fdf4, #ffffff)", 
                      padding: "16px 20px", 
                      borderRadius: "12px", 
                      border: "1px solid #bbf7d0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "700", fontSize: "1.05rem", color: "#14532d" }}>{rec.name}</span>
                        <span style={{ color: "#16a34a", fontWeight: "700" }}>{rec.price.toLocaleString()} 円</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#15803d", backgroundColor: "#dcfce7", padding: "4px 8px", borderRadius: "6px", width: "fit-content", fontWeight: "500" }}>
                        💡 AI推薦理由: {rec.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 出品済みリストエリア */}
            <div>
              <h3 style={{ margin: "0 0 15px 10px", fontSize: "1.2rem", color: "#0f172a", fontWeight: "700" }}>
                📋 出品済みの商品 ({items.length})
              </h3>
              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "#fff", borderRadius: "16px", color: "#64748b" }}>
                  出品されている商品はまだありません。
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ 
                      background: "#ffffff", 
                      padding: "16px 20px", 
                      borderRadius: "12px", 
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ 
                          fontWeight: "600", 
                          fontSize: "1.1rem", 
                          color: item.is_sold ? "#94a3b8" : "#1e293b",
                          textDecoration: item.is_sold ? "line-through" : "none"
                        }}>
                          {item.name}
                        </span>
                        <span style={{ 
                          color: item.is_sold ? "#94a3b8" : "#059669", 
                          fontWeight: "700", 
                          fontSize: "1rem" 
                        }}>
                          {item.price.toLocaleString()} 円
                        </span>
                      </div>
                      
                      {/* ボタン設置エリア */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        
                        {/* ★新設：いいね！ボタン */}
                        <button
                          onClick={() => handleLike(item)}
                          style={{
                            background: "none",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: item.is_liked ? "#fff1f2" : "#f8fafc",
                            borderColor: item.is_liked ? "#fecdd3" : "#e2e8f0",
                            color: item.is_liked ? "#e11d48" : "#64748b",
                            transition: "all 0.2s"
                          }}
                        >
                          {item.is_liked ? "❤️" : "🖤"} {item.like_count || 0}
                        </button>

                        {/* 購入ボタン */}
                        {item.is_sold ? (
                          <span style={{ 
                            background: "#f1f5f9", 
                            color: "#64748b", 
                            borderRadius: "8px", 
                            padding: "8px 14px", 
                            fontSize: "0.85rem", 
                            fontWeight: "700",
                            border: "1px solid #cbd5e1"
                          }}>
                            🔒 SOLD OUT
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleBuy(item)} 
                            style={{ 
                              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
                              color: "white", 
                              border: "none", 
                              borderRadius: "8px", 
                              padding: "8px 14px", 
                              cursor: "pointer", 
                              fontSize: "0.85rem", 
                              fontWeight: "600",
                              boxShadow: "0 2px 4px rgba(37,99,235,0.1)"
                            }}
                          >
                            🛒 購入する
                          </button>
                        )}

                        <button 
                          onClick={() => handleDelete(item)} 
                          style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}
                        >
                          🗑️ 削除
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;