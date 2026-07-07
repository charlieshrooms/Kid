const canvas = document.getElementById("video-canvas");
const ctx = canvas.getContext("2d");
const form = document.getElementById("generator-form");
const promptInput = document.getElementById("prompt");
const styleInput = document.getElementById("style");
const durationInput = document.getElementById("duration");
const downloadButton = document.getElementById("download-button");
const statusNode = document.getElementById("status");
const sceneList = document.getElementById("scene-list");

const STYLE_PRESETS = {
  cinematic: { speed: 0.45, grain: 0.18, glow: 0.3, palette: ["#7dd3fc", "#a78bfa", "#fb7185"] },
  playful: { speed: 0.7, grain: 0.08, glow: 0.2, palette: ["#f472b6", "#fbbf24", "#34d399"] },
  dreamy: { speed: 0.38, grain: 0.12, glow: 0.42, palette: ["#c4b5fd", "#93c5fd", "#f9a8d4"] },
  retro: { speed: 0.55, grain: 0.2, glow: 0.18, palette: ["#fb7185", "#f59e0b", "#38bdf8"] },
};

const SUBJECT_KEYWORDS = {
  horse: ["horse", "pony", "stallion", "mare"],
  pig: ["pig", "piglet", "hog", "boar"],
  cat: ["cat", "kitten", "feline"],
  dog: ["dog", "puppy", "wolf", "husky"],
  rabbit: ["rabbit", "bunny", "hare"],
  bird: ["bird", "eagle", "owl", "sparrow", "falcon", "parrot"],
  fish: ["fish", "shark", "whale", "dolphin", "salmon"],
  dragon: ["dragon", "wyvern"],
  dinosaur: ["dinosaur", "dino", "trex", "t-rex"],
  elephant: ["elephant", "mammoth"],
  lion: ["lion", "tiger", "cheetah", "panther"],
  monkey: ["monkey", "ape", "gorilla"],
  robot: ["robot", "android", "cyborg", "mech"],
  car: ["car", "truck", "taxi", "bus", "racecar"],
  rocket: ["rocket", "spaceship", "ship", "missile"],
  plane: ["plane", "airplane", "jet", "helicopter"],
  boat: ["boat", "ship", "canoe", "submarine"],
  house: ["house", "home", "castle", "building"],
  tree: ["tree", "forest", "jungle", "palm"],
};

const ACTION_KEYWORDS = {
  run: ["run", "running", "dash", "sprint", "race", "chase"],
  jump: ["jump", "jumping", "hop", "bounce", "leap"],
  fly: ["fly", "flying", "soar", "float", "glide"],
  swim: ["swim", "swimming", "dive", "splash"],
  spin: ["spin", "spinning", "twirl", "rotate"],
  dance: ["dance", "dancing", "groove", "party"],
  drive: ["drive", "driving", "drift", "ride"],
  sail: ["sail", "sailing", "cruise"],
};

let activeVideo = null;
let previewHandle = null;
let previewStart = 0;

function setStatus(message) {
  statusNode.textContent = message;
}

function seededValue(seed, offset = 0) {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) {
    total += seed.charCodeAt(index) * (index + 1 + offset);
  }
  return Math.abs(Math.sin(total) * 10000) % 1;
}

