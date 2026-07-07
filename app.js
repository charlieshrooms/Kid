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
  cinematic: {
    speed: 0.45,
    grain: 0.18,
    glow: 0.3,
    palette: ["#7dd3fc", "#a78bfa", "#fb7185"],
  },
  playful: {
    speed: 0.7,
    grain: 0.08,
    glow: 0.2,
    palette: ["#f472b6", "#fbbf24", "#34d399"],
  },
  dreamy: {
    speed: 0.38,
    grain: 0.12,
    glow: 0.42,
    palette: ["#c4b5fd", "#93c5fd", "#f9a8d4"],
  },
  retro: {
    speed: 0.55,
    grain: 0.2,
    glow: 0.18,
    palette: ["#fb7185", "#f59e0b", "#38bdf8"],
  },
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
  const segments = prompt
    .split(/[.!?]+|\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 0) {
    return segments.slice(0, 5);
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

function buildScenes(prompt, style, duration) {
  const stylePreset = STYLE_PRESETS[style];
  const sourceScenes = chunkPrompt(prompt);
  const sceneCount = Math.max(1, Math.min(sourceScenes.length || 1, 5));
  const lengthPerScene = duration / sceneCount;

  return Array.from({ length: sceneCount }, (_, index) => {
    const rawText = sourceScenes[index] || prompt;
    const sceneSeed = `${prompt}-${style}-${index}`;
    const hueA = Math.floor((seededValue(sceneSeed, 3) * 360) % 360);
    const hueB = Math.floor((hueA + 60 + seededValue(sceneSeed, 7) * 140) % 360);
    const accent = stylePreset.palette[index % stylePreset.palette.length];
    const symbol = ["✦", "◉", "✧", "⬢", "✺"][index % 5];

    return {
      index,
      text: titleCase(rawText),
      start: index * lengthPerScene,
      end: (index + 1) * lengthPerScene,
      accent,
      hueA,
      hueB,
      symbol,
      orbitOffset: seededValue(sceneSeed, 11),
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

function drawCaptions(scene, progress) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const subtitleY = canvas.height * 0.15;
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.fillText(`SCENE ${scene.index + 1} ${scene.symbol}`, canvas.width / 2, subtitleY);

  const wrappedLines = wrapText(scene.text, 26);
  const scale = 1 + Math.sin(progress * Math.PI) * 0.03;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.56);
  ctx.scale(scale, scale);
  ctx.font = "700 60px Inter, sans-serif";
  ctx.fillStyle = "#f8fafc";

  wrappedLines.forEach((line, index) => {
    const y = index * 72 - ((wrappedLines.length - 1) * 72) / 2;
    ctx.fillText(line, 0, y);
  });

  ctx.restore();
}

function wrapText(text, wordsPerLine) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];

  for (let index = 0; index < words.length; index += wordsPerLine) {
    lines.push(words.slice(index, index + wordsPerLine).join(" "));
  }

  return lines.slice(0, 3);
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
  drawCaptions(scene, progress);

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
    item.textContent = `${scene.text} (${Math.round(scene.end - scene.start)}s)`;
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

  return {
    prompt,
    style,
    duration,
    scenes: buildScenes(prompt, style, duration),
  };
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
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
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
