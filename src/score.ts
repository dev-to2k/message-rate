/** Relative risk score, 0–100. Deterministic. No randomness, no network, no model. */

export const BASE_SCORE = 35;

export interface ScoreInput {
  thread: string;
  draft: string;
  sendTime?: string | null;
  gapHours?: number | null;
}

export type LevelName = "Khá" | "Trung bình" | "Cao";

export type RuleId =
  | "short-question"
  | "apology"
  | "long-vs-short"
  | "night"
  | "address"
  | "double"
  | "question-back"
  | "tone";

export interface RuleHit {
  id: RuleId;
  group: "nhip" | "cau" | "gio" | "xung" | "giong";
  groupLabel: string;
  label: string;
  points: number;
}

export interface ReplacementLine {
  tone: "giữ mặt" | "đẩy nhẹ" | "nói thẳng";
  blurb: string;
  line: string;
  score: number;
  /** How many points the risk number would drop if this line were sent instead. */
  drop: number;
}

export interface ScoreBreakdown {
  score: number;
  base: 35;
  L: number;
  M: number;
  hits: RuleHit[];
  /** Present only when send time or gap is missing. */
  timeNote: string | null;
  weakPhrases: string[];
  verdict: string;
  level: LevelName;
}

export interface ScoreResult extends ScoreBreakdown {
  replacements: ReplacementLine[];
}

interface ChatLine {
  speaker: "user" | "other";
  text: string;
}

const TIME_NOTE = "chưa đủ để chấm giờ";

const SARCASM = [
  "hay nhi",
  "the a",
  "u thi",
  "gioi lam",
  "gioi that",
  "thich thi",
  "tuy may",
  "tuy cau",
  "tuy anh",
  "a ha",
  "chac the",
  "biet ngay",
  "duoc roi do",
  "thi ra vay",
  "ok fine",
  "yeah right",
];

const DEMAND = [
  "tra loi di",
  "tra loi ngay",
  "rep di",
  "ngay bay gio",
  "lam ngay",
  "sao khong tra loi",
  "sao mai khong",
  "sao khong rep",
  "phai tra loi",
  "bat buoc",
  "khong duoc im",
];

const APOLOGY_PATTERNS = [
  /khong biet(?: (?:cau|ban|anh|chi|may|em|minh))? co ban khong/,
  /xin loi neu/,
  /em xin loi/,
  /minh xin loi/,
  /toi xin loi/,
  /lam phien/,
  /xin phep/,
  /neu (?:cau|ban|anh|chi|may) khong ban/,
  /neu khong phien/,
  /co on khong neu/,
  /khong biet co phien/,
  /cho (?:minh|em|toi) hoi/,
];

const WEAK_PATTERNS: RegExp[] = [
  /không biết(?:\s+(?:cậu|bạn|anh|chị|mày|em))?\s+có bận không/giu,
  /xin lỗi nếu[^,.?!]*/giu,
  /em xin lỗi/giu,
  /mình xin lỗi/giu,
  /tôi xin lỗi/giu,
  /làm phiền/giu,
  /xin phép/giu,
  /nếu không phiền/giu,
  /không chắc/giu,
  /hơi ngại/giu,
  /không dám/giu,
];

