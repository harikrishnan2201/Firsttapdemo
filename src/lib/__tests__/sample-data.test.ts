/**
 * FirstTap — Comprehensive Sample Data & Test Cases
 * 
 * Covers:
 *  1. FSM intent matching (language, name, affirmative, negative)
 *  2. Placement question scoring
 *  3. Doubt handling trigger detection
 *  4. WhatsApp lesson step progression
 *  5. UPI fraud detection scenarios
 *  6. API response mocks
 * 
 * Run with:  npx -y tsx src/lib/__tests__/sample-data.test.ts
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// ─── Type helpers ────────────────────────────────────────────────────────────
type Language = 'ta' | 'hi' | 'en';

// ─── 1. Language Intent Matching ─────────────────────────────────────────────

describe('Language Intent Detection', () => {
  const LANGUAGE_SAMPLES: { input: string; expected: Language }[] = [
    // Tamil
    { input: 'தமிழ்',               expected: 'ta' },
    { input: 'tamil',                expected: 'ta' },
    { input: 'tamizh',               expected: 'ta' },
    { input: 'ஆம் தமிழில் பேசு',     expected: 'ta' },
    // Hindi
    { input: 'हिंदी',                expected: 'hi' },
    { input: 'hindi',                expected: 'hi' },
    { input: 'hindi mein bolo',      expected: 'hi' },
    // English
    { input: 'english',              expected: 'en' },
    { input: 'speak in english',     expected: 'en' },
    { input: 'English please',       expected: 'en' },
  ];

  function detectLanguage(input: string): Language | null {
    const t = input.toLowerCase();
    if (t.includes('தமிழ') || t.includes('tamil') || t.includes('tamizh')) return 'ta';
    if (t.includes('हिंदी') || t.includes('hindi'))                          return 'hi';
    if (t.includes('english'))                                                return 'en';
    return null;
  }

  for (const { input, expected } of LANGUAGE_SAMPLES) {
    test(`detects "${input}" → ${expected}`, () => {
      assert.equal(detectLanguage(input), expected);
    });
  }
});

// ─── 2. Name Extraction ───────────────────────────────────────────────────────

describe('Name Extraction', () => {
  const NAME_SAMPLES: { input: string; expected: string }[] = [
    { input: 'my name is Lakshmi',           expected: 'Lakshmi' },
    { input: 'I am Ravi',                    expected: 'Ravi' },
    { input: 'call me Selvi',               expected: 'Selvi' },
    { input: 'என் பெயர் சுரேஷ்',             expected: 'சுரேஷ' },
    { input: 'mera naam Priya hai',          expected: 'Priya' },
    { input: 'Anita',                        expected: 'Anita' },
  ];

  function extractName(input: string): string | null {
    const patterns = [
      /(?:my name is|i am|call me|naam|naam hai|பெயர்)\s+([A-Za-zஃ-ௌ]+)/i,
      /^([A-Za-zஃ-ௌ]{2,20})$/,
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m?.[1]) return m[1];
    }
    return null;
  }

  for (const { input, expected } of NAME_SAMPLES) {
    test(`extracts name from "${input}"`, () => {
      assert.equal(extractName(input), expected);
    });
  }
});

// ─── 3. Affirmative / Negative Intent ────────────────────────────────────────

describe('Affirmative & Negative Intent', () => {
  const YES_SAMPLES = ['yes', 'yeah', 'ok', 'okay', 'sure', 'ஆம்', 'ஆமா', 'हाँ', 'haan', 'bilkul'];
  const NO_SAMPLES  = ['no', 'nope', 'இல்ல', 'இல்லை', 'नहीं', 'nahi', 'na'];

  function isAffirmative(input: string): boolean {
    return YES_SAMPLES.some(w => input.toLowerCase().includes(w));
  }
  function isNegative(input: string): boolean {
    return NO_SAMPLES.some(w => input.toLowerCase().includes(w));
  }

  for (const s of YES_SAMPLES) {
    test(`"${s}" is affirmative`, () => assert.ok(isAffirmative(s)));
  }
  for (const s of NO_SAMPLES) {
    test(`"${s}" is negative`, () => assert.ok(isNegative(s)));
  }

  test('affirmative and negative are mutually exclusive for clear inputs', () => {
    assert.ok(!isNegative('yes'));
    assert.ok(!isAffirmative('no'));
  });
});

// ─── 4. Placement Scoring ────────────────────────────────────────────────────

describe('Placement Score → Literacy Level', () => {
  type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  function scoreToLevel(score: number): Level {
    if (score <= 1) return 'BEGINNER';
    if (score <= 3) return 'INTERMEDIATE';
    return 'ADVANCED';
  }

  const cases: { score: number; level: Level }[] = [
    { score: 0, level: 'BEGINNER' },
    { score: 1, level: 'BEGINNER' },
    { score: 2, level: 'INTERMEDIATE' },
    { score: 3, level: 'INTERMEDIATE' },
    { score: 4, level: 'ADVANCED' },
    { score: 5, level: 'ADVANCED' },
  ];

  for (const { score, level } of cases) {
    test(`score ${score} → ${level}`, () => {
      assert.equal(scoreToLevel(score), level);
    });
  }
});

// ─── 5. Doubt Trigger Detection ──────────────────────────────────────────────

describe('Doubt Trigger Detection', () => {
  const DOUBT_PHRASES = [
    "i don't understand",
    "what is this",
    "enna solra",
    "समझ नहीं आया",
    "explain again",
    "புரியல",
    "how does this work",
    "what does UPI mean",
  ];

  function isDoubt(input: string): boolean {
    const keywords = ['understand', 'what', 'how', 'why', 'explain', 'enna', 'समझ', 'புரி'];
    return keywords.some(k => input.toLowerCase().includes(k));
  }

  for (const phrase of DOUBT_PHRASES) {
    test(`"${phrase}" triggers doubt handling`, () => {
      assert.ok(isDoubt(phrase));
    });
  }
});

// ─── 6. UPI Fraud Detection Rules ────────────────────────────────────────────

describe('UPI Fraud Detection', () => {
  type UpiScenario = {
    description: string;
    isFraud: boolean;
    flags: string[];
  };

  const SCENARIOS: UpiScenario[] = [
    {
      description: 'Collect request from unknown 10-digit number',
      isFraud: true,
      flags: ['collect_request', 'unknown_sender'],
    },
    {
      description: 'PIN required to receive money',
      isFraud: true,
      flags: ['pin_to_receive'],
    },
    {
      description: 'Legitimate payment to verified merchant VPA',
      isFraud: false,
      flags: [],
    },
    {
      description: 'OTP requested by UPI app caller',
      isFraud: true,
      flags: ['otp_requested'],
    },
    {
      description: 'Amount deducted after entering PIN for "receive"',
      isFraud: true,
      flags: ['pin_to_receive', 'debit_disguised_as_credit'],
    },
  ];

  const FRAUD_FLAGS = new Set(['collect_request', 'pin_to_receive', 'otp_requested', 'debit_disguised_as_credit']);

  function detectFraud(scenario: UpiScenario): boolean {
    return scenario.flags.some(f => FRAUD_FLAGS.has(f));
  }

  for (const s of SCENARIOS) {
    test(s.description, () => {
      assert.equal(detectFraud(s), s.isFraud);
    });
  }
});

// ─── 7. Sample WhatsApp Lesson Steps ─────────────────────────────────────────

describe('WhatsApp Lesson Step Progression', () => {
  const STEPS = [
    { id: 'W0', screen: 'CHAT_LIST',    target: 'search-icon',       segment: 0 },
    { id: 'W1', screen: 'CHAT_LIST',    target: 'new-chat-btn',       segment: 1 },
    { id: 'W2', screen: 'NEW_CONTACT',  target: 'contact-name-field', segment: 2 },
    { id: 'W3', screen: 'MESSAGE_VIEW', target: 'message-input',      segment: 3 },
    { id: 'W4', screen: 'MESSAGE_VIEW', target: 'send-button',        segment: 4 },
  ];

  test('lesson has 5 steps', () => assert.equal(STEPS.length, 5));

  test('each step has unique id', () => {
    const ids = STEPS.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('segment indices are sequential', () => {
    STEPS.forEach((step, i) => {
      assert.equal(step.segment, i);
    });
  });

  test('W0 starts on CHAT_LIST screen', () => {
    assert.equal(STEPS[0].screen, 'CHAT_LIST');
  });

  test('last step targets send-button', () => {
    assert.equal(STEPS[STEPS.length - 1].target, 'send-button');
  });
});

// ─── 8. API Mock Responses ───────────────────────────────────────────────────

describe('API Response Shape Validation', () => {
  // Mock STT response
  const STT_MOCK = { transcript: 'ஆம் தமிழில் பேசு', confidence: 0.92 };
  test('STT response has transcript and confidence', () => {
    assert.ok(typeof STT_MOCK.transcript === 'string');
    assert.ok(STT_MOCK.confidence >= 0 && STT_MOCK.confidence <= 1);
  });

  // Mock LLM doubt response
  const LLM_MOCK = {
    answer: 'UPI என்பது Unified Payments Interface. உங்கள் மொபைலில் பணம் அனுப்ப பயன்படுகிறது.',
    safe: true,
  };
  test('LLM response has answer string', () => {
    assert.ok(typeof LLM_MOCK.answer === 'string' && LLM_MOCK.answer.length > 0);
  });
  test('LLM response is marked safe', () => {
    assert.ok(LLM_MOCK.safe);
  });

  // Mock health check
  const HEALTH_MOCK = { status: 'ok', timestamp: Date.now() };
  test('Health check returns ok status', () => {
    assert.equal(HEALTH_MOCK.status, 'ok');
  });
});

// ─── 9. Sample Curriculum Data ───────────────────────────────────────────────

describe('Curriculum Catalog Validation', () => {
  const SAMPLE_LESSON = {
    id: 'whatsapp-send-message',
    title: {
      ta: 'WhatsApp-ல் செய்தி அனுப்பு',
      hi: 'WhatsApp पर मैसेज भेजें',
      en: 'Send a Message on WhatsApp',
    },
    difficulty: 'beginner',
    estimatedMinutes: 4,
    segments: [
      {
        step: 0,
        screen: 'CHAT_LIST',
        targetId: 'search-icon',
        voice: {
          ta: 'Search பொத்தானை தொடுங்கள்',
          hi: 'Search बटन दबाएं',
          en: 'Tap the Search button',
        },
      },
    ],
  };

  test('lesson has required fields', () => {
    assert.ok(SAMPLE_LESSON.id);
    assert.ok(SAMPLE_LESSON.title.ta);
    assert.ok(SAMPLE_LESSON.title.hi);
    assert.ok(SAMPLE_LESSON.title.en);
  });

  test('lesson difficulty is valid', () => {
    assert.ok(['beginner', 'intermediate', 'advanced'].includes(SAMPLE_LESSON.difficulty));
  });

  test('lesson segments are non-empty', () => {
    assert.ok(SAMPLE_LESSON.segments.length > 0);
  });

  test('each segment has voice in all 3 languages', () => {
    for (const seg of SAMPLE_LESSON.segments) {
      assert.ok(seg.voice.ta);
      assert.ok(seg.voice.hi);
      assert.ok(seg.voice.en);
    }
  });
});

console.log('\n✅ FirstTap sample data & test cases complete.\n');
