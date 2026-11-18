import { describe, expect, it } from 'vitest';
import { parseNdjson, stripThinking } from './ollama';

describe('parseNdjson', () => {
  it('parses complete lines and keeps the partial tail', () => {
    const { items, rest } = parseNdjson<{ n: number }>('{"n":1}\n{"n":2}\n{"n":');
    expect(items).toEqual([{ n: 1 }, { n: 2 }]);
    expect(rest).toBe('{"n":');
  });

  it('skips blank lines', () => {
    expect(parseNdjson('\n{"a":1}\n\n').items).toEqual([{ a: 1 }]);
  });
});

describe('stripThinking', () => {
  it('removes finished and unfinished think blocks', () => {
    expect(stripThinking('<think>hmm</think>\n\nHello')).toBe('Hello');
    expect(stripThinking('<think>still going')).toBe('');
  });

  it('drops reasoning before a closing tag that has no opening tag', () => {
    expect(stripThinking('Okay, the user wants a pitch.\n</think>\n\nHi there!')).toBe('Hi there!');
  });

  it('leaves normal text alone', () => {
    expect(stripThinking('Sales are up 4%.')).toBe('Sales are up 4%.');
  });
});
