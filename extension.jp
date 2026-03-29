// マップモードの時だけボタンを表示するための制御
const style = document.createElement('style');
style.innerHTML = `
    #plot-btn {
        position: absolute; bottom: 30px; right: 20px; z-index: 3000;
        background: rgba(0, 68, 0, 0.9); color: #00ff00; border: 2px solid #00ff00;
        padding: 12px 16px; font-family: monospace; font-weight: bold;
        border-radius: 5px; cursor: pointer; display: none;
    }
    .mode-map #plot-btn { display: block; }
    .leaflet-popup-content-wrapper { background: #000; color: #00ff00; border: 1px solid #00ff00; font-family: monospace; }
`;
document.head.appendChild(style);

// ボタンの作成と配置
const plotBtn = document.createElement('div');
plotBtn.id = 'plot-btn';
plotBtn.innerText = 'MARK CENTER';
document.body.appendChild(plotBtn);

// プロット機能のロジック
plotBtn.onclick = function() {
    if(!map) return;
    const center = map.getCenter();
    const mCode = mgrs.forward([center.lng, center.lat]);
    let distStr = "---";
    if(selfPos) {
        const dist = L.latLng(selfPos).distanceTo(center);
        distStr = `${Math.round(dist)} m`;
    }
    const marker = L.marker(center).addTo(map);
    marker.bindPopup(`<b>POINT DATA</b><br>MGRS: ${mCode}<br>RANGE: ${distStr}`).openPopup();
};
