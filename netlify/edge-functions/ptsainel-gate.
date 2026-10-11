// Portão de senha para /painel (painel do admin e PDV).
// Variáveis de ambiente (Netlify > Site configuration > Environment variables):
//   PAINEL_SENHA   senha de acesso ao painel (use uma senha forte)
//   PAINEL_SEGREDO texto aleatório longo, usado para assinar o cookie (ex.: openssl rand -hex 32)
// Se alguma estiver ausente, o acesso é bloqueado (nunca abre por falta de configuração).

import type { Config, Context } from "https://edge.netlify.com";

const COOKIE = "sb_painel";
const HORAS = 12;
const enc = new TextEncoder();

async function hmac(chave: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(chave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function cookieValido(valor: string | undefined, segredo: string): Promise<boolean> {
  if (!valor) return false;
  const [exp, sig] = valor.split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return igual(sig, await hmac(segredo, "painel:" + exp));
}

function pagina(msg: string, status: number, erro = ""): Response {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Acesso restrito</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0f;color:#f4f1ee;font:15px/1.45 system-ui,sans-serif}
.c{width:min(360px,90vw);background:#17171c;border:1px solid #2a2a31;border-radius:14px;padding:22px}
h1{margin:0 0 6px;font-size:20px}p{margin:0 0 14px;color:#9a948e;font-size:13px}
input,button{width:100%;padding:11px;border-radius:10px;font:inherit;box-sizing:border-box}
input{border:1px solid #2a2a31;background:#0c0c0f;color:#f4f1ee;margin-bottom:10px}
button{border:0;background:#e11d48;color:#fff;font-weight:700;cursor:pointer}.e{color:#fca5a5;margin:0 0 10px}</style></head>
<body><div class="c"><h1>🔒 Acesso restrito</h1><p>${msg}</p>${erro ? `<p class="e">${erro}</p>` : ""}
${status === 503 ? "" : `<form method="POST"><input type="password" name="senha" placeholder="Senha" autocomplete="current-password" autofocus required><button type="submit">Entrar</button></form>`}
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export default async (req: Request, context: Context): Promise<Response> => {
  const senha = Netlify.env.get("PAINEL_SENHA");
  const segredo = Netlify.env.get("PAINEL_SEGREDO");
  if (!senha || !segredo) {
    return pagina("Painel ainda não configurado. Defina PAINEL_SENHA e PAINEL_SEGREDO no Netlify.", 503);
  }

  const url = new URL(req.url);
  if (url.pathname === "/painel") return Response.redirect(url.origin + "/painel/" + url.search, 301);

  if (await cookieValido(context.cookies.get(COOKIE), segredo)) {
    const res = await context.next();
    res.headers.set("cache-control", "no-store");
    res.headers.set("x-robots-tag", "noindex");
    return res;
  }

  if (req.method === "POST") {
    let digitada = "";
    try {
      digitada = String((await req.formData()).get("senha") ?? "");
    } catch (_) { /* corpo inválido */ }
    const ok = igual(await hmac(segredo, "senha:" + digitada), await hmac(segredo, "senha:" + senha));
    if (ok) {
      const exp = Date.now() + HORAS * 3600 * 1000;
      const valor = exp + "." + (await hmac(segredo, "painel:" + exp));
      return new Response(null, {
        status: 303,
        headers: {
          location: "/painel/",
          "set-cookie": `${COOKIE}=${valor}; Path=/painel; Max-Age=${HORAS * 3600}; HttpOnly; Secure; SameSite=Strict`,
          "cache-control": "no-store",
        },
      });
    }
    await new Promise((r) => setTimeout(r, 1000)); // atraso contra tentativas em sequência
    return pagina("Digite a senha do painel.", 401, "Senha incorreta.");
  }

  return pagina("Digite a senha do painel.", 401);
};

export const config: Config = { path: ["/painel", "/painel/*"] };
