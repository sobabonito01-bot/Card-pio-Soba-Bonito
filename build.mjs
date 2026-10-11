// Gera dois sites a partir do HTML exportado do app:
//   dist/index.html         -> cardápio público (sem senha, sem equipe/PIN, sem acesso ao painel)
//   dist/painel/index.html  -> app completo (painel + PDV), protegido pela Edge Function
//
// Uso: node build.mjs [caminho-do-html]   (padrão: fonte/cardapio.html)
// Exporte sempre o HTML a partir de /painel/ ("Salvar para todos" > baixar) e salve em fonte/cardapio.html.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const entrada = process.argv[2] || "fonte/cardapio.html";
const original = readFileSync(entrada, "utf8");

const RE_ESTADO = /(<script id="state" type="application\/json">)([\s\S]*?)(<\/script>)/;
const m = original.match(RE_ESTADO);
if (!m) throw new Error('Bloco <script id="state"> não encontrado em ' + entrada);

const estado = JSON.parse(m[2]);
const senhaAdmin = estado?.C?.adminPassword || "";

function troca(html, de, para, nome) {
  const novo = typeof de === "string" ? html.split(de).join(para) : html.replace(de, para);
  if (novo === html) console.warn(`aviso: "${nome}" não encontrado (já aplicado ou o app mudou)`);
  return novo;
}

// Comum às duas versões: o link do cardápio sempre aponta para a raiz do site.
function comum(html) {
  return troca(html, "base=()=>location.href.split('#')[0]", "base=()=>location.origin+'/'", "base()");
}

// ---------- Painel (completo) ----------
let painel = comum(original);
if (!painel.includes('name="robots"')) {
  painel = troca(painel, '<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">', "meta robots");
}

// ---------- Público (sem credenciais nem acesso admin) ----------
let publico = comum(original);

// 1) remove senha e equipe (PIN) do estado embutido
const pub = structuredClone(estado);
if (pub.C) delete pub.C.adminPassword;
pub.ST = [];
publico = publico.replace(RE_ESTADO, (_, a, __, c) => a + JSON.stringify(pub).replace(/</g, "\\u003c") + c);

// 2) remove a senha padrão que existe no código e bloqueia login/sessão de admin
publico = troca(publico, /adminPassword:"[^"]*"/, 'adminPassword:""', "senha padrão no código");
publico = troca(publico, "function login(){if($('#pw').value===C.adminPassword){", "function login(){if(false){", "login()");
publico = troca(publico, "admin=sessionStorage.getItem('sb_a')=='1'", "admin=false", "sessão admin");

// 3) #admin e #pdv levam ao painel protegido
const redirecionar =
  "<script>(function(){function r(){var h=location.hash;if(h==='#admin'||h==='#pdv')location.replace('/painel/'+h)}r();addEventListener('hashchange',r)})()</script>\n";
publico = publico.replace('<script id="state"', redirecionar + '<script id="state"');

// Conferência: a senha não pode estar em nenhum arquivo público.
if (senhaAdmin && publico.includes(senhaAdmin)) {
  throw new Error("A senha do admin ainda aparece no HTML público. Build abortado.");
}
for (const s of estado.ST || []) {
  if (s.p && publico.includes(`"p":"${s.p}"`)) throw new Error("PIN da equipe ainda aparece no HTML público. Build abortado.");
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/painel", { recursive: true });
writeFileSync("dist/index.html", publico);
writeFileSync("dist/painel/index.html", painel);
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /painel/\n");

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + " KB";
console.log(`OK  dist/index.html ${kb(publico)}  |  dist/painel/index.html ${kb(painel)}`);
