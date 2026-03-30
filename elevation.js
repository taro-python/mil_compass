/* --- Tactical OS: Elevation Module (GSI-API Unit) --- */
const GSI = {
    getAlt: function(lat, lon, elementId) {
        const el = document.getElementById(elementId);
        if (!el || !lat || !lon) return;

        // 既存のリクエストがあれば削除
        const old = document.getElementById('gsi-script-' + elementId);
        if (old) old.remove();

        // コールバック関数名を定義
        const cbName = 'gsi_jsonp_' + elementId.replace('-', '_');

        // サーバーからのデータを受け取った時の処理
        window[cbName] = function(data) {
            if (data && data.elevation !== undefined && data.elevation !== "-----") {
                el.innerText = Math.round(data.elevation) + "m";
                el.style.color = "#00ffff"; // 成功：水色
            } else {
                el.innerText = "圏外"; // 海上など
                el.style.color = "#ff8800";
            }
            delete window[cbName];
        };

        // 国土地理院の最新API(JSONP版)へリクエスト
        const script = document.createElement('script');
        script.id = 'gsi-script-' + elementId;
        // URLの末尾に callback= を付けることでCORSエラーを回避します
        script.src = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lon.toFixed(6)}&lat=${lat.toFixed(6)}&callback=${cbName}`;
        
        script.onerror = () => {
            el.innerText = "通信エラー";
            el.style.color = "#ff0000";
        };

        document.body.appendChild(script);
    }
};
console.log("Elevation Module: Loaded");
