# Sobá Bonito no Netlify

- `/` é o cardápio público: sem senha de admin, sem equipe/PIN e sem o código de login funcionando.
- `/painel/` é o app completo (painel + PDV), atrás de um portão de senha (Edge Function).
- `#admin` e `#pdv` no endereço público levam automaticamente para `/painel/`.

## Publicar

1. Coloque esta pasta em um repositório **privado** no GitHub (`fonte/cardapio.html` contém a senha atual do admin) e conecte ao Netlify.
   O Netlify roda `node build.mjs` e publica a pasta `dist`. (Alternativa: Netlify CLI, `netlify deploy --prod`.)
2. Em *Site configuration > Environment variables*, crie:
   - `PAINEL_SENHA`: a senha do portão. Pode ser a atual por enquanto, mas prefira uma senha longa; o portão não limita tentativas, só atrasa 1 s cada erro.
   - `PAINEL_SEGREDO`: texto aleatório longo para assinar o cookie, por exemplo o resultado de `openssl rand -hex 32`.
   Sem as duas variáveis, `/painel/` fica bloqueado (nunca abre por falta de configuração).
3. Faça um novo deploy. O acesso ao painel passa a pedir a senha do portão e, depois, a senha do admin do app (a atual).

## Atualizar o cardápio

1. Edite em `https://SEU-SITE/painel/` e clique em **Salvar para todos**. Aceite baixar o HTML.
2. Substitua `fonte/cardapio.html` pelo arquivo baixado e faça commit.
3. O Netlify gera de novo as duas versões. Exporte sempre a partir de `/painel/`, nunca da página pública.

## Limites desta versão

- A senha do admin continua conferida no navegador, mas agora só existe dentro de `/painel/`, atrás do portão.
- A equipe do PDV (garçons) precisa da senha do portão para abrir `/painel/#pdv`.
- Pedidos e notas ficam no navegador de quem usa o painel (como antes). Não há banco de dados no servidor.
- Integrações com WhatsApp, importação por link e emissor de NFC-e dependem dos seus servidores/proxies, configurados dentro do painel.
