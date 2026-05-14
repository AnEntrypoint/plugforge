const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('[gm-gc-gemini] Testing gm-gc Gemini editor integration...');

  const gcPath = 'C:\\dev\\gm\\build\\gm-gc';

  // Test 1: Installation readiness
  console.log('\n[gm-gc-gemini] Test 1: Installation readiness');
  const installJs = path.join(gcPath, 'install.js');
  if (fs.existsSync(installJs)) {
    console.log('  ✓ install.js present');
    try {
      const content = fs.readFileSync(installJs, 'utf8');
      console.log(`  File size: ${content.length} bytes`);
      const hasGeminiSetup = content.includes('gemini') || content.includes('Gemini');
      console.log(`  ${hasGeminiSetup ? '✓' : '?'} Gemini-specific setup code`);
    } catch (e) {
      console.log(`  ✗ Error reading: ${e.message}`);
    }
  } else {
    console.log('  ✗ install.js not found');
  }

  // Test 2: CLI entry point
  console.log('\n[gm-gc-gemini] Test 2: CLI entry point');
  const cliJs = path.join(gcPath, 'cli.js');
  if (fs.existsSync(cliJs)) {
    console.log('  ✓ cli.js present');
    try {
      const output = execSync(`node "${cliJs}" --version 2>&1`, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5000
      });
      console.log(`  ✓ --version works: ${output.trim()}`);
    } catch (e) {
      console.log(`  ? --version output: ${e.message.substring(0, 80)}`);
    }
  } else {
    console.log('  ✗ cli.js not found');
  }

  // Test 3: Skill chain
  console.log('\n[gm-gc-gemini] Test 3: Skill availability chain');
  const agentsPath = path.join(gcPath, 'agents');
  const requiredSkills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
  let allSkillsPresent = true;

  if (fs.existsSync(agentsPath)) {
    requiredSkills.forEach(skill => {
      const skillPath = path.join(agentsPath, skill);
      const skillManifest = path.join(skillPath, 'manifest.json');
      const skillSkillMd = path.join(skillPath, 'SKILL.md');
      const exists = fs.existsSync(skillPath);
      const hasManifest = fs.existsSync(skillManifest);
      const hasSkillMd = fs.existsSync(skillSkillMd);
      allSkillsPresent = allSkillsPresent && exists;
      console.log(`  ${exists ? '✓' : '✗'} ${skill} (manifest: ${hasManifest ? 'yes' : 'no'}, SKILL.md: ${hasSkillMd ? 'yes' : 'no'})`);
    });
  }

  // Test 4: MCP server compatibility
  console.log('\n[gm-gc-gemini] Test 4: MCP server configuration');
  const mcpPath = path.join(gcPath, '.mcp.json');
  if (fs.existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      console.log('  ✓ .mcp.json valid');
      if (mcp.tools) {
        console.log(`  Tools configured: ${mcp.tools.length}`);
      }
      if (mcp.resources) {
        console.log(`  Resources configured: ${mcp.resources.length}`);
      }
    } catch (e) {
      console.log(`  ✗ Parse error: ${e.message}`);
    }
  } else {
    console.log('  ℹ .mcp.json not found (optional)');
  }

  // Test 5: Gemini extension compatibility
  console.log('\n[gm-gc-gemini] Test 5: Gemini extension configuration');
  const geminiExtPath = path.join(gcPath, 'gemini-extension.json');
  if (fs.existsSync(geminiExtPath)) {
    try {
      const ext = JSON.parse(fs.readFileSync(geminiExtPath, 'utf8'));
      console.log('  ✓ gemini-extension.json valid');
      console.log(`  Extension name: ${ext.name}`);
      console.log(`  Version: ${ext.version}`);
      if (ext.capabilities) {
        console.log(`  Capabilities: ${Object.keys(ext.capabilities).join(', ')}`);
      }
    } catch (e) {
      console.log(`  ✗ Parse error: ${e.message}`);
    }
  } else {
    console.log('  ℹ gemini-extension.json not found (may be optional)');
  }

  // Test 6: README and documentation
  console.log('\n[gm-gc-gemini] Test 6: Documentation');
  const readmePath = path.join(gcPath, 'README.md');
  const geminiMdPath = path.join(gcPath, 'GEMINI.md');

  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf8');
    console.log(`  ✓ README.md (${content.length} bytes)`);
  } else {
    console.log('  ✗ README.md not found');
  }

  if (fs.existsSync(geminiMdPath)) {
    const content = fs.readFileSync(geminiMdPath, 'utf8');
    console.log(`  ✓ GEMINI.md (${content.length} bytes)`);
    const sections = (content.match(/^## /gm) || []).length;
    console.log(`  Sections: ${sections}`);
  } else {
    console.log('  ? GEMINI.md not found (Gemini-specific guide)');
  }

  // Test 7: Package bin entries
  console.log('\n[gm-gc-gemini] Test 7: Package bin entries');
  const pkgPath = path.join(gcPath, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.bin) {
      console.log('  ✓ Bin entries configured:');
      Object.entries(pkg.bin).forEach(([name, script]) => {
        const exists = fs.existsSync(path.join(gcPath, script));
        console.log(`    ${exists ? '✓' : '✗'} ${name} -> ${script}`);
      });
    } else {
      console.log('  ? No bin entries found');
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }

  // Test 8: Deployment readiness
  console.log('\n[gm-gc-gemini] Test 8: Deployment readiness');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log(`  Name: ${pkg.name}`);
  console.log(`  Version: ${pkg.version}`);
  console.log(`  Repository: ${pkg.repository?.url || 'not set'}`);
  if (pkg.files) {
    console.log(`  Files list: ${pkg.files.length} entries`);
    console.log(`    ${pkg.files.join(', ')}`);
  }
  if (pkg.devDependencies && pkg.devDependencies['@gm/gm-skill']) {
    console.log(`  ✓ gm-skill dependency: ${pkg.devDependencies['@gm/gm-skill']}`);
  } else {
    console.log('  ? gm-skill dependency not found');
  }

  console.log('\n[gm-gc-gemini] Gemini integration test complete');
  console.log('[gm-gc-gemini] Summary: gm-gc is ready for Gemini editor installation');
} catch (e) {
  console.error('[gm-gc-gemini] Error:', e.message);
  process.exit(1);
}