function chunkPrompt(prompt) {
  const sentenceChunks = prompt
    .split(/[.!?]+|\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (sentenceChunks.length > 0) {
    return sentenceChunks.slice(0, 5);
  }
  return prompt
    .split(/[,;:]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function titleCase(text) {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function inferByKeywords(text, map, fallback) {
  const normalized = text.toLowerCase();
  const matched = Object.entries(map).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );
  return matched ? matched[0] : fallback;
}

function inferSubject(text) {
  return inferByKeywords(text, SUBJECT_KEYWORDS, "shape");
}

function inferAction(text, subject) {
  const fromPrompt = inferByKeywords(text, ACTION_KEYWORDS, null);
  if (fromPrompt) {
    return fromPrompt;
  }
  if (["bird", "dragon", "plane", "rocket"].includes(subject)) {
    return "fly";
  }
  if (["fish", "boat"].includes(subject)) {
    return "swim";
  }
  if (["car"].includes(subject)) {
    return "drive";
  }
  return "idle";
}

function buildScenes(prompt, style, duration) {
  const stylePreset = STYLE_PRESETS[style];
  const sourceScenes = chunkPrompt(prompt);
  const sceneCount = Math.max(1, Math.min(sourceScenes.length || 1, 5));
  const lengthPerScene = duration / sceneCount;

  return Array.from({ length: sceneCount }, (_, index) => {
    const rawText = sourceScenes[index] || prompt;
    const sceneSeed = `${prompt}-${style}-${index}`;
    const subject = inferSubject(rawText);
    const action = inferAction(rawText, subject);
    const hueA = Math.floor((seededValue(sceneSeed, 3) * 360) % 360);
    const hueB = Math.floor((hueA + 60 + seededValue(sceneSeed, 7) * 140) % 360);
    const accent = stylePreset.palette[index % stylePreset.palette.length];
    const symbol = ["✦", "◉", "✧", "⬢", "✺"][index % 5];

    return {
      index,
      text: titleCase(rawText),
      rawText,
      subject,
      action,
      start: index * lengthPerScene,
      end: (index + 1) * lengthPerScene,
      accent,
      hueA,
      hueB,
      symbol,
      orbitOffset: seededValue(sceneSeed, 11),
      seed: sceneSeed,
      particles: Array.from({ length: 18 }, (_, particleIndex) => ({
        x: seededValue(sceneSeed, particleIndex + 13),
        y: seededValue(sceneSeed, particleIndex + 37),
        size: 2 + seededValue(sceneSeed, particleIndex + 61) * 6,
        drift: 0.4 + seededValue(sceneSeed, particleIndex + 91) * stylePreset.speed,
      })),
    };
  });
}

function drawBackground(scene, progress) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `hsl(${scene.hueA} 75% 18%)`);
  gradient.addColorStop(1, `hsl(${scene.hueB} 70% 11%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const radial = ctx.createRadialGradient(
    canvas.width * (0.2 + progress * 0.5),
    canvas.height * (0.25 + scene.orbitOffset * 0.3),
    40,
    canvas.width * (0.2 + progress * 0.5),
    canvas.height * (0.25 + scene.orbitOffset * 0.3),
    canvas.width * 0.75
  );
  radial.addColorStop(0, `${scene.accent}66`);
  radial.addColorStop(1, "transparent");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawParticles(scene, elapsed, stylePreset) {
  scene.particles.forEach((particle, index) => {
    const x = particle.x * canvas.width;
    const yBase = particle.y * canvas.height;
    const y = (yBase + Math.sin(elapsed * particle.drift + index) * 36) % canvas.height;
    const alpha = 0.2 + ((index % 5) / 10) + stylePreset.glow * 0.3;
    ctx.beginPath();
    ctx.fillStyle = `${scene.accent}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawForeground(scene, progress, stylePreset) {
  const baseY = canvas.height * 0.78;
  ctx.save();
  ctx.translate(canvas.width / 2, baseY);
  ctx.scale(1 + progress * 0.05, 1);
  ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
  ctx.beginPath();
  ctx.moveTo(-canvas.width * 0.55, 0);
  ctx.quadraticCurveTo(0, -160 - progress * 60, canvas.width * 0.55, 0);
  ctx.lineTo(canvas.width * 0.55, canvas.height * 0.28);
  ctx.lineTo(-canvas.width * 0.55, canvas.height * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `${scene.accent}30`;
  ctx.beginPath();
  ctx.arc(0, -130 - progress * 30, 190 + stylePreset.glow * 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSceneHeader(scene) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.fillText(`SCENE ${scene.index + 1} ${scene.symbol}`, canvas.width / 2, canvas.height * 0.15);
}

function drawActionEffects(scene, progress) {
  ctx.save();
  if (["run", "drive"].includes(scene.action)) {
    ctx.strokeStyle = `${scene.accent}99`;
    ctx.lineWidth = 5;
    for (let index = 0; index < 8; index += 1) {
      const y = canvas.height * (0.44 + index * 0.045);
      const offset = (progress * 320 + index * 60) % (canvas.width + 180);
      ctx.beginPath();
      ctx.moveTo(canvas.width - offset, y);
      ctx.lineTo(canvas.width - offset - 120, y);
      ctx.stroke();
    }
  } else if (["swim", "sail"].includes(scene.action)) {
    ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
    ctx.lineWidth = 4;
    for (let wave = 0; wave < 5; wave += 1) {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 35) {
        const y =
          canvas.height * 0.7 +
          wave * 16 +
          Math.sin((x / 110) * Math.PI + progress * Math.PI * 2 + wave) * 8;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  } else if (["fly"].includes(scene.action)) {
    ctx.strokeStyle = `${scene.accent}88`;
    ctx.lineWidth = 4;
    for (let index = 0; index < 6; index += 1) {
      const y = canvas.height * (0.22 + index * 0.08);
      const width = 220 + index * 40;
      const offset = (progress * 260 + index * 40) % (canvas.width + width);
      ctx.beginPath();
      ctx.moveTo(offset - width, y);
      ctx.lineTo(offset, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getMotion(scene, progress) {
  const cycle = progress * Math.PI * 2;
  const motion = { x: 0, y: 0, rotation: 0, scale: 1 };
  if (scene.action === "jump") {
    motion.y -= Math.abs(Math.sin(cycle)) * 65;
  } else if (scene.action === "run") {
    motion.x += Math.sin(cycle) * 24;
    motion.y += Math.abs(Math.sin(cycle * 1.5)) * 10;
  } else if (scene.action === "fly") {
    motion.y -= 55 + Math.sin(cycle) * 18;
    motion.x += Math.sin(cycle * 0.8) * 18;
  } else if (scene.action === "swim" || scene.action === "sail") {
    motion.y += Math.sin(cycle) * 16;
    motion.rotation = Math.sin(cycle * 0.5) * 0.08;
  } else if (scene.action === "spin") {
    motion.rotation = cycle;
  } else if (scene.action === "dance") {
    motion.rotation = Math.sin(cycle) * 0.35;
    motion.scale = 0.9 + Math.abs(Math.sin(cycle)) * 0.12;
  } else if (scene.action === "drive") {
    motion.x = Math.sin(cycle) * 42;
    motion.y = Math.abs(Math.sin(cycle * 1.4)) * 7;
  } else {
    motion.y = Math.sin(cycle) * 8;
  }
  return motion;
}

function setupBody(scene, stroke = "#f8fafc") {
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 8;
}

function drawQuadruped(scene, motion, options = {}) {
  const { longEars = false, snout = false, mane = false, spots = false } = options;
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.scale(motion.scale, motion.scale);
  setupBody(scene, "#fde68a");
  ctx.beginPath();
  ctx.ellipse(0, 0, 180, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(155, -20, 70, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  if (longEars) {
    ctx.ellipse(128, -95, 18, 54, -0.2, 0, Math.PI * 2);
    ctx.ellipse(176, -95, 18, 54, 0.2, 0, Math.PI * 2);
  } else {
    ctx.ellipse(128, -78, 28, 26, -0.3, 0, Math.PI * 2);
    ctx.ellipse(178, -78, 28, 26, 0.3, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  if (mane) {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(90, -90);
    ctx.quadraticCurveTo(188, -148, 230, -70);
    ctx.quadraticCurveTo(165, -95, 90, -58);
    ctx.closePath();
    ctx.fill();
  }

  if (snout) {
    ctx.fillStyle = "#fecdd3";
    ctx.beginPath();
    ctx.ellipse(175, -2, 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(165, -2, 5, 0, Math.PI * 2);
    ctx.arc(184, -2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spots) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    ctx.beginPath();
    ctx.ellipse(-40, -12, 24, 18, -0.1, 0, Math.PI * 2);
    ctx.ellipse(20, 18, 22, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 18;
  const legLift = Math.sin((motion.x + motion.y) * 0.2) * 12;
  [[-100, 65], [-35, 80], [35, 80], [100, 65]].forEach(([x, y], index) => {
    ctx.beginPath();
    const swing = index % 2 === 0 ? legLift : -legLift;
    ctx.moveTo(x, y);
    ctx.lineTo(x + swing, 180);
    ctx.stroke();
  });
  ctx.restore();
}

function drawBird(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.52 + motion.y);
  ctx.rotate(motion.rotation);
  setupBody(scene, "#f8fafc");
  ctx.beginPath();
  ctx.ellipse(0, 0, 120, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const flap = 0.45 + Math.abs(Math.sin((motion.y + motion.x) * 0.05));
  ctx.beginPath();
  ctx.ellipse(-90, -20, 90, 34, -flap, 0, Math.PI * 2);
  ctx.ellipse(90, -20, 90, 34, flap, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(175, -18);
  ctx.lineTo(175, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFish(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  setupBody(scene, "#bae6fd");
  ctx.beginPath();
  ctx.ellipse(0, 0, 170, 88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const tailSwing = Math.sin((motion.y + motion.x) * 0.2) * 38;
  ctx.beginPath();
  ctx.moveTo(-150, 0);
  ctx.lineTo(-250, -75 + tailSwing);
  ctx.lineTo(-250, 75 + tailSwing);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(240, 249, 255, 0.7)";
  ctx.beginPath();
  ctx.ellipse(-20, -70, 58, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDragon(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.53 + motion.y);
  ctx.rotate(motion.rotation);
  setupBody(scene, "#ecfeff");
  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(145, -30, 75, 56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const wing = 0.35 + Math.abs(Math.sin((motion.y + motion.x) * 0.05));
  ctx.beginPath();
  ctx.moveTo(-50, -25);
  ctx.lineTo(-190, -180 * wing);
  ctx.lineTo(-15, -92);
  ctx.closePath();
  ctx.moveTo(50, -25);
  ctx.lineTo(190, -180 * wing);
  ctx.lineTo(15, -92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawElephant(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  setupBody(scene, "#e2e8f0");
  ctx.beginPath();
  ctx.ellipse(0, 0, 190, 108, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(145, -25, 80, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(248, 250, 252, 0.65)";
  ctx.beginPath();
  ctx.ellipse(120, -25, 36, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.beginPath();
  ctx.moveTo(195, -5);
  ctx.quadraticCurveTo(240, 22, 225, 95);
  ctx.quadraticCurveTo(192, 72, 176, 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMonkey(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  setupBody(scene, "#fde68a");
  ctx.beginPath();
  ctx.ellipse(0, 25, 145, 100, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -80, 90, 72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(135, -42, 40, 0, Math.PI * 2);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
}

function drawRobot(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.scale(motion.scale, motion.scale);
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 8;
  ctx.fillRect(-110, -80, 220, 190);
  ctx.strokeRect(-110, -80, 220, 190);
  ctx.fillRect(-84, -186, 168, 120);
  ctx.strokeRect(-84, -186, 168, 120);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(-54, -154, 38, 28);
  ctx.fillRect(16, -154, 38, 28);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-20, -224, 40, 36);
  ctx.strokeRect(-20, -224, 40, 36);
  ctx.beginPath();
  ctx.moveTo(0, -236);
  ctx.lineTo(0, -266);
  ctx.stroke();
  ctx.restore();
}

function drawCar(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.64 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(-220, -70, 440, 140, 40);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-120, -125, 250, 65, 22);
  ctx.fillStyle = "rgba(15, 23, 42, 0.42)";
  ctx.fill();
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.fillRect(-188, -58, 22, 36);
  ctx.fillRect(166, -58, 22, 36);
  ctx.fillStyle = "#020617";
  [-140, 140].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 74, 44, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawPlane(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.52 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 190, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, -18);
  ctx.lineTo(-170, -95);
  ctx.lineTo(58, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-35, 18);
  ctx.lineTo(-170, 95);
  ctx.lineTo(58, 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRocket(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.52 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -170);
  ctx.quadraticCurveTo(98, -54, 82, 95);
  ctx.lineTo(-82, 95);
  ctx.quadraticCurveTo(-98, -54, 0, -170);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath();
  ctx.arc(0, -34, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(-42, 95);
  ctx.lineTo(0, 188 + Math.abs(motion.y) * 0.7);
  ctx.lineTo(42, 95);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBoat(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.66 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-180, 0);
  ctx.lineTo(180, 0);
  ctx.lineTo(120, 88);
  ctx.lineTo(-120, 88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -180);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = "rgba(248, 250, 252, 0.88)";
  ctx.beginPath();
  ctx.moveTo(0, -150);
  ctx.lineTo(120, -82);
  ctx.lineTo(0, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTree(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.6 + motion.y);
  ctx.rotate(motion.rotation * 0.4);
  ctx.fillStyle = "#7c2d12";
  ctx.fillRect(-28, -20, 56, 210);
  ctx.fillStyle = `${scene.accent}dd`;
  [[0, -80, 130], [-95, -20, 96], [95, -20, 96], [0, -150, 96]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawHouse(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.62 + motion.y);
  ctx.rotate(motion.rotation * 0.2);
  ctx.fillStyle = `${scene.accent}dd`;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 7;
  ctx.fillRect(-140, -60, 280, 220);
  ctx.strokeRect(-140, -60, 280, 220);
  ctx.beginPath();
  ctx.moveTo(-170, -60);
  ctx.lineTo(0, -190);
  ctx.lineTo(170, -60);
  ctx.closePath();
  ctx.fillStyle = "#f97316";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
  ctx.fillRect(-38, 40, 76, 120);
  ctx.fillRect(-100, -20, 46, 46);
  ctx.fillRect(54, -20, 46, 46);
  ctx.restore();
}

function drawFallback(scene, motion) {
  ctx.save();
  ctx.translate(canvas.width / 2 + motion.x, canvas.height * 0.58 + motion.y);
  ctx.rotate(motion.rotation);
  ctx.scale(motion.scale, motion.scale);
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 42px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", 0, 0);
  ctx.restore();
}

function drawSubject(scene, progress) {
  const motion = getMotion(scene, progress);
  if (scene.subject === "pig") return drawQuadruped(scene, motion, { snout: true, spots: true });
  if (scene.subject === "horse") return drawQuadruped(scene, motion, { mane: true });
  if (scene.subject === "cat") return drawQuadruped(scene, motion, { spots: true });
  if (scene.subject === "dog") return drawQuadruped(scene, motion, {});
  if (scene.subject === "rabbit") return drawQuadruped(scene, motion, { longEars: true });
  if (scene.subject === "bird") return drawBird(scene, motion);
  if (scene.subject === "fish") return drawFish(scene, motion);
  if (scene.subject === "dragon") return drawDragon(scene, motion);
  if (scene.subject === "dinosaur") return drawDragon(scene, { ...motion, rotation: motion.rotation * 0.25 });
  if (scene.subject === "elephant") return drawElephant(scene, motion);
  if (scene.subject === "lion") return drawQuadruped(scene, motion, { mane: true, spots: true });
  if (scene.subject === "monkey") return drawMonkey(scene, motion);
  if (scene.subject === "robot") return drawRobot(scene, motion);
  if (scene.subject === "car") return drawCar(scene, motion);
  if (scene.subject === "plane") return drawPlane(scene, motion);
  if (scene.subject === "rocket") return drawRocket(scene, motion);
  if (scene.subject === "boat") return drawBoat(scene, motion);
  if (scene.subject === "tree") return drawTree(scene, motion);
  if (scene.subject === "house") return drawHouse(scene, motion);
  return drawFallback(scene, motion);
}

function drawSceneFooter(scene) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
  ctx.font = "600 22px Inter, sans-serif";
  ctx.fillText(`${scene.subject.toUpperCase()} • ${scene.action.toUpperCase()}`, canvas.width / 2, canvas.height * 0.88);
}

function drawFrame(video, elapsedSeconds) {
  const stylePreset = STYLE_PRESETS[video.style];
  const boundedTime = Math.min(Math.max(elapsedSeconds, 0), video.duration);
  const scene =
    video.scenes.find((item) => boundedTime >= item.start && boundedTime < item.end) ||
    video.scenes[video.scenes.length - 1];
  const sceneDuration = Math.max(scene.end - scene.start, 0.001);
  const progress = (boundedTime - scene.start) / sceneDuration;

  drawBackground(scene, progress);
  drawParticles(scene, boundedTime * 1.6, stylePreset);
  drawForeground(scene, progress, stylePreset);
  drawActionEffects(scene, progress);
  drawSceneHeader(scene);
  drawSubject(scene, progress);
  drawSceneFooter(scene);

  if (stylePreset.grain > 0) {
    ctx.fillStyle = `rgba(255,255,255,${stylePreset.grain * 0.05})`;
    for (let index = 0; index < 120; index += 1) {
      const noiseX = seededValue(`${scene.text}-${index}`, Math.floor(boundedTime * 20)) * canvas.width;
      const noiseY =
        seededValue(`${scene.text}-${index * 2}`, Math.floor(boundedTime * 30)) * canvas.height;
      ctx.fillRect(noiseX, noiseY, 2, 2);
    }
  }
}

function renderIdleState() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#020617");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 58px Inter, sans-serif";
  ctx.fillText("Kid Text to Video AI Generator", canvas.width / 2, canvas.height * 0.45);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillText("Generate a preview to animate your prompt.", canvas.width / 2, canvas.height * 0.56);
}

function updateSceneList(video) {
  sceneList.innerHTML = "";
  video.scenes.forEach((scene) => {
    const item = document.createElement("li");
    const length = Math.round(scene.end - scene.start);
    item.textContent = `${scene.text} → ${scene.subject}/${scene.action} (${length}s)`;
    sceneList.appendChild(item);
  });
}

function stopPreview() {
  if (previewHandle) {
    cancelAnimationFrame(previewHandle);
    previewHandle = null;
  }
}

function startPreview(video) {
  stopPreview();
  previewStart = performance.now();
  const tick = (timestamp) => {
    const elapsedSeconds = (timestamp - previewStart) / 1000;
    if (elapsedSeconds >= video.duration) {
      drawFrame(video, video.duration);
      setStatus("Preview ready. Download the video when you are happy with it.");
      previewHandle = null;
      return;
    }
    drawFrame(video, elapsedSeconds);
    previewHandle = requestAnimationFrame(tick);
  };
  previewHandle = requestAnimationFrame(tick);
}

function createVideoModel() {
  const prompt = promptInput.value.trim();
  const style = styleInput.value;
  const duration = Number(durationInput.value);
  return { prompt, style, duration, scenes: buildScenes(prompt, style, duration) };
}

async function exportVideo(video) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not supported in this browser.");
  }
  const stream = canvas.captureStream(30);
  const chunks = [];
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const complete = new Promise((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video export failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  recorder.start();
  const startedAt = performance.now();
  await new Promise((resolve) => {
    const render = (timestamp) => {
      const elapsedSeconds = Math.min((timestamp - startedAt) / 1000, video.duration);
      drawFrame(video, elapsedSeconds);
      if (elapsedSeconds >= video.duration) {
        resolve();
        return;
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  });
  recorder.stop();
  return complete;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Add a prompt before generating a preview.");
    return;
  }
  activeVideo = createVideoModel();
  updateSceneList(activeVideo);
  drawFrame(activeVideo, 0);
  setStatus("Generating preview...");
  startPreview(activeVideo);
  downloadButton.disabled = false;
});

downloadButton.addEventListener("click", async () => {
  if (!activeVideo) {
    setStatus("Generate a preview before exporting.");
    return;
  }
  downloadButton.disabled = true;
  setStatus("Rendering video file...");
  try {
    const blob = await exportVideo(activeVideo);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kid-text-to-video.webm";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Video downloaded.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    downloadButton.disabled = false;
  }
});

renderIdleState();
