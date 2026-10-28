import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "waypoint-test-"));
const calls = [];
const fixture = http.createServer(async (req, res) => {
  let text = "";
  for await (const chunk of req) text += chunk;
  let body = text ? JSON.parse(text) : {};
  calls.push({ url: req.url, body });
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/tags")
    return res.end(
      JSON.stringify({
        models: [
          { name: "test-chat", size: 100 },
          { name: "test-embed", size: 100 },
          {
            name: "cloud-alias:latest",
            size: 300,
            remote_host: "https://ollama.com",
          },
        ],
      }),
    );
  if (req.url === "/api/embed")
    return res.end(
      JSON.stringify({ embeddings: body.input.map(() => [1, 0, 0]) }),
    );
  if (req.url === "/api/chat")
    return res.end(
      JSON.stringify({
        message: { content: "The fixture phrase is green lantern [1]." },
      }),
    );
  if (req.url.startsWith("/case/"))
    return res.end(
      JSON.stringify({
        form: "I-129",
        status: "Test case received",
        description: "Synthetic integration fixture",
        updatedAt: "2026-10-27",
      }),
    );
  if (req.url.startsWith("/processing"))
    return res.end(
      JSON.stringify({
        estimate: "Test estimate",
        asOf: "2026-10-27",
        sourceUrl: "https://egov.uscis.gov/processing-times/",
      }),
    );
  res.statusCode = 404;
  res.end("{}");
});
await new Promise((r) => fixture.listen(0, "127.0.0.1", r));
const fixtureUrl = "http://127.0.0.1:" + fixture.address().port;
const child = spawn(process.execPath, ["server.js"], {
  env: {
    ...process.env,
    PORT: "4319",
    NODE_ENV: "production",
    DATA_DIR: temp,
    OLLAMA_URL: fixtureUrl,
    OLLAMA_MODEL: "test-chat",
    OLLAMA_EMBED_MODEL: "test-embed",
    CASE_API_URL: fixtureUrl + "/case/{receipt}",
    PROCESSING_API_URL: fixtureUrl + "/processing",
  },
  stdio: "pipe",
});
let startup = "";
child.stdout.on("data", (b) => (startup += b));
child.stderr.on("data", (b) => (startup += b));
const base = "http://127.0.0.1:4319";
async function call(p, method = "GET", body) {
  const r = await fetch(base + p, {
    method,
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
try {
  for (let i = 0; i < 600; i++) {
    try {
      await fetch(base + "/api/workspace");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
      if (i === 599) throw Error("Server failed: " + startup);
    }
  }
  await test("health excludes cloud models including misleading local aliases", async () => {
    const { data } = await call("/api/health");
    assert.deepEqual(data.models, ["test-chat", "test-embed"]);
  });
  await test("receipt lookup validates input and normalizes provider responses", async () => {
    assert.equal(
      (await call("/api/cases", "POST", { receipt: "invalid" })).status,
      400,
    );
    const { status, data } = await call("/api/cases", "POST", {
      receipt: "ioe-1234567890",
    });
    assert.equal(status, 200);
    assert.equal(data.cases[0].receipt, "IOE1234567890");
    assert.equal(data.cases[0].status, "Test case received");
  });
  await test("processing estimates use configured provider and requested form/office", async () => {
    const { data } = await call("/api/processing?form=I-485&office=California");
    assert.equal(data.estimate, "Test estimate");
    assert.ok(
      calls.some(
        (c) =>
          c.url.includes("form=I-485") && c.url.includes("office=California"),
      ),
    );
  });
  await test("local import, retrieval, citations and deletion complete end to end", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([
        "This is an integration test document. The preparation review phrase is green lantern. It is not legal guidance.",
      ]),
      "test.txt",
    );
    const imported = await call("/api/documents", "POST", form);
    assert.equal(imported.status, 200);
    const id = imported.data.documents[0].id;
    const result = await call("/api/chat", "POST", {
      message: "What is the review phrase?",
      rag: true,
    });
    assert.equal(result.data.grounded, true);
    assert.equal(result.data.sources[0].name, "test.txt");
    assert.ok(
      calls
        .find((c) => c.url === "/api/chat")
        .body.messages[0].content.includes("green lantern"),
    );
    await call("/api/documents/" + id, "DELETE");
    assert.equal((await call("/api/workspace")).data.documents.length, 0);
  });
  await test("profile, completion and official notice persist; PDF is a real PDF", async () => {
    const { data } = await call("/api/profile", "PUT", {
      visa: "F1",
      location: "outside",
      dependents: true,
      translations: true,
      target: "2027-01-15",
    });
    assert.ok(data.checklist.some((i) => i.id === "i20"));
    await call("/api/completed", "PUT", { ids: ["passport"] });
    await call("/api/notices", "POST", {
      title: "Test notice",
      date: "2027-01-01",
    });
    const saved = JSON.parse(
      await fs.readFile(path.join(temp, "workspace.json"), "utf8"),
    );
    assert.equal(saved.completed[0], "passport");
    assert.equal(saved.notices.length, 1);
    const response = await fetch(base + "/api/checklist.pdf");
    assert.equal(response.headers.get("Content-Type"), "application/pdf");
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
  });
  await test("cross-origin mutations and cloud model selection are rejected", async () => {
    const r = await fetch(base + "/api/completed", {
      method: "PUT",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: '{"ids":[]}',
    });
    assert.equal(r.status, 403);
    assert.equal(
      (
        await call("/api/settings", "PUT", {
          model: "cloud-alias:latest",
          embedding: "test-embed",
        })
      ).status,
      400,
    );
  });
} finally {
  child.kill();
  await new Promise((r) => fixture.close(r));
  if (path.dirname(temp) !== os.tmpdir())
    throw Error("Unexpected temporary directory");
  await fs.rm(temp, { recursive: true, force: true });
}
