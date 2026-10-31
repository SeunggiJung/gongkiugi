// 자랑 카드: 기기에서 Canvas 로만 만들고 서버에 저장하지 않는다 (GDD 6.3). 닉네임이 없어 "내 최고 기록" 으로 쓴다.
import { ballImageUrl, GRADE_COLOR, tierBand } from "./BallArt";

export interface BoastData {
  gradeId: string;
  gradeName: string;
  kindIndex?: number;
  name: string;
  stage: number;
  /** 팔았다면 받은 골드 (이미 포맷된 문자열) */
  soldText?: string;
}

const W = 720;
const H = 960;

export async function drawBoastCard(canvas: HTMLCanvasElement, d: BoastData) {
  const url = ballImageUrl(d.gradeId, d.kindIndex, d.stage);
  const art = url ? await loadImage(url) : null;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const color = GRADE_COLOR[d.gradeId] ?? "#ddd";
  const band = tierBand(d.stage);

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1b1530");
  bg.addColorStop(1, "#3b2415");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // 단계가 높을수록 후광이 커진다
  const glow = g.createRadialGradient(W / 2, 400, 20, W / 2, 400, 120 + band * 60);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha = 0.35 + band * 0.1;
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;

  // 공: 확정된 공 이미지가 있으면 도트가 뭉개지지 않게 확대해서 그리고, 없으면 도형으로 그린다.
  if (art) {
    g.imageSmoothingEnabled = false;
    g.drawImage(art, W / 2 - 150, 400 - 150, 300, 300);
  } else {
    const ball = g.createRadialGradient(W / 2 - 40, 350, 10, W / 2, 400, 130);
    ball.addColorStop(0, "#fff");
    ball.addColorStop(1, color);
    g.fillStyle = ball;
    g.beginPath();
    g.arc(W / 2, 400, 120, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.45)";
    g.lineWidth = 8;
    g.stroke();
  }
  g.textAlign = "center";
  g.fillStyle = "#fbbf24";
  g.font = "bold 44px system-ui, 'Malgun Gothic', sans-serif";
  g.fillText("내 최고 기록", W / 2, 110);

  g.fillStyle = "#fff";
  g.font = "bold 120px system-ui, sans-serif";
  g.fillText(`+${d.stage}`, W / 2, 640);

  g.font = "bold 46px system-ui, 'Malgun Gothic', sans-serif";
  wrap(g, `[${d.gradeName}] ${d.name}`, W / 2, 710, W - 100, 56);

  if (d.soldText) {
    g.fillStyle = "#fbbf24";
    g.font = "bold 40px system-ui, 'Malgun Gothic', sans-serif";
    g.fillText(`판매 ${d.soldText} 골드`, W / 2, 850);
  }

  g.fillStyle = "rgba(255,255,255,.75)";
  g.font = "32px system-ui, 'Malgun Gothic', sans-serif";
  g.fillText("공키우기", W / 2, 920);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  g.fillText(line, x, yy);
}

export function inviteLink(): string {
  let code = localStorage.getItem("gongkiugi.refcode");
  if (!code) {
    code = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("gongkiugi.refcode", code);
  }
  return `${location.origin}${location.pathname}?ref=${code}`;
}

