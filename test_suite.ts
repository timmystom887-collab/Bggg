import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log("=========================================================");
  console.log("BRIGGADE COGNITIVE & TOOL-SELECTION VERIFICATION PROTOCOL");
  console.log("=========================================================");

  const results: any[] = [];
  const startSuite = Date.now();

  const baselineDir = path.resolve('./baseline');
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const runTest = async (name: string, fn: () => Promise<void>) => {
    const start = Date.now();
    try {
      await fn();
      const latency = Date.now() - start;
      results.push({ name, status: 'PASS', latency, error: null });
      console.log(`[PASS] ${name} (${latency}ms)`);
    } catch (err: any) {
      const latency = Date.now() - start;
      results.push({ name, status: 'FAIL', latency, error: err.message || err });
      console.error(`[FAIL] ${name} (${latency}ms): ${err.message || err}`);
    }
  };

  // Test 1: JSON-RPC Version Compliance
  await runTest("JSON-RPC Version Compliance Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'tools/list' }) // missing jsonrpc "2.0"
    });
    const data = await res.json();
    if (res.status !== 400 || data.error?.code !== -32600) {
      throw new Error(`Expected JSON-RPC error -32600. Got status ${res.status} and body ${JSON.stringify(data)}`);
    }
  });

  // Test 2: MCP Tool Enumeration Contract
  await runTest("MCP Tool Enumeration Contract", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.tools) {
      throw new Error(`Failed to list tools: ${JSON.stringify(data)}`);
    }
    const tools = data.result.tools;
    const requiredTools = ["search_person", "reverse_phone", "username_scan", "ip_lookup", "dns_lookup", "whois_lookup"];
    for (const req of requiredTools) {
      if (!tools.some((t: any) => t.name === req)) {
        throw new Error(`Missing tool definition for: ${req}`);
      }
    }
    fs.writeFileSync(path.join(baselineDir, 'tools_list_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 3: MCP Tool Call - search_person Validation & Run
  await runTest("MCP Tool Call - search_person Validation & Run", async () => {
    // Missing arguments validation
    const badRes = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'search_person', arguments: {} },
        id: 2
      })
    });
    const badData = await badRes.json();
    if (badRes.status !== 400 || badData.error?.code !== -32602) {
      throw new Error(`Expected arg error -32602, got: ${JSON.stringify(badData)}`);
    }

    // Success run
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'search_person', arguments: { full_name: 'Marcus Jenkins', city_state: 'Austin, TX' } },
        id: 3
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`search_person execution failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'search_person_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 4: MCP Tool Call - reverse_phone Validation & Run
  await runTest("MCP Tool Call - reverse_phone Validation & Run", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'reverse_phone', arguments: { phone: '+1 (512) 555-0184' } },
        id: 4
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`reverse_phone execution failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'reverse_phone_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 5: MCP Tool Call - username_scan Validation & Run
  await runTest("MCP Tool Call - username_scan Validation & Run", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'username_scan', arguments: { username: 'octocat' } },
        id: 5
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`username_scan execution failed: ${JSON.stringify(data)}`);
    }
    if (!data.result.content[0].text.includes("GitHub")) {
      throw new Error(`Expected scan results to check GitHub, got: ${data.result.content[0].text}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'username_scan_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 6: MCP Tool Call - ip_lookup Geolocation Check
  await runTest("MCP Tool Call - ip_lookup Geolocation Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'ip_lookup', arguments: { ip: '8.8.8.8' } },
        id: 6
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`ip_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'ip_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 7: MCP Tool Call - dns_lookup Query Check
  await runTest("MCP Tool Call - dns_lookup Query Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'dns_lookup', arguments: { domain: 'google.com' } },
        id: 7
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`dns_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'dns_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 8: MCP Tool Call - whois_lookup Query Check
  await runTest("MCP Tool Call - whois_lookup Query Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'whois_lookup', arguments: { domain: 'google.com' } },
        id: 8
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`whois_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'whois_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 9: MCP Invalid Tool Name Catch
  await runTest("MCP Tool Call - Invalid Tool Error handling", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'fictional_unregistered_tool', arguments: {} },
        id: 9
      })
    });
    const data = await res.json();
    if (res.status !== 404 || data.error?.code !== -32601) {
      throw new Error(`Expected error -32601 on unregistered tool, got: ${JSON.stringify(data)}`);
    }
  });

  // Test 10: Dynamic Fallback Skip Tracer Dossier Check
  await runTest("AI Private Investigator - Dynamic Fallback Skip Tracer Dossier", async () => {
    const res = await fetch(`${BASE_URL}/api/investigator/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Johnathan Doe',
        city_state: 'Chicago, IL',
        phone: '+1 (312) 555-0984',
        username: 'jdoe99',
        plate: 'IL ABC-1234'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.dossier?.subject_profile) {
      throw new Error(`Skip Tracer failed: ${JSON.stringify(data)}`);
    }
    
    const d = data.dossier;
    if (d.subject_profile.full_name !== 'Johnathan Doe') {
      throw new Error(`Expected dossier full_name 'Johnathan Doe', got: '${d.subject_profile.full_name}'`);
    }
    if (!d.current_residence.city.includes('Chicago')) {
      throw new Error(`Expected current_residence city 'Chicago', got: '${d.current_residence.city}'`);
    }
    if (d.contact_telecom.phones[0].number !== '+1 (312) 555-0984') {
      throw new Error(`Expected parsed phone '+1 (312) 555-0984', got: '${d.contact_telecom.phones[0].number}'`);
    }
    if (d.vehicles_and_assets[0].plate !== 'IL ABC-1234') {
      throw new Error(`Expected parsed license plate 'IL ABC-1234', got: '${d.vehicles_and_assets[0].plate}'`);
    }
    fs.writeFileSync(path.join(baselineDir, 'fallback_dossier_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 11: Scam / Smishing Classifier Integrity
  await runTest("AI Scam Shield - SMS Smishing Triage Verification", async () => {
    const res = await fetch(`${BASE_URL}/api/scam/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'URGENT: Your bank account is locked. Log in immediately at http://unverified-bank-secure.com/login to restore access.'
      })
    });
    const data = await res.json();
    if (!res.ok || typeof data.is_scam !== 'boolean') {
      throw new Error(`Scam analyze failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'scam_shield_trace.json'), JSON.stringify(data, null, 2));
  });

  console.log("\n=========================================================");
  console.log("SUMMARY MATRIX");
  console.log("=========================================================");
  let failed = 0;
  for (const r of results) {
    if (r.status === 'FAIL') failed++;
    console.log(`[${r.status}] ${r.name.padEnd(52)} | Latency: ${r.latency}ms`);
  }
  console.log("=========================================================");
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.length - failed} | FAILED: ${failed}`);
  console.log(`TIME ELAPSED: ${Date.now() - startSuite}ms`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
