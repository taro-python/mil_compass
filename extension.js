/* --- Tactical OS: All-in-One Extension Pack (v2.0) --- */

(function() {
    // --- 1. スタイル設定 (UIデザイン) ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* 共通ボタンスタイル */
        .t-btn {
            position: absolute; z-index: 3000; display: none;
            background: rgba(0, 20, 0, 0.85); color: #00ff00;
            border: 1px solid #00ff00; font-family: 'Courier New', monospace;
            font-weight: bold; font-size: 11px; cursor: pointer;
            padding: 10px 5px; text-transform: uppercase;
            letter-spacing: 1px; width: 90px; text-align: center;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
        }
        .t-btn:active { background: #00ff00; color: #000; }
        .mode-map .t-btn { display: block; }

        /* 右下ボタンの配置 (PLOT系) */
        #list-btn  { bottom: 65px;  right: 15px; }                   
        #input-btn { bottom: 120px; right: 15px; }                   
        #plot-btn  { bottom: 175px; right: 15px; border-width: 2px; } 

        /* パネル（画面）スタイル */
        .ext-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 85%; max-width: 350px; max-height: 80vh;
            background: #050a05; border: 1px solid #00ff00;
            z-index: 5000; display: none; flex-direction: column; padding: 20px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3); color: #00ff00;
        }
        .ext-input, .p2p-select { 
            background: #000; color: #00ff00; border: 1px solid #004400; 
            width: 100%; padding: 12px; margin: 10px 0; font-family: monospace; outline: none; box-sizing: border-box;
        }
        
        /* P2P計算結果表示 */
        .result-box {
            background: rgba(0, 30, 0, 0.9); border: 1px solid #00ff00;
            padding: 15px; margin-top: 10px; font-family: 'Courier New', monospace;
        }
        .result-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .result-val { color: #ffff00; font-weight: bold; }

        /* メニュー項目のスタイル */
        .custom-menu-item {
            cursor: pointer; padding: 15px; border-bottom: 1px solid #003300;
            color: #00ff00; font-family: 'Courier New', monospace; font-size: 13px;
            text-align: left; background: none; width: 100%; box-sizing: border-box;
        }
        .custom-menu-item:hover { background: rgba(0, 255, 0, 0.2); }

        /* マーカーとポップアップ */
        .custom-marker-html {
            display: flex; align-items: center; justify-content: center;
            color: #ff0000; font-size: 22px; font-weight: bold; text-shadow: 0 0 4px #000;
        }
        .leaflet-popup-content-wrapper { background: #000 !important; color: #00ff00 !important; border: 1px solid #00ff00; border-radius: 0; }
        .leaflet-popup-tip { background: #00ff00 !important; }
    `;
    document.head.appendChild(style);

    // --- 2. HTML要素の生成 ---
    document.body.insertAdjacentHTML('beforeend', `
        <div id="plot-btn" class="t-btn">MARK<br>CENTER</div>
        <div id="input-btn" class="t-btn">MANUAL<br>INPUT</div>
        <div id="list-btn" class="t-btn">LOG<br>LIST</div>

        <div id="input-panel" class="ext-panel">
            <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">MANUAL PLOT</div>
            <input type="text" id="m-name" class="ext-input" placeholder="OBJECTIVE NAME">
            <input type="text" id="m-coord" class="ext-input" placeholder="MGRS COORD">
            <div style="display:flex; gap:10px;">
                <button class="t-btn" style="position:static; flex:1; width:auto; background:#004400;" onclick="execManualPlot()">PLOT</button>
                <button class="t-btn" style="position:static; flex:1; width:auto; border-color:#444;" onclick="closePanel('input-panel')">ABORT</button>
            </div>
        </div>

        <div id="plot-list-panel" class="ext-panel">
            <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">TACTICAL LOG</div>
            <div id="plot-list-content" style="overflow-y:auto; flex-grow:1; max-height:50vh;"></div>
            <button class="t-btn" style="position:static; width:100%; margin-top:15px;" onclick="closePanel('plot-list-panel')">RETURN</button>
        </div>

        <div id="p2p-calc-panel" class="ext-panel">
            <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">P2P NAV CALCULATOR</div>
            <label style="font-size:10px;">FROM (START)</label>
            <select id="p2p-from" class="p2p-select"></select>
            <label style="font-size:10px;">TO (TARGET)</label>
            <select id="p2p-to" class="p2p-select"></select>
            <div class="result-box">
                <div class="result-line"><span>DISTANCE:</span> <span id="res-dist" class="result-val">---</span></div>
                <div class="result-line"><span>AZIMUTH:</span> <span id="res-azimuth" class="result-val">---</span></div>
            </div>
            <button class="t-btn" style="position:static; width:100%; margin-top:15px;" onclick="closePanel('p2p-calc-panel')">CLOSE</button>
        </div>
    `);

    // --- 3. ロジック変数 ---
    let savedPlots = JSON.parse(localStorage.getItem('tactical_plots') || '[]');
    let markersOnMap = [];

    // --- 4. 関数定義 ---
    window.closePanel = (id) => document.getElementById(id).style.display = 'none';

    function addMarkerToMap(p) {
        if (typeof map === 'undefined') return;
        const icon = L.divIcon({ className: 'custom-marker-html', html: `<div>●</div>`, iconSize: [30, 30] });
        const marker = L.marker([p.lat, p.lng], {icon: icon}).addTo(map);
        marker.bindPopup(`<b>${p.name}</b><br>MGRS: ${p.mgrs}<br>RNG: ${p.dist}`);
        markersOnMap.push(marker);
    }

    function restorePlots() {
        markersOnMap.forEach(m => map.removeLayer(m));
        markersOnMap = [];
        savedPlots.forEach(p => addMarkerToMap(p));
    }

    function saveAndPlot(lat, lng, mgrs, name) {
        let dStr = "---";
        if (typeof selfPos !== 'undefined' && selfPos) {
            dStr = `${Math.round(L.latLng(selfPos).distanceTo([lat, lng]))}m`;
        }
        const newPlot = { lat, lng, mgrs, name, dist: dStr };
        savedPlots.push(newPlot);
        localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
        addMarkerToMap(newPlot);
    }

    window.execManualPlot = () => {
        const name = document.getElementById('m-name').value || "MANUAL-PT";
        const coord = document.getElementById('m-coord').value.trim();
        try {
            const decoded = mgrs.toPoint(coord);
            saveAndPlot(decoded[1], decoded[0], coord, name);
            closePanel('input-panel');
            map.setView([decoded[1], decoded[0]], 17);
        } catch(e) { alert("INVALID MGRS"); }
    };

    function calculateP2P() {
        const fromIdx = document.getElementById('p2p-from').value;
        const toIdx = document.getElementById('p2p-to').value;
        if (fromIdx === toIdx) return;

        const p1 = L.latLng(savedPlots[fromIdx].lat, savedPlots[fromIdx].lng);
        const p2 = L.latLng(savedPlots[toIdx].lat, savedPlots[toIdx].lng);
        
        const dist = p1.distanceTo(p2);
        let angle = (Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI);
        if (angle < 0) angle += 360;

        document.getElementById('res-dist').innerText = dist > 1000 ? (dist/1000).toFixed(2) + " km" : Math.round(dist) + " m";
        document.getElementById('res-azimuth').innerText = `${Math.round(angle)}° (${Math.round(angle * 17.7777)} MIL)`;
    }

    // --- 5. イベント設定 ---
    document.getElementById('plot-btn').onclick = () => {
        const name = prompt("IDENTIFIER:", "PT-" + (savedPlots.length + 1));
        if (!name) return;
        const center = map.getCenter();
        const mCode = mgrs.forward([center.lng, center.lat]);
        saveAndPlot(center.lat, center.lng, mCode, name);
    };

    document.getElementById('input-btn').onclick = () => document.getElementById('input-panel').style.display = 'flex';

    document.getElementById('list-btn').onclick = () => {
        const container = document.getElementById('plot-list-content');
        container.innerHTML = savedPlots.map((p, i) => `
            <div style="border-bottom:1px solid #002200; padding:10px 0; display:flex; justify-content:space-between;">
                <div style="font-size:11px;"><b>${p.name}</b> (${p.dist})<br><span style="color:#888;">${p.mgrs}</span></div>
                <button onclick="deletePlot(${i})" style="background:none; border:1px solid #440000; color:#ff0000; cursor:pointer;">DEL</button>
            </div>
        `).join('');
        document.getElementById('plot-list-panel').style.display = 'flex';
    };

    window.deletePlot = (i) => {
        savedPlots.splice(i, 1);
        localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
        restorePlots();
        document.getElementById('list-btn').click();
    };

    // --- 6. メニューインジェクション ---
    const injectMenu = () => {
        const menuHeader = Array.from(document.querySelectorAll('div')).find(el => el.innerText === "TACTICAL MENU");
        if (menuHeader && menuHeader.parentElement) {
            const container = menuHeader.parentElement;
            if (container.querySelector('.p2p-trigger')) return;

            const menuItem = document.createElement('div');
            menuItem.className = 'custom-menu-item p2p-trigger';
            menuItem.innerHTML = '＞ P2P NAV CALCULATOR';
            menuItem.onclick = () => {
                const options = savedPlots.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
                document.getElementById('p2p-from').innerHTML = options;
                document.getElementById('p2p-to').innerHTML = options;
                document.getElementById('p2p-calc-panel').style.display = 'flex';
                // CLOSEボタンを探して閉じる
                const cb = Array.from(document.querySelectorAll('div')).find(e => e.innerText === "CLOSE");
                if(cb) cb.click();
            };
            container.appendChild(menuItem);
        }
        setTimeout(injectMenu, 1000);
    };

    document.getElementById('p2p-from').onchange = calculateP2P;
    document.getElementById('p2p-to').onchange = calculateP2P;

    // 起動チェック
    const checkReady = setInterval(() => {
        if (typeof map !== 'undefined' && map) {
            restorePlots();
            injectMenu();
            clearInterval(checkReady);
        }
    }, 1000);
})();
