import { useMemo, useRef, useState } from "react";
import { scoreMessage, type ScoreResult } from "./score";

type Screen = "input" | "flow" | "ticket" | "replies" | "share";

const CREDIT_KEY = "message-rate-demo-credits";

const TONE_META: Record<
  ScoreResult["replacements"][number]["tone"],
  { kicker: string; lockedNote: string }
> = {
  "giữ mặt": { kicker: "Điềm tĩnh · Tôn trọng nhịp", lockedNote: "" },
  "đẩy nhẹ": { kicker: "Gợi mở tò mò", lockedNote: "Tạo áp lực vừa phải để đối phương phản hồi ngay" },
  "nói thẳng": { kicker: "Quyết đoán · Rõ biên giới", lockedNote: "Đặt lại luật đối thoại dứt khoát không né tránh" },
};

function loadCredits(): number | null {
  try {
    const raw = localStorage.getItem(CREDIT_KEY);
    if (raw == null) return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.floor(value));
  } catch {
    return null;
  }
}

function saveCredits(value: number) {
  try {
    localStorage.setItem(CREDIT_KEY, String(value));
  } catch {
    /* demo state stays in memory */
  }
}

function checkCode(draft: string, score: number): string {
  let n = 17 + score;
  for (let i = 0; i < draft.length; i += 1) n = (n + draft.charCodeAt(i) * (i + 1)) % 900;
  return `${100 + n}-A`;
}

