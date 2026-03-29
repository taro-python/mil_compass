/* --- Tactical OS Extension v1.3: Manual Input & Custom Markers --- */

// 1. スタイルの注入
const extensionStyle = document.createElement('style');
extensionStyle.innerHTML = `
    #plot-btn, #list-btn, #input-btn {
        position: absolute; z-index: 3000; background: rgba(0, 40, 0, 0.9); 
        color: #00ff00; border: 2px solid #00ff00; font-family: monospace; 
        font-weight: bold; border-radius: 5px; cursor: pointer; display: none;
    }
    .mode-map #plot-btn, .mode-map #list-btn, .mode-map #input-btn { display: block; }
    #plot-btn { bottom: 30px; right: 20px; padding: 12px 16px; }
    #input-btn { bottom: 30px; right: 160px; padding: 12px 16px; }
    #list-btn { bottom: 30px; left: 120px; padding: 12px 16px; }

    /* 入力・リストパネル共通 */
    .ext-panel {
        position: fixed; top: 10%; left: 5%; width: 90%; height: 80%;
        background: rgba(0, 15, 0, 0.98); border: 2px solid #00ff00;
        z-index: 5000; display: none; flex-direction: column; padding: 15px; box-sizing: border-box; color: #00ff00;
    }
    .ext-input { background: #000; color: #00ff00; border: 1px solid #00ff00; width: 100%; padding: 10px; margin: 10px 0; font-family: monospace; }
    .mark-select { display: flex; gap: 10px; margin: 10px 0; }
    .mark-opt { border: 1px solid #00ff00; padding: 10px; flex: 1; text-align: center; cursor: pointer; }
    .mark-opt.active { background: #00ff00; color: #000; }
    
    #plot-list-content { overflow-y: auto; flex-grow: 1; }
    .plot-item { border-bottom: 1px dashed #004400; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; }
    .del-btn { background: #440000; color: #ff0000; border: 1px solid #ff0000; padding: 5px 10px; }
    .btn-row { display: flex; gap: 10px; margin-top: 10px; }
    .primary-btn { background: #00ff00; color: #000; border: none; padding: 12px; font-weight: bold; flex: 1; }
`;
document.head.appendChild(extensionStyle);

// 2. UI要素の作成
document.body.insertAdjacentHTML('beforeend', `
    <div id="plot-btn">MARK CENTER</div>
    <div id="input-btn">INPUT</div>
    <div id="list-btn">LIST</div>

    <div id="input-panel" class="ext-panel">
        <h3 style="border-bottom:1px solid #00ff00">MANUAL PLOT</h3>
        <label>NAME:</label>
        <input type="text" id="m-name" class="ext-input" placeholder="e.g. OBJECTIVE A">
        <label>MGRS (8 or 10 digits):</label>
        <input type="text" id="m-coord" class="ext-input" placeholder="e.g. 54TUK12345678">
        <label>MARK TYPE:</label>
        <div class="mark-select">
            <div class="mark-opt active" onclick="selMark(this,'●')">●</div>
            <div class="mark-opt" onclick="selMark(this,'▲')">▲</div>
            <div class="mark-opt" onclick="selMark(this,'■')">■</div>
            <div class="mark-opt" onclick="selMark(this,'×')">×</div>
        </div>
        <div class="btn-row">
            <button class="primary-btn" onclick="execManualPlot()">PLOT ON MAP</button>
            <button class="primary-btn" style="background:#444;color:#ccc" onclick="closePanel('input-panel')">CANCEL</button>
        </div>
    </div>

    <div id="plot-list-panel" class="ext-panel">
        <h3 style="border-bottom:1px solid #00ff00">PLOT HISTORY</h3>
        <div id="plot-list-content"></div>
        <button class="primary-btn" style="margin-top:10px" onclick="closePanel('plot-list-panel')">CLOSE</button>
    </div>
`);

// 3. ロジック
let savedPlots = JSON.parse(localStorage.getItem('tactical_plots') || '[]');
let markersOnMap = [];
let selectedMark = '●';

window.selMark = (el, m) => {
    document.querySelectorAll('.mark-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    selectedMark = m;
};

window.closePanel = (id) => document.getElementById(id).style.display = 'none';

function addMarkerToMap(p, index) {
    if (typeof map === 'undefined') return;
    const icon = L.divIcon({
        className: 'custom-mark',
        html: `<div style="color:#ff0000; font-size:20px; font-weight:bold; text-shadow: 0 0 3px #000; transform:translate(-50%,-50%)">${p.mark || '●'}</div>`,
        iconSize: [20, 20]
    });
    const marker = L.marker([p.lat, p.lng], {icon: icon}).addTo(map);
    marker.bindPopup(`<b>${p.name || 'POINT'}</b><br>MGRS: ${p.mgrs}<br>RANGE: ${p.dist || '---'}`);
    markersOnMap.push(marker);
}

function restorePlots() {
    markersOnMap.forEach(m => map.removeLayer(m));
    markersOnMap = [];
    savedPlots.forEach((p, index) => addMarkerToMap(p, index));
}

// 中心プロット
document.getElementById('plot-btn').onclick = () => {
    const name = prompt("NAME THIS POINT:", "POINT " + (savedPlots.length + 1));
    if (name === null) return;
    const center = map.getCenter();
    const mCode = mgrs.forward([center.lng, center.lat]);
    saveAndPlot(center.lat, center.lng, mCode, name, '●');
};

// 手動入力パネル表示
document.getElementById('input-btn').onclick = () => document.getElementById('input-panel').style.display = 'flex';

// 手動入力実行
window.execManualPlot = () => {
    const name = document.getElementById('m-name').value || "MANUAL PT";
    const coord = document.getElementById('m-coord').value.trim();
    try {
        const decoded = mgrs.toPoint(coord); // [lng, lat]
        saveAndPlot(decoded[1], decoded[0], coord, name, selectedMark);
        closePanel('input-panel');
        // 入力欄をクリア
        document.getElementById('m-name').value = '';
        document.getElementById('m-coord').value = '';
        // 描画地点へジャンプ
        map.setView([decoded[1], decoded[0]], 17);
    } catch(e) {
        alert("INVALID MGRS FORMAT\nUse: 54TUK12345678");
    }
};

function saveAndPlot(lat, lng, mgrs, name, mark) {
    let dStr = "---";
    if (typeof selfPos !== 'undefined' && selfPos) {
        dStr = `${Math.round(L.latLng(selfPos).distanceTo([lat, lng]))} m`;
    }
    const newPlot = { lat, lng, mgrs, name, mark, dist: dStr };
    savedPlots.push(newPlot);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    addMarkerToMap(newPlot, savedPlots.length - 1);
}

// リスト表示
document.getElementById('list-btn').onclick = () => {
    const container = document.getElementById('plot-list-content');
    container.innerHTML = '';
    savedPlots.forEach((p, i) => {
        container.innerHTML += `
            <div class="plot-item">
                <div style="font-size:0.8rem">
                    <b>${p.mark} ${p.name}</b> [${p.dist}]<br>${p.mgrs}
                </div>
                <button class="del-btn" onclick="deletePlot(${i})">DEL</button>
            </div>`;
    });
    document.getElementById('plot-list-panel').style.display = 'flex';
};

window.deletePlot = (index) => {
    savedPlots.splice(index, 1);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    restorePlots();
    document.getElementById('list-btn').click(); // リスト再描画
};

const checkMapInterval = setInterval(() => {
    if (typeof map !== 'undefined' && map) { restorePlots(); clearInterval(checkMapInterval); }
}, 1000);