const VERDICT: Record<Exclude<RuleId, "tone">, string> = {
  "short-question": "Đang hỏi tiếp khi đối phương chỉ trả lời một hoặc hai chữ.",
  apology: "Câu xin lỗi hoặc xin phép trước khi vào việc.",
  "long-vs-short": "Câu dài trong khi đối phương đang trả lời ngắn.",
  night: "Gửi trong khoảng 23:00–06:00 khi họ im hơn 3 giờ.",
  address: "Đoạn chat đổi cách xưng giữa lịch sự và thân mật.",
  double: "Hai tin của mình nằm liền nhau, chưa có lời đáp.",
  "question-back": "Đối phương vừa hỏi lại.",
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function levelFor(score: number): LevelName {
  if (score < 40) return "Khá";
  if (score < 60) return "Trung bình";
  return "Cao";
}

export function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function wordCount(text: string): number {
  const cleaned = text.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/** True/false when the clock time is usable; null when missing or invalid. */
export function isQuietHours(sendTime: string | null | undefined): boolean | null {
  if (sendTime == null) return null;
  const trimmed = sendTime.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  if (hour === 6 && minute === 0) return true;
  return hour >= 23 || hour < 6;
}

export function readGap(gapHours: number | null | undefined): number | null {
  if (gapHours == null) return null;
  if (typeof gapHours !== "number" || !Number.isFinite(gapHours)) return null;
  return gapHours;
}

export function containsQuestion(text: string): boolean {
  if (/[?？]/.test(text)) return true;
  const n = stripDiacritics(text);
  if (/\b(duoc khong|phai khong|dung khong|sao vay|tai sao|bao gio|khi nao|o dau|la gi|cai gi)\b/.test(n)) {
    return true;
  }
  if (/\bco\b.{0,24}\bkhong\b/.test(n)) return true;
  return false;
}

export function isApologyOrPermission(text: string): boolean {
  const n = stripDiacritics(text);
  return APOLOGY_PATTERNS.some((pattern) => pattern.test(n));
}

function hasWholeWord(text: string, word: string): boolean {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${word}(?![\\p{L}\\p{N}_])`, "iu");
  return re.test(text);
}

function parseThread(thread: string): ChatLine[] {
  const lines = thread.split(/\r?\n/);
  const messages: ChatLine[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const match = /^([^:]{1,32}):\s*(.*)$/.exec(line);
    if (match) {
      const speaker = speakerOf(match[1]);
      const text = match[2].trim();
      if (speaker && text) {
        messages.push({ speaker, text });
        continue;
      }
    }
    if (messages.length > 0) {
      messages[messages.length - 1].text = `${messages[messages.length - 1].text} ${line}`.trim();
    }
  }
  return messages;
}

function speakerOf(label: string): "user" | "other" | null {
  const n = stripDiacritics(label).replace(/\s+/g, " ").trim();
  if (["minh", "toi", "me", "user", "tui", "mk"].includes(n)) return "user";
  if (["ho", "other", "doi phuong", "ban ay", "nguoi kia", "they"].includes(n)) return "other";
  return null;
}

function lastSpeakerMessage(messages: ChatLine[], speaker: "user" | "other"): ChatLine | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].speaker === speaker) return messages[i];
  }
  return null;
}

function hasConsecutiveUserMessages(messages: ChatLine[], draft: string): boolean {
  const sequence: ChatLine[] = [...messages];
  if (draft.trim()) sequence.push({ speaker: "user", text: draft.trim() });
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i].speaker === "user" && sequence[i - 1].speaker === "user") return true;
  }
  return false;
}

function addressSwitches(messages: ChatLine[]): boolean {
  const body = messages.map((message) => message.text).join("\n");
  const polite = hasWholeWord(body, "anh") || hasWholeWord(body, "chị");
  const intimate = hasWholeWord(body, "cậu") || hasWholeWord(body, "mày");
  return polite && intimate;
}

function isFiller(text: string): boolean {
  const n = stripDiacritics(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return /^(ok|uh|u|da|vang|hi|hello|alo|thanks|cam on|thank you)$/.test(n);
}

/** Second pass. Never the whole score. Clamped to [-15, +15]. */
export function toneModifier(draft: string): number {
  const text = draft.trim();
  if (!text) return 0;
  const n = stripDiacritics(text);
  let add = 0;
  for (const pattern of SARCASM) {
    if (n.includes(pattern)) add += 8;
  }
  for (const pattern of DEMAND) {
    if (n.includes(pattern)) add += 7;
  }
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs >= 3) add += 7;
  else if (bangs === 2) add += 4;
  if (add > 0) return clamp(add, -15, 15);

  const count = wordCount(text);
  const shortOnTask =
    count >= 1 && count <= 12 && !containsQuestion(text) && !isApologyOrPermission(text) && !isFiller(text);
  if (shortOnTask) return count <= 8 ? -15 : -10;
  return 0;
}

export function findWeakPhrases(draft: string): string[] {
  const found: string[] = [];
  for (const pattern of WEAK_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = draft.match(pattern);
    if (!matches) continue;
    for (const match of matches) {
      const trimmed = match.trim();
      if (trimmed && !found.includes(trimmed)) found.push(trimmed);
    }
  }
  return found;
}

function fixedHits(input: ScoreInput, messages: ChatLine[]): { hits: RuleHit[]; timeNote: string | null } {
  const hits: RuleHit[] = [];
  const draft = input.draft ?? "";
  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastOther = lastSpeakerMessage(messages, "other");
  const otherWords = lastOther ? wordCount(lastOther.text) : null;
  const otherJustSpoke = last?.speaker === "other";
  const otherShortReply = otherWords != null && otherWords >= 1 && otherWords <= 8;

  if (otherJustSpoke && otherWords != null && otherWords >= 1 && otherWords <= 2 && containsQuestion(draft)) {
    hits.push({
      id: "short-question",
      group: "nhip",
      groupLabel: "Nhịp",
      label: "Họ vừa trả một hoặc hai chữ, câu mới vẫn hỏi",
      points: 20,
    });
  }

  if (isApologyOrPermission(draft)) {
    hits.push({
      id: "apology",
      group: "cau",
      groupLabel: "Câu chữ",
      label: "Xin lỗi hoặc xin phép trước khi vào việc",
      points: 12,
    });
  }

  if (wordCount(draft) > 40 && otherShortReply) {
    hits.push({
      id: "long-vs-short",
      group: "cau",
      groupLabel: "Câu chữ",
      label: "Câu dài hơn 40 chữ khi họ trả lời ngắn",
      points: 10,
    });
  }

  const quiet = isQuietHours(input.sendTime);
  const gap = readGap(input.gapHours);
  let timeNote: string | null = null;
  if (quiet === null || gap === null) {
    timeNote = TIME_NOTE;
  } else if (quiet && gap > 3) {
    hits.push({
      id: "night",
      group: "gio",
      groupLabel: "Thời điểm",
      label: "23:00–06:00 và họ im hơn 3 giờ",
      points: 15,
    });
  }

  if (addressSwitches(messages)) {
    hits.push({
      id: "address",
      group: "xung",
      groupLabel: "Xưng hô",
      label: "Đổi anh/chị với cậu/mày trong đoạn chat",
      points: 15,
    });
  }

  if (hasConsecutiveUserMessages(messages, draft)) {
    hits.push({
      id: "double",
      group: "nhip",
      groupLabel: "Nhịp",
      label: "Hai tin của mình liền nhau, chưa có lời đáp",
      points: 18,
    });
  }

  if (otherJustSpoke && last && containsQuestion(last.text)) {
    hits.push({
      id: "question-back",
      group: "nhip",
      groupLabel: "Nhịp",
      label: "Họ vừa hỏi lại",
      points: -15,
    });
  }

  return { hits, timeNote };
}

function verdictFor(hits: RuleHit[], modifier: number): string {
  const fixed = hits.filter((hit) => hit.id !== "tone");
  if (fixed.length === 0) {
    if (modifier > 0) return "Câu có giọng mỉa hoặc đòi, ngoài các luật cố định.";
    if (modifier < 0) return "Câu ngắn và đúng việc, rủi ro nền giảm nhẹ.";
    return "Không có tín hiệu nổi ngoài mức nền.";
  }
  const top = [...fixed].sort((a, b) => Math.abs(b.points) - Math.abs(a.points))[0];
  return VERDICT[top.id as Exclude<RuleId, "tone">];
}

function extractPoint(draft: string): string {
  let text = draft.trim();
  const cuts: RegExp[] = [
    /hay nhỉ[,:\s]*/giu,
    /không biết(?:\s+(?:cậu|bạn|anh|chị|mày|em))?\s+có bận không[,:\s]*/giu,
    /(?:em |mình |tôi )?xin lỗi nếu[^,.?!]*/giu,
    /(?:em |mình |tôi )?xin lỗi[^,.?!]*/giu,
    /làm phiền[^,.?!]*/giu,
    /xin phép[^,.?!]*/giu,
    /nếu không phiền[,:\s]*/giu,
    /không chắc[^,.?!]*/giu,
    /hơi ngại[^,.?!]*/giu,
    /được không(?:\s+(?:ta|ạ|nhé|nha|nhỉ))?/giu,
    /[?？!]+/g,
  ];
  for (const pattern of cuts) text = text.replace(pattern, " ");
  text = text.replace(/\s+/g, " ").trim().replace(/^[,.:;\s]+/, "").replace(/[,.:;\s]+$/, "");
  if (!text) return "Mình nhắn lại phần việc";
  return text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
}

function takeWords(text: string, count: number): string {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleLowerCase("vi") + text.slice(1);
}

function finishLine(text: string): string {
  const cleaned = text.replace(/[?？!]+/g, "").replace(/\s+/g, " ").trim();
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function craftLines(draft: string): Array<Pick<ReplacementLine, "tone" | "blurb" | "line">> {
  const point = extractPoint(draft);
  return [
    {
      tone: "giữ mặt",
      blurb: "Điềm tĩnh, không hỏi thêm",
      line: finishLine(`Để sau. ${takeWords(point, 4)}`),
    },
    {
      tone: "đẩy nhẹ",
      blurb: "Giữ việc, bỏ câu xin phép",
      line: finishLine(takeWords(point, 8)),
    },
    {
      tone: "nói thẳng",
      blurb: "Nói việc, không vòng",
      line: finishLine(`Chốt ${lowerFirst(takeWords(point, 6))}`),
    },
  ];
}

export function scoreCore(input: ScoreInput): ScoreBreakdown {
  const thread = input.thread ?? "";
  const draft = input.draft ?? "";
  const messages = parseThread(thread);
  const fixed = fixedHits({ ...input, thread, draft }, messages);
  const L = fixed.hits.reduce((sum, hit) => sum + hit.points, 0);
  const M = toneModifier(draft);
  const hits = [...fixed.hits];
  if (M !== 0) {
    hits.push({
      id: "tone",
      group: "giong",
      groupLabel: "Lệch giọng",
      label: M > 0 ? "Giọng mỉa hoặc đòi ngoài luật cố định" : "Câu ngắn, đúng việc",
      points: M,
    });
  }
  const score = clamp(BASE_SCORE + L + M, 0, 100);
  return {
    score,
    base: BASE_SCORE,
    L,
    M,
    hits,
    timeNote: fixed.timeNote,
    weakPhrases: findWeakPhrases(draft),
    verdict: verdictFor(hits, M),
    level: levelFor(score),
  };
}

export function scoreMessage(input: ScoreInput): ScoreResult {
  const core = scoreCore(input);
  const replacements = craftLines(input.draft ?? "").map((line) => {
    const alt = scoreCore({ ...input, draft: line.line });
    return {
      ...line,
      score: alt.score,
      drop: core.score - alt.score,
    };
  });
  return { ...core, replacements };
}
