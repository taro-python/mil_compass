/* --- Tactical OS Extension: P2P Calculator (Distance & Bearing) --- */

(function() {
    // 1. スタイルの追加
    const style = document.createElement('style');
    style.innerHTML = `
        .p2p-panel-content { display: flex; flex-direction: column; gap: 10px; }
        .p2p-select { 
            background: #000; color: #00ff00; border: 1px solid #004400; 
            width: 100%; padding: 10px; font-family: monospace; outline: none;
        }
        .result-box {
            background: rgba(0, 30, 0, 0.9); border: 1px solid #00ff00;
            padding: 15px; margin-top: 10px; font-family: 'Courier New', monospace;
        }
        .result-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .result-val { color: #ffff00; font-weight: bold; }
        
        /* メニュー項目のスタイル */
        .custom-menu-item {
            cursor: pointer; padding: 12px; border-bottom: 1px solid #003300;
            color: #00ff00; font-family: monospace; font-size: 13px;
        }
        .custom-menu-item:hover { background: rgba(0, 255, 0, 0.1); }
    `;
    document.head.appendChild(style);

    // 2. 専用パネルのHTML追加
    document.body.insertAdjacentHTML('beforeend', `
        <div id="p2p-calc-panel" class="ext-panel">
            <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">P2P NAV CALCULATOR</div>
            
            <div class="p2p-panel-content">
                <label style="font-size:10px;">FROM (START POINT)</label>
                <select id="p2p-from" class="p2p-select"></select>

                <label style="font-size:10px;">TO (TARGET POINT)</label>
                <select id="p2p-to" class="p2p-select"></select>

                <div id="p2p-result" class="result-box">
                    <div class="result-line"><span>DISTANCE:</span> <span id="res-dist" class="result-val">---</span></div>
                    <div class="result-line"><span>AZIMUTH:</span> <span id="res-azimuth" class="result-val">---</span></div>
                </div>

                <button class="t-btn" style="position:static; display:block; width:100%; margin-top:10px;" onclick="closePanel('p2p-calc-panel')">CLOSE</button>
            </div>
        </div>
    `);

    const initP2PModule = () => {
        // 既存のメニュー構造を探す (Tactical OSのサイドメニュー)
        const menu = document.querySelector('.menu-content');
        if (!menu) {
            setTimeout(initP2PModule, 500);
            return;
        }

        // メニューにボタンを追加
        const menuItem = document.createElement('div');
        menuItem.className = 'custom-menu-item';
        menuItem.innerHTML = '＞ P2P NAV CALCULATOR';
        menuItem.onclick = () => {
            updateSelectOptions();
            document.getElementById('p2p-calc-panel').style.display = 'flex';
            if(window.closeMenu) window.closeMenu(); 
        };
        menu.appendChild(menuItem);

        // セレクトボックスが変更されたら再計算
        document.getElementById('p2p-from').onchange = calculateP2P;
        document.getElementById('p2p-to').onchange = calculateP2P;
    };

    // 保存されているリストからセレクトボックスを更新
    function updateSelectOptions() {
        const fromSel = document.getElementById('p2p-from');
        const toSel = document.getElementById('p2p-to');
        
        // localStorageから最新のプロットリストを取得
        const currentPlots = JSON.parse(localStorage.getItem('tactical_plots') || '[]');
        
        const options = currentPlots.map((p, i) => `<option value="${i}">${p.mark} ${p.name}</option>`).join('');
        fromSel.innerHTML = options;
        toSel.innerHTML = options;
        
        if (currentPlots.length >= 2) {
            toSel.selectedIndex = 1; // 最初から2番目を選択状態にする
            calculateP2P();
        }
    }

    // 距離と方位角の計算
    function calculateP2P() {
        const currentPlots = JSON.parse(localStorage.getItem('tactical_plots') || '[]');
        const idxFrom = document.getElementById('p2p-from').value;
        const idxTo = document.getElementById('p2p-to').value;

        if (!currentPlots[idxFrom] || !currentPlots[idxTo] || idxFrom === idxTo) {
            document.getElementById('res-dist').innerText = "---";
            document.getElementById('res-azimuth').innerText = "---";
            return;
        }

        const p1 = L.latLng(currentPlots[idxFrom].lat, currentPlots[idxFrom].lng);
        const p2 = L.latLng(currentPlots[idxTo].lat, currentPlots[idxTo].lng);

        // 1. 距離計算 (Leaflet標準)
        const distance = p1.distanceTo(p2);
        const distStr = distance > 1000 ? (distance/1000).toFixed(2) + " km" : Math.round(distance) + " m";

        // 2. 方位角計算 (真北基準)
        let angle = (Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI);
        if (angle < 0) angle += 360; // 0-360度に補正
        
        // ミル(MIL)表記も追加（タクティカル用途）
        const mil = Math.round(angle * (6400 / 360));

        document.getElementById('res-dist').innerText = distStr;
        document.getElementById('res-azimuth').innerText = `${Math.round(angle)}° (${mil} MIL)`;
    }

    // 起動
    initP2PModule();
})();
