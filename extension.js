/* --- Tactical OS Extension v1.2: No-Reload Delete Feature --- */

// 1. スタイルの注入
const extensionStyle = document.createElement('style');
extensionStyle.innerHTML = `
    #plot-btn, #list-btn {
        position: absolute; z-index: 3000; background: rgba(0, 40, 0, 0.9); 
        color: #00ff00; border: 2px solid #00ff00; font-family: monospace; 
        font-weight: bold; border-radius: 5px; cursor: pointer; display: none;
    }
    .mode-map #plot-btn, .mode-map #list-btn { display: block; }
    #plot-btn { bottom: 30px; right: 20px; padding: 12px 16px; }
    #list-btn { bottom: 30px; left: 120px; padding: 12px 16px; }

    #plot-list-panel {
        position: fixed; top: 10%; left: 5%; width: 90%; height: 80%;
        background: rgba(0, 10, 0, 0.95); border: 2px solid #00ff00;
        z-index: 5000; display: none; flex-direction: column; padding: 15px; box-sizing: border-box;
    }
    #plot-list-content { overflow-y: auto; flex-grow: 1; margin-bottom: 15px; }
    .plot-item { border-bottom: 1px dashed #004400; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; }
    .plot-info { font-size: 0.8rem; color: #00ff00; }
    .del-btn { background: #440000; color: #ff0000; border: 1px solid #ff0000; padding: 5px 10px; cursor: pointer; }
    .close-list { background: #00ff00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
    .leaflet-popup-content-wrapper { background: #000; color: #00ff00; border: 1px solid #00ff00; font-family: monospace; }
`;
document.head.appendChild(extensionStyle);

// 2. UI要素の作成
const plotBtn = document.createElement('div');
plotBtn.id = 'plot-btn'; plotBtn.innerText = 'MARK CENTER';
document.body.appendChild(plotBtn);

const listBtn = document.createElement('div');
listBtn.id = 'list-btn'; listBtn.innerText = 'LIST';
document.body.appendChild(listBtn);

const listPanel = document.createElement('div');
listPanel.id = 'plot-list-panel';
listPanel.innerHTML = `
    <h3 style="margin-top:0; border-bottom:1px solid #00ff00; color:#00ff00;">PLOT HISTORY</h3>
    <div id="plot-list-content"></div>
    <button class="close-list" onclick="document.getElementById('plot-list-panel').style.display='none'">CLOSE</button>
`;
document.body.appendChild(listPanel);

// 3. データ管理ロジック
let savedPlots = JSON.parse(localStorage.getItem('tactical_plots') || '[]');
let markersOnMap = []; // 地図上のマーカーを管理する配列

// マーカーを地図に追加する共通関数
function addMarkerToMap(p, index) {
    if (typeof map === 'undefined') return;
    const marker = L.marker([p.lat, p.lng]).addTo(map);
    marker.bindPopup(`<b>#${index + 1}</b><br>MGRS: ${p.mgrs}<br>RANGE: ${p.dist || '---'}`);
    markersOnMap.push(marker); // 配列に保存しておく
}

// 保存されているプロットを復元
function restorePlots() {
    markersOnMap.forEach(m => map.removeLayer(m)); // 一旦全部消す
    markersOnMap = [];
    savedPlots.forEach((p, index) => {
        addMarkerToMap(p, index);
    });
}

// プロット実行
plotBtn.onclick = function() {
    if (typeof map === 'undefined' || !map) return;
    const center = map.getCenter();
    const mCode = mgrs.forward([center.lng, center.lat]);
    let dStr = "---";
    if (typeof selfPos !== 'undefined' && selfPos) {
        dStr = `${Math.round(L.latLng(selfPos).distanceTo(center))} m`;
    }

    const newPlot = { lat: center.lat, lng: center.lng, mgrs: mCode, dist: dStr };
    savedPlots.push(newPlot);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    
    addMarkerToMap(newPlot, savedPlots.length - 1);
};

// リスト表示・更新
function updateListUI() {
    const container = document.getElementById('plot-list-content');
    container.innerHTML = '';
    savedPlots.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'plot-item';
        item.innerHTML = `
            <div class="plot-info">
                <b>#${i+1}</b> [${p.dist}]<br>${p.mgrs}
            </div>
            <button class="del-btn" onclick="deletePlot(${i})">DEL</button>
        `;
        container.appendChild(item);
    });
}

listBtn.onclick = function() {
    updateListUI();
    listPanel.style.display = 'flex';
};

// 削除機能（リロードなし）
window.deletePlot = function(index) {
    // 1. 地図から該当のマーカーを消去
    if (markersOnMap[index]) {
        map.removeLayer(markersOnMap[index]);
    }
    
    // 2. データから削除
    savedPlots.splice(index, 1);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    
    // 3. マーカー管理配列を再同期
    restorePlots();
    
    // 4. リストUIを更新
    updateListUI();
};

// 初回起動時の読み込み待ち
const checkMapInterval = setInterval(() => {
    if (typeof map !== 'undefined' && map) {
        restorePlots();
        clearInterval(checkMapInterval);
    }
}, 1000);
