// pipeline.js
// Hardcoded test brief → lyrics → Suno → poll → print URLs
// Run: SUNO_API_KEY=x ANTHROPIC_API_KEY=x node pipeline.js

const { runPipeline } = require('./lib/pipeline');

const SUNO_KEY = process.env.SUNO_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const TEST_BRIEF = {
  recipient_name: 'Rachel',
  occasion: 'first birthday',
  shape: 'moment',
  emotional_arc: ['warm', 'safe', 'joyful', 'loved'],
  shared_memories: [
    'first steps',
    'first cake smash',
    'first fall',
    'legos on the floor — a home full of life and noise'
  ],
  their_taste: [],
  avoid: ['anything that feels unsafe or unsettling'],
  tape_color: 'red',
  tracks: [
    {
      title: 'First Steps',
      mood: 'wobbly, courageous, delighted',
      lyric_seeds: ['one foot then the other', 'the whole room holding its breath', 'she did it'],
      suno_style_tags: 'warm indie pop, acoustic guitar, gentle drums, playful, tender'
    },
    {
      title: 'Cake Smash',
      mood: 'pure joyful chaos, uninhibited',
      lyric_seeds: ['hands in the frosting', 'laughing too hard to sing', 'this is what happy looks like'],
      suno_style_tags: 'upbeat folk pop, clapping rhythm, bright piano, celebratory, warm'
    },
    {
      title: 'Legos on the Floor',
      mood: 'alive, homey, beautifully imperfect',
      lyric_seeds: ['the mess we made together', 'every corner full of something', 'this is home'],
      suno_style_tags: 'warm indie folk, fingerpicked guitar, soft vocals, cozy, lived-in'
    },
    {
      title: 'First Fall',
      mood: 'tender, reassuring, you are not alone',
      lyric_seeds: ["I caught you", "it's okay to stumble", "I'll always be here"],
      suno_style_tags: 'soft acoustic, gentle strings, comforting, intimate, safe'
    },
    {
      title: 'You Are Loved',
      mood: 'still, warm, eternal — the closing embrace',
      lyric_seeds: ['from the very beginning', 'before you knew the words', 'you were loved'],
      suno_style_tags: 'ambient folk, soft piano, warm pads, tender, resolving'
    }
  ]
};

async function run() {
  console.log('=== Mixtape POC Pipeline ===');

  if (!SUNO_KEY || !ANTHROPIC_KEY) {
    console.error('Missing SUNO_API_KEY or ANTHROPIC_API_KEY in environment');
    process.exit(1);
  }

  const seenStatus = new Map();
  const results = await runPipeline(TEST_BRIEF, {
    anthropicApiKey: ANTHROPIC_KEY,
    sunoApiKey: SUNO_KEY,
    onUpdate: (task) => {
      if (seenStatus.get(task.title) === task.status) return;
      seenStatus.set(task.title, task.status);
      if (task.status === 'complete') {
        console.log(`   ✓ "${task.title}" complete`);
      } else if (task.status === 'error') {
        console.error(`   ✗ "${task.title}" failed: ${task.error}`);
      } else {
        console.log(`   … "${task.title}" ${task.status}`);
      }
    }
  });

  console.log('\n=== Results ===');
  for (const track of results) {
    console.log(`\n${track.title}`);
    console.log(`  ${track.audio_url}`);
  }
}

run().catch(console.error);
