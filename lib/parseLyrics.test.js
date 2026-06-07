const test = require('node:test');
const assert = require('node:assert');
const { parseLyricsResponse } = require('./parseLyrics');

test('splits multiple TRACK blocks on the --- separator', () => {
  const raw = [
    'TRACK 1: First Steps',
    'One foot then the other',
    'The whole room holding its breath',
    '---',
    'TRACK 2: Cake Smash',
    'Hands in the frosting',
    '---'
  ].join('\n');
  const tracks = parseLyricsResponse(raw);
  assert.strictEqual(tracks.length, 2);
  assert.strictEqual(tracks[0].title, 'First Steps');
  assert.strictEqual(tracks[0].lyrics, 'One foot then the other\nThe whole room holding its breath');
  assert.strictEqual(tracks[1].title, 'Cake Smash');
  assert.strictEqual(tracks[1].lyrics, 'Hands in the frosting');
});

test('strips the "TRACK n:" prefix and trims surrounding whitespace', () => {
  const raw = [
    'TRACK 3:   Legos on the Floor   ',
    '',
    'The mess we made together',
    '',
    '---',
    '   '
  ].join('\n');
  const tracks = parseLyricsResponse(raw);
  assert.strictEqual(tracks.length, 1);
  assert.strictEqual(tracks[0].title, 'Legos on the Floor');
  assert.strictEqual(tracks[0].lyrics, 'The mess we made together');
});
