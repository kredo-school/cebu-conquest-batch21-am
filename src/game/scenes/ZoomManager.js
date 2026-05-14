const LOD_LEVELS = [
  { maxZoom: 1.5, type: "islandName" },
  { maxZoom: 2.5, type: "areaName" },
  { maxZoom: 3.5, type: "districtName" },
  { maxZoom: Infinity, type: "spotName" },
];

export default class ZoomManager {
  constructor() {
    this._lod = null;
    this._hoveredId = null;
  }

  getLodType(zoom) {
    for (const { maxZoom, type } of LOD_LEVELS) {
      if (zoom < maxZoom) return type;
    }
    return "spotName";
  }

  /** MainScene.update() から毎フレーム呼ぶ。LODが変わった時だけラベルを更新する */
  tick(zoom, districts) {
    const newLod = this.getLodType(zoom);
    if (newLod === this._lod) return;
    this._lod = newLod;
    this._refreshLabels(districts);
  }

  /** pointermove のホバー変化を反映する */
  setHover(hoveredId, districts) {
    if (this._hoveredId === hoveredId) return;
    this._hoveredId = hoveredId;
    this._refreshLabels(districts);
  }

  _refreshLabels(districts) {
    const lod = this._lod;
    const hoveredId = this._hoveredId;
    Object.values(districts).forEach((d) => {
      if (!d.textLabel) return;

      // spot 以外のラベルは常に非表示
      if (d.type !== 'spotName') {
        d.textLabel.setVisible(false);
        return;
      }

      // spot: LOD が spotName のとき、またはホバー時に表示
      const isHovered = d.id === hoveredId;
      d.textLabel.setVisible(d.type === lod || isHovered);
      d.textLabel.setScale(isHovered ? 1.2 : 1.0);
    });
  }
}
