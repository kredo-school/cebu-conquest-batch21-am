import Phaser from "phaser";

export default class EffectManager {
  constructor(scene) {
    this.scene = scene;
  }

  playSlashEffect(x, y) {
    const scene = this.scene;
    const gfx = scene.add.graphics({ x, y }).setDepth(2000);
    const len = 50;
    const angles = [-45, 0, 45];

    angles.forEach((deg) => {
      const rad = Phaser.Math.DegToRad(deg);
      const cx = Math.cos(rad) * len;
      const cy = Math.sin(rad) * len;
      gfx.lineStyle(3, 0xffffff, 1);
      gfx.beginPath();
      gfx.moveTo(-cx, -cy);
      gfx.lineTo(cx, cy);
      gfx.strokePath();
    });

    scene.tweens.add({
      targets: gfx,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => gfx.destroy(),
    });
  }

  playExplosionEffect(x, y) {
    const scene = this.scene;
    const DEPTH = 2000;
    const colors = [0xff6600, 0xff9900, 0xffcc00, 0xff3300, 0xffffff];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(60, 120);
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const radius = Phaser.Math.Between(4, 8);
      const dot = scene.add.circle(x, y, radius, color).setDepth(DEPTH);

      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scaleX: 0.2,
        scaleY: 0.2,
        alpha: 0,
        duration: Phaser.Math.Between(400, 700),
        ease: "Power2",
        onComplete: () => dot.destroy(),
      });
    }

    const flash = scene.add.circle(x, y, 30, 0xffffff).setDepth(DEPTH - 1).setAlpha(0.8);
    scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }

  playCapturePopup(x, y) {
    const scene = this.scene;
    const text = scene.add
      .text(x, y, "+1地区", {
        fontSize: "22px",
        fontFamily: "Arial Black, sans-serif",
        color: "#ffffff",
        stroke: "#ff6600",
        strokeThickness: 4,
        shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 3, fill: true },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(3000)
      .setScale(0);

    scene.tweens.add({
      targets: text,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      ease: "Back.Out",
      onComplete: () => {
        scene.tweens.add({
          targets: text,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
          ease: "Linear",
          onComplete: () => {
            scene.tweens.add({
              targets: text,
              y: y - 80,
              alpha: 0,
              duration: 800,
              ease: "Power1",
              delay: 200,
              onComplete: () => text.destroy(),
            });
          },
        });
      },
    });
  }
}
