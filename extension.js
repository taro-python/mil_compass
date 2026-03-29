/* --- Tactical OS Extension v1.7: Lower Right-Side UI (Position Adjusted) --- */

const extensionStyle = document.createElement('style');
extensionStyle.innerHTML = `
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

    /* --- 右下ボタンの配置調整 --- */
    /* 全体的に下にスライドさせました（間隔55px） */
    #list-btn  { bottom: 65px;  right: 15px; }                   
    #input-btn { bottom: 120px; right: 15px; }                   
    #plot-btn  { bottom: 175px; right: 15px; border-width: 2px; } 

    .ext-panel {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 85%; max-width: 350px; max-height: 80vh;
        background: #050a05; border: 1px solid #00ff00;
        z-index: 5000; display: none; flex-direction: column; padding: 20px;
        box-shadow: 0 0 30px rgba(0, 255, 0, 0.3); color: #00ff00;
    }
    .ext-input { 
        background: #000; color: #00ff00; border: 1px solid #004400; 
        width: 100%; padding: 12px; margin: 10px 0; font-family: monospace; outline: none; box-sizing: border-box;
    }
    .mark-select { display: flex; gap: 5px; margin: 10px 0; }
    .mark-opt { border: 1px solid #004400; padding: 10px; flex: 1; text-align: center; cursor: pointer; }
    .mark-opt.active { border-color: #00ff00; background: rgba(0,255,0,0.1); }

    .leaflet-popup-content-wrapper { 
        background: #000 !important; color: #00ff00 !important; 
        border: 1px solid #00ff00; border-radius: 0; font-family: monospace; 
    }
    .leaflet-popup-tip { background: #00ff00 !important; }
    
    .custom-marker-html {
        display: flex; align-items: center; justify-content: center;
        color: #ff0000; font-size: 22px; font-weight: bold;
        text-shadow: 0 0 4px #000;
    }
`;
document.head.appendChild(extensionStyle);

document.body.insertAdjacentHTML('beforeend', `
    <div id="plot-btn" class="t-btn">MARK<br>CENTER</div>
    <div id="input-btn" class="t-btn">MANUAL<br>INPUT</div>
    <div id="list-btn" class="t-btn">LOG<br>LIST</div>

    <div id="input-panel" class="ext-panel">
        <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">MANUAL PLOT</div>
        <label style="font-size:10px;">NAME / ID</label>
        <input type="text" id="m-name" class="ext-input" placeholder="OBJECTIVE-A">
        <label style="font-size:10px;">MGRS COORD</label>
        <input type="text" id="m-coord" class="ext-input" placeholder="54TUK12345678">
        <label style="font-size:10px;">MARK TYPE</label>
        <div class="mark-select">
            <div class="mark-opt active" onclick="selMark(this,'●')">●</div>
            <div class="mark-opt" onclick="selMark(this,'▲')">▲</div>
            <div class="mark-opt" onclick="selMark(this,'■')">■</div>
            <div class="mark-opt" onclick="selMark(this,'×')">×</div>
        </div>
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button class="t-btn" style="position:static; display:block; flex:1; width:auto; background:#004400;" onclick="execManualPlot()">PLOT</button>
            <button class="t-btn" style="position:static; display:block; flex:1; width:auto; border-color:#444; color:#888;" onclick="closePanel('input-panel')">ABORT</button>
        </div>
    </div>

    <div id="plot-list-panel" class="ext-panel">
        <div style="font-size:14px; margin-bottom:15px; border-bottom:1px solid #00ff00; padding-bottom:5px;">TACTICAL LOG</div>
        <div id="plot-list-content" style="overflow-y:auto; flex-grow:1; max-height:50vh;"></div>
        <button class="t-btn" style="position:static; display:block; width:100%; margin-top:15px;" onclick="closePanel('plot-list-panel')">RETURN</button>
    </div>
`);

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
        className: 'custom-marker-html',
        html: `<div>${p.mark || '●'}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    const marker = L.marker([p.lat, p.lng], {icon: icon}).addTo(map);
    marker.bindPopup(`<b>${p.name || 'PT'}</b><br>MGRS: ${p.mgrs}<br>RNG: ${p.dist || '---'}`);
    markersOnMap.push(marker);
}

function restorePlots() {
    markersOnMap.forEach(m => map.removeLayer(m));
    markersOnMap = [];
    savedPlots.forEach((p, index) => addMarkerToMap(p, index));
}

document.getElementById('plot-btn').onclick = () => {
    const name = prompt("IDENTIFIER:", "PT-" + (savedPlots.length + 1));
    if (!name) return;
    const center = map.getCenter();
    const mCode = mgrs.forward([center.lng, center.lat]);
    saveAndPlot(center.lat, center.lng, mCode, name, '●');
};

document.getElementById('input-btn').onclick = () => document.getElementById('input-panel').style.display = 'flex';

window.execManualPlot = () => {
    const name = document.getElementById('m-name').value || "MANUAL-PT";
    const coord = document.getElementById('m-coord').value.trim();
    try {
        const decoded = mgrs.toPoint(coord);
        saveAndPlot(decoded[1], decoded[0], coord, name, selectedMark);
        closePanel('input-panel');
        document.getElementById('m-name').value = '';
        document.getElementById('m-coord').value = '';
        map.setView([decoded[1], decoded[0]], 17);
    } catch(e) { alert("INVALID MGRS"); }
};

function saveAndPlot(lat, lng, mgrs, name, mark) {
    let dStr = "---";
    if (typeof selfPos !== 'undefined' && selfPos) {
        dStr = `${Math.round(L.latLng(selfPos).distanceTo([lat, lng]))}m`;
    }
    const newPlot = { lat, lng, mgrs, name, mark, dist: dStr };
    savedPlots.push(newPlot);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    addMarkerToMap(newPlot, savedPlots.length - 1);
}

document.getElementById('list-btn').onclick = () => {
    const container = document.getElementById('plot-list-content');
    container.innerHTML = '';
    savedPlots.forEach((p, i) => {
        container.innerHTML += `
            <div style="border-bottom:1px solid #002200; padding:10px 0; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:11px;">
                    <span style="color:#00ff00; font-weight:bold;">${p.mark} ${p.name}</span> <span style="color:#888;">(${p.dist})</span><br>
                    <span style="color:#aaa;">${p.mgrs}</span>
                </div>
                <button onclick="deletePlot(${i})" style="background:none; border:1px solid #440000; color:#ff0000; padding:4px 8px; font-size:10px; cursor:pointer;">DEL</button>
            </div>`;
    });
    document.getElementById('plot-list-panel').style.display = 'flex';
};

window.deletePlot = (index) => {
    savedPlots.splice(index, 1);
    localStorage.setItem('tactical_plots', JSON.stringify(savedPlots));
    restorePlots();
    document.getElementById('list-btn').click();
};

const checkMapInterval = setInterval(() => {
    if (typeof map !== 'undefined' && map) { restorePlots(); clearInterval(checkMapInterval); }
}, 1000);
