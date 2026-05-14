const { prepare } = require('./index.js');

async function test() {
  console.log('Testing gm-skill prepare()...');
  try {
    const state = await prepare({ sessionId: 'test-session-' + Date.now() });
    console.log('Prepare successful!');
    console.log('Session ID:', state.sessionId);
    console.log('CWD:', state.cwd);
    console.log('Snapshot Git:', JSON.stringify(state.snapshot.git, null, 2));
    console.log('Snapshot Tasks count:', state.snapshot.tasks.length);
    
    if (state.snapshot.error) {
      console.warn('Snapshot error:', state.snapshot.error);
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Prepare failed:', e);
    process.exit(1);
  }
}

test();
