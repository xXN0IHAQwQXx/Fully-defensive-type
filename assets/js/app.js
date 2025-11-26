const cryptoApi = window.crypto || window.msCrypto;

const ui = {
  slider: document.getElementById("traffic-slider"),
  threat: document.getElementById("threat-level"),
  tip: document.getElementById("mitigation-tip"),
  entropySelect: document.getElementById("entropy-size"),
  generateBtn: document.getElementById("generate-key"),
  keyField: document.getElementById("api-key"),
  copyBtn: document.getElementById("copy-key"),
  snippet: document.getElementById("curl-snippet"),
  burstInput: document.getElementById("burst-input"),
  rateHint: document.getElementById("rate-hint"),
  rateButton: document.getElementById("calculate-rate"),
  year: document.getElementById("year"),
  keyHistory: document.getElementById("key-history"),
};

const threatBands = [
  {
    max: 25,
    label: "平常監視",
    tip: "L7キャッシュ + Botスコアリングのみで十分です。",
  },
  {
    max: 60,
    label: "注意",
    tip: "L4 SYN flood対策を有効化し、3秒間隔のレートバケットを適用しましょう。",
  },
  {
    max: 85,
    label: "警戒",
    tip: "IPレピュテーション + Webアプリファイアウォールのカスタムルールを即時投入。",
  },
  {
    max: 101,
    label: "緊急",
    tip: "自動BGPブラックホールとmTLSクライアント証明書必須モードへ切替。",
  },
];

const generatedKeys = [];

const getThreatCopy = (value) => {
  const band = threatBands.find((option) => value < option.max) || threatBands.at(-1);
  return band;
};

const updateThreatCard = (value) => {
  const { label, tip } = getThreatCopy(Number(value));
  if (ui.threat) ui.threat.textContent = label;
  if (ui.tip) ui.tip.textContent = tip;
};

const randomHex = (length) => {
  const bytes = new Uint8Array(length);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const formatKey = (hex) => {
  return hex
    .toUpperCase()
    .match(/.{1,4}/g)
    .join("-");
};

const generateKey = () => {
  if (!cryptoApi) {
    alert("安全な乱数APIが利用できません。最新のブラウザをご利用ください。");
    return;
  }
  const bytes = Number(ui.entropySelect?.value ?? 32);
  const raw = randomHex(bytes);
  const key = `SPD-${formatKey(raw)}`;
  ui.keyField.value = key;
  updateHistory(key);
  ui.snippet.textContent = [
    'curl -X POST https://api.shieldpulse.io/v1/shield/analyze \\',
    `  -H "X-API-KEY: ${key}" \\`,
    '  -H "X-SIGNATURE: hmac-sha256(body, secret)" \\',
    "  -d '{\"payload\":\"<redacted>\"}'",
  ].join("\n");
};

const updateHistory = (key) => {
  if (!ui.keyHistory) return;
  generatedKeys.unshift(key);
  generatedKeys.splice(5);
  ui.keyHistory.innerHTML = "";
  generatedKeys.forEach((value) => {
    const li = document.createElement("li");
    li.textContent = value;
    ui.keyHistory.appendChild(li);
  });
};

const copyKey = async () => {
  if (!navigator.clipboard) {
    ui.keyField.select();
    document.execCommand("copy");
    return;
  }

  if (ui.keyField.value) {
    await navigator.clipboard.writeText(ui.keyField.value);
    ui.copyBtn.textContent = "コピー済み";
    setTimeout(() => {
      ui.copyBtn.textContent = "コピー";
    }, 2000);
  }
};

const calculateLimits = () => {
  const burst = Number(ui.burstInput.value || 0);
  if (!burst) {
    ui.rateHint.textContent = "有効な数値を入力してください。";
    return;
  }
  const perSecond = Math.max(1, Math.round(burst * 0.35));
  const perMinute = perSecond * 60;
  ui.rateHint.textContent = `推奨: ${perMinute} req/min, ${perSecond} req/sec ハードリミット`;
};

const setYear = () => {
  if (ui.year) ui.year.textContent = new Date().getFullYear();
};

const bindEvents = () => {
  ui.slider?.addEventListener("input", (ev) => updateThreatCard(ev.target.value));
  ui.generateBtn?.addEventListener("click", generateKey);
  ui.copyBtn?.addEventListener("click", copyKey);
  ui.rateButton?.addEventListener("click", calculateLimits);
};

const bootstrap = () => {
  setYear();
  bindEvents();
  updateThreatCard(ui.slider?.value ?? 0);
};

bootstrap();
