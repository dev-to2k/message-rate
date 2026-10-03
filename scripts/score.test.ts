import { describe, expect, it } from "vitest";
import { clamp, isQuietHours, scoreMessage, type ScoreInput } from "../src/score";

const worked: ScoreInput = {
  thread: "họ: ok",
  draft:
    "Hay nhỉ, không biết cậu có bận không, em xin lỗi nếu hỏi, tối nay mình ghé gửi tài liệu được không?",
  sendTime: null,
  gapHours: null,
};

describe("scoreMessage", () => {
  it("returns the same score for the same input twice", () => {
    const first = scoreMessage(worked);
    const second = scoreMessage(worked);
    expect(first.score).toBe(second.score);
    expect(first).toEqual(second);
  });

  it("matches the worked arithmetic", () => {
    const result = scoreMessage(worked);
    expect(result.base).toBe(35);
    expect(result.hits.filter((hit) => hit.id !== "tone").map((hit) => [hit.id, hit.points])).toEqual([
      ["short-question", 20],
      ["apology", 12],
    ]);
    expect(result.L).toBe(32);
    expect(result.M).toBe(8);
    expect(result.score).toBe(clamp(35 + 32 + 8, 0, 100));
    expect(result.score).toBe(75);
    expect(result.level).toBe("Cao");
    expect(result.timeNote).toBe("chưa đủ để chấm giờ");
    expect(result.weakPhrases).toContain("không biết cậu có bận không");
    expect(result.weakPhrases.some((phrase) => phrase.toLowerCase().includes("xin lỗi nếu"))).toBe(true);
    expect(result.verdict.length).toBeGreaterThan(0);
    expect(result.replacements.map((line) => line.tone)).toEqual(["giữ mặt", "đẩy nhẹ", "nói thẳng"]);
    for (const line of result.replacements) {
      const alt = scoreMessage({ ...worked, draft: line.line });
      expect(line.score).toBe(alt.score);
      expect(line.drop).toBe(result.score - alt.score);
    }
    expect(result.score).not.toBe(result.M);
  });

  it("skips the night +15 when time or gap is missing", () => {
    const ready: ScoreInput = {
      thread: "họ: ok",
      draft: "Nhắn một việc.",
      sendTime: "23:30",
      gapHours: 5,
    };
    const full = scoreMessage(ready);
    expect(full.hits.some((hit) => hit.id === "night" && hit.points === 15)).toBe(true);
    expect(full.timeNote).toBeNull();

    const noTime = scoreMessage({ ...ready, sendTime: null });
    expect(noTime.hits.some((hit) => hit.id === "night")).toBe(false);
    expect(noTime.timeNote).toBe("chưa đủ để chấm giờ");

    const blankTime = scoreMessage({ ...ready, sendTime: "  " });
    expect(blankTime.hits.some((hit) => hit.id === "night")).toBe(false);
    expect(blankTime.timeNote).toBe("chưa đủ để chấm giờ");

    const noGap = scoreMessage({ ...ready, gapHours: null });
    expect(noGap.hits.some((hit) => hit.id === "night")).toBe(false);
    expect(noGap.timeNote).toBe("chưa đủ để chấm giờ");

    const bothMissing = scoreMessage({ ...ready, sendTime: undefined, gapHours: undefined });
    expect(bothMissing.hits.some((hit) => hit.id === "night")).toBe(false);
    expect(bothMissing.timeNote).toBe("chưa đủ để chấm giờ");
  });

  it("does not add night points when the window or the gap is not met", () => {
    const base: ScoreInput = {
      thread: "họ: ok",
      draft: "Nhắn một việc.",
      sendTime: "22:30",
      gapHours: 5,
    };
    expect(scoreMessage(base).hits.some((hit) => hit.id === "night")).toBe(false);
    expect(scoreMessage(base).timeNote).toBeNull();
    expect(scoreMessage({ ...base, sendTime: "23:00", gapHours: 3 }).hits.some((hit) => hit.id === "night")).toBe(
      false,
    );
    expect(scoreMessage({ ...base, sendTime: "06:00", gapHours: 4 }).hits.some((hit) => hit.id === "night")).toBe(
      true,
    );
    expect(isQuietHours("05:59")).toBe(true);
    expect(isQuietHours("06:01")).toBe(false);
  });

  it("keeps M inside [-15, 15] and refuses to let M be the whole score", () => {
    const sarcastic = scoreMessage({
      thread: "",
      draft: "Hay nhỉ, tùy cậu, giỏi lắm, biết ngay.",
      sendTime: "12:00",
      gapHours: 1,
    });
    expect(sarcastic.M).toBeGreaterThan(0);
    expect(sarcastic.M).toBeLessThanOrEqual(15);
    expect(sarcastic.M).toBeGreaterThanOrEqual(-15);
    expect(sarcastic.score).toBe(clamp(35 + sarcastic.L + sarcastic.M, 0, 100));
    expect(sarcastic.score).not.toBe(sarcastic.M);

    const calm = scoreMessage({
      thread: "họ: mai gửi file giúp mình nhé?",
      draft: "Mình gửi file chiều nay.",
      sendTime: "10:00",
      gapHours: 1,
    });
    expect(calm.M).toBe(-15);
    expect(calm.M).toBeGreaterThanOrEqual(-15);
    expect(calm.hits.some((hit) => hit.id === "question-back" && hit.points === -15)).toBe(true);
    expect(calm.score).toBe(clamp(35 + calm.L + calm.M, 0, 100));
  });

  it("counts address switch and double text only from the thread rules", () => {
    const switched = scoreMessage({
      thread: "họ: chị ơi cậu để anh xem\nmình: dạ",
      draft: "Mình gửi file chiều nay.",
      sendTime: "10:00",
      gapHours: 1,
    });
    expect(switched.hits.some((hit) => hit.id === "address" && hit.points === 15)).toBe(true);

    const draftOnly = scoreMessage({
      thread: "họ: ok",
      draft: "Cậu ơi anh hỏi cái này.",
      sendTime: "10:00",
      gapHours: 1,
    });
    expect(draftOnly.hits.some((hit) => hit.id === "address")).toBe(false);

    const doubled = scoreMessage({
      thread: "mình: gửi file\nmình: xem giúp",
      draft: "Nhắc lại phần việc.",
      sendTime: "10:00",
      gapHours: 1,
    });
    expect(doubled.hits.some((hit) => hit.id === "double" && hit.points === 18)).toBe(true);
  });
});