function archiveNo(draft: string, score: number): string {
  let n = score;
  for (let i = 0; i < draft.length; i += 1) n = (n * 33 + draft.charCodeAt(i)) % 1000;
  return String(n).padStart(3, "0");
}

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "paste") {
    return (
      <svg {...common}>
        <rect x="8" y="4" width="8" height="4" rx="1" />
        <path d="M8 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
      </svg>
    );
  }
  if (name === "scan") {
    return (
      <svg {...common}>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "back") {
    return (
      <svg {...common}>
        <path d="M15 5 8 12l7 7" />
      </svg>
    );
  }
  if (name === "person") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </svg>
    );
  }
  if (name === "copy") {
    return (
      <svg {...common} width="16" height="16">
        <rect x="8" y="8" width="10" height="10" rx="2" />
        <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }
  if (name === "more") {
    return (
      <svg {...common}>
        <circle cx="6" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="18" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg {...common} width="16" height="16">
        <path d="M5 16l-2 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5z" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg {...common} width="16" height="16">
        <path d="M12 4 3 19h18L12 4z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    );
  }
  if (name === "hour") {
    return (
      <svg {...common} width="16" height="16">
        <path d="M5 3h14M6 21h12" />
        <path d="M7 3c.2 4 4.2 5.2 5 8-.8 2.6-4.8 4-5 8M17 3c-.2 4-4.2 5.2-5 8 .8 2.6 4.8 4 5 8" />
      </svg>
    );
  }
  if (name === "share") {
    return (
      <svg {...common}>
        <path d="M12 4v10" />
        <path d="M8 8l4-4 4 4" />
        <path d="M6 12H5a2 2 0 0 0-2 2v6h18v-6a2 2 0 0 0-2-2h-1" />
      </svg>
    );
  }
  if (name === "link") {
    return (
      <svg {...common} width="18" height="18">
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      </svg>
    );
  }
  if (name === "replay") {
    return (
      <svg {...common} width="18" height="18">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }
  if (name === "info") {
    return (
      <svg {...common} width="14" height="14">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <path d="M5 12l5 5L20 7" />
      </svg>
    );
  }
  if (name === "note") {
    return (
      <svg {...common}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5M8 13h8M8 17h6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function StatusBar({ tone }: { tone: "light" | "dark" }) {
  return (
    <div className={tone === "light" ? "status light" : "status dark"}>
      <span>9:41</span>
      <span className="status-icons" aria-hidden="true">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <rect x="0" y="6" width="3" height="6" rx="0.5" />
          <rect x="4.5" y="4" width="3" height="8" rx="0.5" />
          <rect x="9" y="2" width="3" height="10" rx="0.5" />
          <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" />
        </svg>
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M1 4.5a9 9 0 0 1 13 0" />
          <path d="M3.2 7a6 6 0 0 1 8.6 0" />
          <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="22" height="12" viewBox="0 0 22 12" fill="currentColor">
          <rect x="0.5" y="0.5" width="18" height="11" rx="2" fill="none" stroke="currentColor" />
          <rect x="2" y="2" width="12" height="8" rx="1" />
          <rect x="19.5" y="3.5" width="2" height="5" rx="0.5" />
        </svg>
      </span>
    </div>
  );
}

function Highlight({ text, phrases }: { text: string; phrases: string[] }) {
  if (!text.trim()) return <span>Chưa có câu.</span>;
  if (phrases.length === 0) return <span>{text}</span>;
  const ranges: Array<{ start: number; end: number }> = [];
  for (const phrase of phrases) {
    let from = 0;
    while (from < text.length) {
      const at = text.toLowerCase().indexOf(phrase.toLowerCase(), from);
      if (at < 0) break;
      ranges.push({ start: at, end: at + phrase.length });
      from = at + phrase.length;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const nodes: Array<string | JSX.Element> = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start < cursor) return;
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    nodes.push(
      <mark className="weak" key={`${range.start}-${index}`}>
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <span>{nodes}</span>;
}

function dropLabel(drop: number): string {
  if (drop > 0) return `Giảm ${drop} điểm`;
  if (drop < 0) return `Tăng ${Math.abs(drop)} điểm`;
  return "Không đổi điểm";
}

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams(window.location.search);
  const asked = params.get("screen");
  const initial: Screen =
    asked === "flow" || asked === "ticket" || asked === "replies" || asked === "share" ? asked : "input";
  const [screen, setScreen] = useState<Screen>(initial);
  const [thread, setThread] = useState(params.get("thread") ?? "");
  const [draft, setDraft] = useState(params.get("draft") ?? "");
  const [sendTime, setSendTime] = useState(params.get("time") ?? "");
  const [gapText, setGapText] = useState(params.get("gap") ?? "");
  const [credits, setCredits] = useState<number | null>(() => loadCredits());
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [banner, setBanner] = useState(true);
  const gapNumber = gapText.trim() === "" ? null : Number(gapText);
  const input = useMemo(
    () => ({
      thread,
      draft,
      sendTime: sendTime.trim() === "" ? null : sendTime.trim(),
      gapHours: gapNumber == null || Number.isNaN(gapNumber) ? null : gapNumber,
    }),
    [thread, draft, sendTime, gapNumber],
  );
  const result = useMemo(() => scoreMessage(input), [input]);
  const unlocked = credits != null && credits > 0;
  const ready = draft.trim().length > 0;

  function analyze() {
    if (!ready) return;
    if (credits != null && credits > 0) {
      const next = credits - 1;
      setCredits(next);
      saveCredits(next);
    }
    setScreen("ticket");
  }

  async function pasteDraft() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDraft(text.slice(0, 500));
    } catch {
      document.getElementById("draft-box")?.focus();
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setShotUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBanner(true);
    setScreen("flow");
  }

  return (
    <div className={`app ${screen}`}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      {screen === "input" && (
        <InputScreen
          draft={draft}
          thread={thread}
          sendTime={sendTime}
          gapText={gapText}
          onDraft={setDraft}
          onThread={setThread}
          onTime={setSendTime}
          onGap={setGapText}
          onPaste={() => void pasteDraft()}
          onShot={() => {
            setScreen("flow");
            fileRef.current?.click();
          }}
          onAnalyze={analyze}
        />
      )}
      {screen === "flow" && (
        <FlowScreen
          draft={draft}
          result={result}
          ready={ready}
          shotUrl={shotUrl}
          banner={banner}
          onDismiss={() => setBanner(false)}
          onScore={analyze}
          onBack={() => setScreen("input")}
          onShare={() => setScreen("share")}
        />
      )}
      {screen === "ticket" && (
        <TicketScreen
          draft={draft}
          result={result}
          onBack={() => setScreen("input")}
          onReplies={() => setScreen("replies")}
          onShare={() => setScreen("share")}
        />
      )}
      {screen === "replies" && (
        <RepliesScreen
          result={result}
          unlocked={unlocked}
          credits={credits}
          onBack={() => setScreen("ticket")}
          onShare={() => setScreen("share")}
          onUnlock={() => {
            setCredits(20);
            saveCredits(20);
          }}
        />
      )}
      {screen === "share" && (
        <ShareScreen
          draft={draft}
          result={result}
          onClose={() => setScreen("ticket")}
          onAgain={() => setScreen("input")}
        />
      )}
    </div>
  );
}

function InputScreen(props: {
  draft: string;
  thread: string;
  sendTime: string;
  gapText: string;
  onDraft: (value: string) => void;
  onThread: (value: string) => void;
  onTime: (value: string) => void;
  onGap: (value: string) => void;
  onPaste: () => void;
  onShot: () => void;
  onAnalyze: () => void;
}) {
  return (
    <main>
      <StatusBar tone="light" />
      <div className="pad">
        <header className="brand-row">
          <h1 className="brand">
            <span className="dot" />
            Message Rate
          </h1>
          <span className="pill">BẢN THẢO 01</span>
        </header>
        <section className="card" aria-label="Khu vực thẩm định tin nhắn">
          <div className="card-head">
            <h2 className="card-title">
              <span className="blue-dot" />
              PHÒNG THẨM ĐỊNH
              <span className="deg">159°</span>
            </h2>
            <span className="count">{props.draft.length}/500</span>
          </div>
          <div className="edit-tile" aria-hidden="true">
            <Icon name="edit" />
          </div>
          <div className="paste">
            <textarea
              id="draft-box"
              aria-label="Dán tin nhắn"
              placeholder="Dán đoạn đang không dám gửi..."
              maxLength={500}
              rows={4}
              value={props.draft}
              className={props.draft ? "filled" : ""}
              onChange={(event) => props.onDraft(event.target.value)}
            />
          </div>
          <p className="helper">Chạm để bắt đầu nhập câu chữ cần cân nhắc</p>
          <textarea
            className="thread"
            aria-label="Đoạn trước, tuỳ chọn"
            rows={2}
            placeholder="Tuỳ chọn · đoạn trước, mỗi dòng họ: hoặc mình:"
            value={props.thread}
            onChange={(event) => props.onThread(event.target.value)}
          />
          <div className="quiet">
            <label>
              Giờ gửi
              <input aria-label="Giờ gửi" type="time" value={props.sendTime} onChange={(event) => props.onTime(event.target.value)} />
            </label>
            <label>
              Họ im (giờ)
              <input
                aria-label="Số giờ họ đã im"
                type="number"
                min="0"
                step="0.5"
                placeholder="trống nếu chưa rõ"
                value={props.gapText}
                onChange={(event) => props.onGap(event.target.value)}
              />
            </label>
          </div>
          <div className="ready">
            <button className="ready-go" type="button" onClick={props.onAnalyze}>
              <span className="pulse" />
              Sẵn sàng phân tích
            </button>
            {props.draft ? (
              <button className="linkish" type="button" onClick={() => props.onDraft("")}>
                Xóa
              </button>
            ) : null}
          </div>
        </section>
        <div className="actions">
          <button className="btn primary" type="button" onClick={props.onPaste}>
            <Icon name="paste" />
            Dán chữ
          </button>
          <button className="btn secondary" type="button" onClick={props.onShot}>
            <Icon name="scan" />
            Chụp màn hình
          </button>
        </div>
        <p className="lock-pill">
          <Icon name="lock" />
          Không lưu toàn bộ cuộc trò chuyện
        </p>
      </div>
    </main>
  );
}

function TicketScreen(props: {
  draft: string;
  result: ScoreResult;
  onBack: () => void;
  onReplies: () => void;
  onShare: () => void;
}) {
  const warning = props.result.weakPhrases.length
    ? "Ngữ khí hạ thấp vị thế và do dự không cần thiết"
    : props.result.verdict;
  return (
    <main>
      <StatusBar tone="dark" />
      <div className="pad">
        <header className="nav">
          <button className="icon-btn" type="button" aria-label="Quay lại" onClick={props.onBack}>
            <Icon name="back" />
          </button>
          <h1>Detailed Breakdown</h1>
          <button className="avatar" type="button" aria-label="Mở thẻ chia sẻ" onClick={props.onShare}>
            <Icon name="person" />
          </button>
        </header>
        <article className="card ticket">
          <div className="score-wrap">
            <span className="score">{props.result.score}</span>
            <span className="over">/100</span>
          </div>
          <p className="seen">RỦI RO BỊ SEEN</p>
          <p className="fine">
            mức rủi ro tương đối · {props.result.level}. Thang nội bộ, chưa phải dự đoán.
            {props.result.timeNote ? ` ${props.result.timeNote}.` : ""}
          </p>
          <hr className="rule" />
          <p className="kicker">CHẨN ĐOÁN</p>
          <p className="verdict">{props.result.verdict}</p>
          <div className="quote">
            <div className="quote-top">
              <span className="quote-label">TIN NHẮN ĐÃ GỬI</span>
              <Icon name="chat" />
            </div>
            <p>
              <Highlight text={props.draft} phrases={props.result.weakPhrases} />
            </p>
            <div className="warn">
              <Icon name="alert" />
              <span>{warning}</span>
            </div>
          </div>
          <div className="foot">
            <span>
              <Icon name="hour" /> Hết hạn sau 6 ngày
            </span>
            <span className="ghost">Mã kiểm tra #{checkCode(props.draft, props.result.score)}</span>
          </div>
        </article>
        <div className="dock">
          <button className="btn primary pill" type="button" onClick={props.onReplies}>
            Xem ba cách trả lời
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </main>
  );
}

function RepliesScreen(props: {
  result: ScoreResult;
  unlocked: boolean;
  credits: number | null;
  onBack: () => void;
  onShare: () => void;
  onUnlock: () => void;
}) {
  return (
    <main>
      <StatusBar tone="dark" />
      <div className="pad">
        <header className="nav">
          <button className="icon-btn" type="button" aria-label="Quay lại" onClick={props.onBack}>
            <Icon name="back" />
          </button>
          <h1>Detailed Breakdown</h1>
          <button className="avatar" type="button" aria-label="Mở thẻ chia sẻ" onClick={props.onShare}>
            <Icon name="person" />
          </button>
        </header>
        <div className="section-label">
          <strong>
            <span className="blue-dot" />
            ĐỀ XUẤT PHẢN HỒI
          </strong>
          <span className="chip">3 sắc thái</span>
        </div>
        {props.result.replacements.map((line, index) => {
          const locked = index > 0 && !props.unlocked;
          const meta = TONE_META[line.tone];
          return (
            <article className={locked ? "card reply locked" : "card reply"} key={line.tone}>
              <div className="reply-top">
                <span className="tone">{line.tone}</span>
                <span className="kicker-soft">{meta.kicker}</span>
                {locked ? <Icon name="lock" /> : <Icon name="check" />}
              </div>
              {locked ? (
                <>
                  <div className="mist" aria-hidden="true">
                    <i />
                    <i style={{ width: "62%" }} />
                  </div>
                  <div className="row">
                    <span className="kicker-soft">{meta.lockedNote}</span>
                    <span className="lock-badge">Bị khóa</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="quote-line">“{line.line.replace(/\.$/, "")}.”</p>
                  <p className="fine">{dropLabel(line.drop)} nếu gửi câu này. Số trên phiếu không đổi.</p>
                  <div className="row">
                    <span className="kicker-soft">Chạm để sao chép chuẩn mực</span>
                    <CopyButton text={line.line} />
                  </div>
                </>
              )}
            </article>
          );
        })}
        <div className="callout">
          <div className="orb">
            <Icon name="info" />
          </div>
          <div>
            <strong>Chiến thuật phản hồi theo ngữ cảnh</strong>
            <p>Mỗi tình huống đòi hỏi một điểm tựa tâm lý riêng. Giữ lại hai phản hồi góc độ cao hơn cho cuộc đối thoại quan trọng.</p>
          </div>
        </div>
        <div className="dock">
          {props.unlocked ? (
            <p className="demo-note">Đã mở demo · còn {props.credits} ca · không trừ tiền.</p>
          ) : (
            <>
              <button className="btn primary pill" type="button" onClick={props.onUnlock}>
                <Icon name="lock" />
                Mở hai câu còn lại
                <span className="price">49.000 đồng cho 20 ca</span>
              </button>
              <p className="demo-note">Bấm để mở trên máy này. Không có giao dịch.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn primary pill tiny"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          },
          () => setDone(true),
        );
      }}
    >
      <Icon name="copy" />
      {done ? "Đã chép" : "Sao chép"}
    </button>
  );
}

function FlowScreen(props: {
  draft: string;
  result: ScoreResult;
  ready: boolean;
  shotUrl: string | null;
  banner: boolean;
  onDismiss: () => void;
  onScore: () => void;
  onBack: () => void;
  onShare: () => void;
}) {
  const line = props.result.replacements[0]?.line ?? "";
  return (
    <main>
      <StatusBar tone="light" />
      <div className="pad">
        {props.banner ? (
          <div className="banner">
            <div className="shot-dot">
              <Icon name="scan" />
            </div>
            <div>
              <p className="sub">Phát hiện ảnh chụp</p>
              <p>Vừa chụp một đoạn chat. Chấm ảnh này?</p>
            </div>
            <button className="mini-btn ghost" type="button" onClick={props.onDismiss}>
              Bỏ qua
            </button>
            <button className="mini-btn go" type="button" onClick={props.ready ? props.onScore : props.onBack}>
              Chấm <Icon name="arrow" />
            </button>
          </div>
        ) : null}
        <section className="sheet">
          <div className="grab" />
          <div className="meta">
            <span>ẢNH CHỤP MÀN HÌNH · ZALO / INSTAGRAM</span>
            <span>Hôm nay, 09:41</span>
          </div>
          <div className="snippet">
            <div className="who">
              <span className="avatar-n">N</span>
              Người gửi tin nhắn
              <span className="unsent">Chưa gửi đi</span>
            </div>
            {props.shotUrl ? <img className="shot" src={props.shotUrl} alt="Ảnh chat để đối chiếu" /> : null}
            <div className="bubble">
              <Highlight text={props.draft} phrases={props.result.weakPhrases} />
            </div>
            <p className="found">
              <Icon name="info" />
              {props.ready
                ? `Phát hiện ${props.result.weakPhrases.length} cụm yếu trong câu chữ. Ảnh không được đọc.`
                : "Chưa có câu chữ. Quay lại phòng thẩm định để dán."}
            </p>
          </div>
          <article className="card audit">
            <div className="row audit-top">
              <div>
                <p className="kicker">CHỈ SỐ TỰ TIN THẨM ĐỊNH</p>
                {props.ready ? (
                  <div className="score-wrap">
                    <span className="score">{props.result.score}</span>
                    <span className="over">/100</span>
                  </div>
                ) : (
                  <p className="verdict">—</p>
                )}
              </div>
              {props.ready && props.result.score >= 40 ? (
                <span className="alert">
                  <Icon name="alert" />
                  Cần tinh chỉnh
                </span>
              ) : null}
            </div>
            <p className="fine">mức rủi ro tương đối. Thang nội bộ, chưa phải dự đoán.</p>
            {props.result.timeNote ? <p className="fine">{props.result.timeNote}</p> : null}
            {props.result.weakPhrases.length > 0 ? (
              <div className="fix">
                <span className="kicker-soft">Cụm từ làm giảm sức thuyết phục</span>
                {props.result.weakPhrases.map((phrase) => (
                  <div className="swap" key={phrase}>
                    <mark className="weak">{phrase}</mark>
                    <Icon name="arrow" />
                    <span className="to">{line.replace(/\.$/, "")}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {props.ready
              ? props.result.hits.map((hit) => (
                  <div className="criterion" key={hit.id}>
                    <div className="hit-line">
                      <span>{hit.label}</span>
                      <span className={hit.points < 0 ? "tag ok" : "tag bad"}>
                        {hit.points > 0 ? `+${hit.points}` : hit.points}
                      </span>
                    </div>
                    <div className="mini" aria-hidden="true">
                      <span className={hit.points < 0 ? "down" : "up"} style={{ width: `${Math.max(8, Math.min(100, Math.round((Math.abs(hit.points) / 20) * 100)))}%` }} />
                    </div>
                  </div>
                ))
              : null}
            {!props.result.hits.length && props.ready ? (
              <div className="criterion">
                <div className="hit-line">
                  <span>Không có luật cộng thêm</span>
                  <span className="tag ok">Nền</span>
                </div>
                <div className="mini">
                  <span className="down" style={{ width: "35%" }} />
                </div>
              </div>
            ) : null}
          </article>
          <p className="kicker" style={{ marginTop: 16 }}>
            TIỆN ÍCH CHIA SẺ NHANH
          </p>
          <div className="tools">
            <button className="tool hero" type="button" onClick={props.onShare}>
              <i>
                <Icon name="edit" />
              </i>
              Message Rate
            </button>
            <button
              className="tool"
              type="button"
              onClick={() => void navigator.clipboard.writeText(props.draft)}
            >
              <i>
                <Icon name="copy" />
              </i>
              Sao chép
            </button>
            <button className="tool" type="button" onClick={props.onShare}>
              <i>
                <Icon name="share" />
              </i>
              Chia sẻ ảnh
            </button>
            <button className="tool" type="button" onClick={props.onBack}>
              <i>
                <Icon name="note" />
              </i>
              Ghi chú
            </button>
          </div>
          <div className="dock">
            <button
              className="btn primary pill"
              type="button"
              onClick={() => void navigator.clipboard.writeText(line)}
            >
              Sao chép bản chỉnh sửa chuẩn mực
              <Icon name="check" />
            </button>
            <span className="caption">Sẵn sàng dán thẳng vào Zalo, Instagram hoặc Messenger</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function ShareScreen(props: {
  draft: string;
  result: ScoreResult;
  onClose: () => void;
  onAgain: () => void;
}) {
  const [toast, setToast] = useState("");
  const struck = props.result.weakPhrases[0] || props.result.verdict;
  const summary = `Message Rate ${props.result.score}. RỦI RO BỊ SEEN. ${props.result.verdict} Thang nội bộ, chưa phải dự đoán.`;

  async function saveCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#eaf3fd";
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 120, 140, 840, 800, 48);
    ctx.fill();
    ctx.fillStyle = "#165bb6";
    ctx.textAlign = "center";
    ctx.font = "800 180px sans-serif";
    ctx.fillText(String(props.result.score), 540, 420);
    ctx.font = "700 36px sans-serif";
    ctx.fillText("RỦI RO BỊ SEEN", 540, 490);
    ctx.fillStyle = "#172033";
    ctx.font = "500 32px sans-serif";
    const clip = struck.length > 42 ? `${struck.slice(0, 40)}…` : struck;
    ctx.fillText(clip, 540, 620);
    ctx.font = "700 42px sans-serif";
    ctx.fillText("Message Rate", 540, 760);
    ctx.fillStyle = "#404753";
    ctx.font = "500 28px sans-serif";
    ctx.fillText("hạn 7 ngày", 540, 820);
    ctx.fillText("Thang nội bộ, chưa phải dự đoán.", 540, 880);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = blob ? new File([blob], "message-rate.png", { type: "image/png" }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Message Rate", text: summary });
        return;
      } catch {
        /* fall through to download */
      }
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "message-rate.png";
    link.click();
    setToast("Đã lưu ảnh");
  }

  return (
    <main>
      <StatusBar tone="dark" />
      <div className="pad">
        <header className="nav">
          <button className="round" type="button" aria-label="Đóng" onClick={props.onClose}>
            <Icon name="close" />
          </button>
          <div className="share-head">
            <strong>BẢN THẨM ĐỊNH</strong>
            <span>Lưu trữ số {archiveNo(props.draft, props.result.score)}/{props.result.score}</span>
          </div>
          <button
            className="round"
            type="button"
            aria-label="Thêm"
            onClick={() => {
              void navigator.clipboard.writeText(summary);
              setToast("Đã sao chép thẻ");
            }}
          >
            <Icon name="more" />
          </button>
        </header>
        <div className="story-wrap">
          <article className="story">
            <div>
              <p className="score blue">{props.result.score}</p>
              <p className="seen">RỦI RO BỊ SEEN</p>
            </div>
            <p className={props.result.weakPhrases.length ? "strike" : "verdict"}>{struck}</p>
            <div>
              <p className="brand-lg">Message Rate</p>
              <p className="fine">hạn 7 ngày</p>
              <p className="fine">mức rủi ro tương đối. Thang nội bộ, chưa phải dự đoán.</p>
            </div>
          </article>
        </div>
        <button className="btn primary pill" type="button" onClick={() => void saveCard()}>
          <Icon name="share" />
          Lưu ảnh / Chia sẻ
        </button>
        <div className="duo">
          <button
            className="btn secondary pill"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(summary);
              setToast("Đã sao chép thẻ");
            }}
          >
            <Icon name="link" />
            Sao chép ảnh
          </button>
          <button className="btn secondary pill" type="button" onClick={props.onAgain}>
            <Icon name="replay" />
            Thẩm định lại
          </button>
        </div>
        {toast ? <p className="toast">{toast}</p> : null}
        <p className="footnote">Định dạng chuẩn 1:1 tương thích bài đăng và tin tức Instagram, iMessage, và AirDrop.</p>
      </div>
    </main>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
