// Copy dist CSS and scripts into the open Service Studio modules.
// Apply and verify only. Merging is done by the agent through the sapphire-dev MCP tool.
//
//   SAPPHIRE_MCP_TOKEN=<token> node scripts/sync-dist-to-outsystems.mjs
//   node scripts/sync-dist-to-outsystems.mjs --self-test

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mcpHost = "127.0.0.1";
const mcpPort = 41820;

const targets = [
	{ module: "RW_Core_Th", kind: "theme", name: "RW_Core_Theme", file: "dist/sapphire-rwa-library.css" },
	{ module: "RW_Core_Lib", kind: "script", name: "SapphireRWALibrary", file: "dist/sapphire-rwa-library.js" },
	{ module: "RW_Core_Lib", kind: "script", name: "SapphireRWATextEditor", file: "dist/sapphire-rwa-texteditor.js" },
	{ module: "RW_Core_Lib", kind: "script", name: "SapphireRWAIcons", file: "dist/sapphire-rwa-icons.js" },
	{ module: "RW_Core_Lib", kind: "script", name: "SapphireRWACKEditor", file: "dist/sapphire-rwa-ckeditor.js" },
	{ module: "RW_Core_Lib", kind: "script", name: "SapphireRWAFlags", file: "dist/sapphire-rwa-flags.js" },
	{ module: "RW_DesignSystem", kind: "script", name: "SapphireRWADocumentation", file: "dist/sapphire-rwa-documentation.js" },
	{ module: "RW_DesignSystem", kind: "script", name: "SapphireRWAStaticEntities", file: "dist/sapphire-rwa-static-entities.js" },
];

function readText(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function csharpVerbatim(text) {
	const parts = [];
	const chunkSize = 4000;
	for (let index = 0; index < text.length; index += chunkSize) {
		parts.push('@"' + text.slice(index, index + chunkSize).replaceAll('"', '""') + '"');
	}
	return parts.join(" + ");
}

function decodeVerbatim(expression) {
	let index = 0;
	let text = "";
	while (index < expression.length) {
		if (!expression.startsWith('@"', index)) {
			throw new Error(`Verbatim chunk is not wrapped near ${JSON.stringify(expression.slice(index, index + 20))}`);
		}
		index += 2;
		let chunk = "";
		while (index < expression.length) {
			if (expression[index] !== '"') {
				chunk += expression[index];
				index += 1;
				continue;
			}
			if (expression[index + 1] === '"') {
				chunk += '"';
				index += 2;
				continue;
			}
			index += 1;
			break;
		}
		text += chunk;
		if (expression.startsWith(" + ", index)) {
			index += 3;
			continue;
		}
		if (index === expression.length) break;
		throw new Error(`Expected concatenation near ${JSON.stringify(expression.slice(index, index + 20))}`);
	}
	return text;
}

function lambdaFor(target, text) {
	const value = csharpVerbatim(text);
	const assignment = target.kind === "theme"
		? `var target = eSpace.MobileThemes.First(t => t.Name == "${target.name}"); target.StyleSheet = ${value};`
		: `var target = eSpace.Scripts.First(s => s.Name == "${target.name}"); target.JavaScript = ${value};`;
	const code = `eSpace => { ${assignment} }`;
	if (!code.endsWith("}")) throw new Error(`Lambda for ${target.file} does not end with }`);
	return code;
}

function probeFor(moduleName) {
	const moduleTargets = targets.filter((target) => target.module === moduleName);
	if (moduleTargets.length === 1 && moduleTargets[0].kind === "theme") {
		return 'eSpace => { var css = eSpace.MobileThemes.First(t => t.Name == "RW_Core_Theme").StyleSheet ?? ""; var head = css.Length > 60 ? css.Substring(0, 60) : css; throw new Exception("PROBE:len=" + css.Length + " head=" + head); }';
	}
	const names = moduleTargets.map((target) => `"${target.name}"`).join(", ");
	return `eSpace => { var names = new[] { ${names} }; var parts = new List<string>(); foreach (var n in names) { var js = eSpace.Scripts.First(s => s.Name == n).JavaScript ?? ""; var head = js.Length > 60 ? js.Substring(0, 60) : js; parts.Add(n + "=" + js.Length + " head=" + head); } throw new Exception("PROBE:" + string.Join(" || ", parts)); }`;
}

function mcpCall(token, id, name, args) {
	const body = JSON.stringify({
		jsonrpc: "2.0",
		id,
		method: "tools/call",
		params: { name, arguments: args },
	});
	return new Promise((resolve, reject) => {
		const request = http.request({
			hostname: mcpHost,
			port: mcpPort,
			path: "/mcp",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				SessionToken: token,
				"Content-Length": Buffer.byteLength(body),
			},
			timeout: 300000,
		}, (response) => {
			const chunks = [];
			response.on("data", (chunk) => chunks.push(chunk));
			response.on("end", () => {
				const data = Buffer.concat(chunks).toString("utf8");
				if (response.statusCode !== 200) {
					reject(new Error(`HTTP ${response.statusCode} ${data.slice(0, 400)}`));
					return;
				}
				const match = data.match(/data: (\{.*\})\s*$/s);
				if (!match) {
					reject(new Error(`No MCP payload: ${data.slice(0, 400)}`));
					return;
				}
				const message = JSON.parse(match[1]);
				if (message.error) {
					reject(new Error(JSON.stringify(message.error).slice(0, 2000)));
					return;
				}
				const text = message.result?.content?.[0]?.text ?? "";
				try {
					resolve(JSON.parse(text));
				} catch {
					reject(new Error(text.slice(0, 2000)));
				}
			});
		});
		request.on("error", reject);
		request.on("timeout", () => request.destroy(new Error("MCP call timed out")));
		request.write(body);
		request.end();
	});
}

function blockingErrors(validationMessages) {
	return (validationMessages ?? []).filter((message) => {
		if (String(message.type).toLowerCase() !== "error") return false;
		return message.id !== "InvalidIconLibrary";
	});
}

async function applyModule(token, moduleName) {
	const moduleTargets = targets.filter((target) => target.module === moduleName);
	let mutatedOmlPath = "";
	const applied = [];
	for (const target of moduleTargets) {
		const text = readText(target.file);
		process.stderr.write(`APPLY ${moduleName} ${target.name} chars=${text.length}\n`);
		const parsed = await mcpCall(token, Date.now(), "applyModelApiCode", {
			input: {
				eSpaceName: moduleName,
				code: lambdaFor(target, text),
				imports: [],
			},
			sessionToken: token,
		});
		const errors = blockingErrors(parsed.validationMessages);
		if (parsed.exceptionMessage || !parsed.mutatedOmlPath || errors.length > 0) {
			const detail = parsed.exceptionMessage || errors.map((error) => `${error.id}: ${error.message}`).join("; ") || "no mutated OML";
			throw new Error(`${moduleName} ${target.name}: ${detail}`);
		}
		mutatedOmlPath = parsed.mutatedOmlPath;
		applied.push({ name: target.name, file: target.file, chars: text.length });
	}
	return { module: moduleName, mutatedOmlPath, applied };
}

function parseProbe(exceptionMessage, moduleName) {
	const text = exceptionMessage ?? "";
	if (!text.startsWith("PROBE:")) throw new Error(`${moduleName} probe failed: ${text.slice(0, 300)}`);
	const body = text.slice("PROBE:".length);
	if (moduleName === "RW_Core_Th") {
		const length = Number(body.match(/len=(\d+)/)?.[1]);
		const head = body.match(/head=(.*)$/s)?.[1] ?? "";
		return [{ name: "RW_Core_Theme", length, head }];
	}
	return body.split(" || ").map((part) => {
		const match = part.match(/^(.+)=(\d+) head=(.*)$/s);
		if (!match) throw new Error(`${moduleName} probe part unreadable: ${part.slice(0, 120)}`);
		return { name: match[1], length: Number(match[2]), head: match[3] };
	});
}

async function verifyModule(token, moduleName) {
	const parsed = await mcpCall(token, Date.now(), "applyModelApiCode", {
		input: { eSpaceName: moduleName, code: probeFor(moduleName), imports: [] },
		sessionToken: token,
	});
	if (parsed.mutatedOmlPath) throw new Error(`${moduleName} verify saved a module; expected a probe`);
	const actual = parseProbe(parsed.exceptionMessage, moduleName);
	for (const target of targets.filter((item) => item.module === moduleName)) {
		const text = readText(target.file);
		const found = actual.find((item) => item.name === target.name);
		const expectedHead = text.slice(0, 60);
		if (!found || found.length !== text.length || found.head !== expectedHead) {
			throw new Error(`${moduleName} ${target.name} mismatch: expected ${text.length} chars starting ${JSON.stringify(expectedHead)}, got ${found ? found.length + " " + JSON.stringify(found.head) : "missing"}`);
		}
	}
}

function selfTest() {
	for (const target of targets) {
		const text = readText(target.file);
		const code = lambdaFor(target, text);
		const marker = target.kind === "theme" ? "StyleSheet = " : "JavaScript = ";
		const start = code.indexOf(marker);
		if (start < 0 || !code.endsWith("; }")) throw new Error(`Could not recover expression for ${target.file}`);
		const roundTrip = decodeVerbatim(code.slice(start + marker.length, -3));
		if (roundTrip !== text) throw new Error(`Round-trip failed for ${target.file}`);
		process.stderr.write(`OK ${target.file} chars=${text.length}\n`);
	}
	process.stderr.write("SELF_TEST_OK\n");
}

async function main() {
	if (process.argv.includes("--self-test")) {
		selfTest();
		return;
	}
	const token = process.env.SAPPHIRE_MCP_TOKEN;
	if (!token) {
		throw new Error("Set SAPPHIRE_MCP_TOKEN to the createSessionToken value. Do not print the token.");
	}

	const listed = await mcpCall(token, 1, "listApps", { sessionToken: token });
	const open = new Set((listed.apps ?? []).filter((app) => app.isOpen).map((app) => app.name));
	const required = [...new Set(targets.map((target) => target.module))];
	const missing = required.filter((name) => !open.has(name));
	if (missing.length > 0) {
		throw new Error(`Open these modules in Service Studio: ${missing.join(", ")}`);
	}

	const results = await Promise.all(required.map((moduleName) => applyModule(token, moduleName)));
	await Promise.all(required.map((moduleName) => verifyModule(token, moduleName)));

	const result = {
		ok: true,
		merges: results.map((result) => ({ eSpaceName: result.module, mutatedOmlPath: result.mutatedOmlPath })),
		applied: results.flatMap((result) => result.applied.map((item) => ({ module: result.module, ...item }))),
	};
	process.stdout.write(`SYNC_RESULT ${JSON.stringify(result)}\n`);
}

main().catch((error) => {
	process.stderr.write(`SYNC_FAIL ${error.message}\n`);
	process.exit(1);
});
