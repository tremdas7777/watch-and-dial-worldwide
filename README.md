# Oferta Insights

oferta info

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bee1a38b-f831-4157-a70a-299b24964a9c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## SagacePay

O checkout da página `/cta.html` gera cobranças PIX de **R$ 137,00** pela SagacePay. A API key nunca é enviada ao navegador: a criação e a consulta da venda passam pelas server routes do TanStack Start em `/api/sagacepay/sales` e `/api/sagacepay/sales/:id`.

Antes de publicar, configure no ambiente do servidor as variáveis descritas em [`.env.example`](./.env.example):

- `SAGACEPAY_API_KEY`: API key criada em **Integrações > API Keys** na SagacePay.
- `SAGACEPAY_WEBHOOK_SECRET`: signing secret do webhook cadastrado no painel.
- `SAGACEPAY_POSTBACK_URL`: URL HTTPS pública `https://seu-dominio.com/api/sagacepay/webhook`. Pode ser omitida quando o webhook padrão já estiver configurado no painel.
- `SAGACEPAY_BASE_URL`: opcional; por padrão é `https://sagacepay.com/api`.
- `ADMIN_PASSWORD`: senha definida por você para entrar em `/admin`. O painel usa sessão HttpOnly e não grava a senha no código.
- `SUPABASE_SERVICE_ROLE_KEY`: chave server-only usada para persistir pedidos, status e configurações administrativas.

No painel da SagacePay, cadastre o endpoint `/api/sagacepay/webhook` e use o secret correspondente. O endpoint verifica `x-sagacepay-timestamp` e `x-sagacepay-signature` com HMAC-SHA256 e rejeita requisições fora da janela de cinco minutos. Não adicione a API key ou o secret ao Git.

### Painel operacional

Abra `/admin` e entre com a senha definida em `ADMIN_PASSWORD`. O painel oferece visão de faturamento, ticket médio, funil de status, taxa de aprovação, receita diária, pedidos com filtros de período/status e a tela para salvar a API key, webhook secret, URL do webhook e ticket. Aplique antes a migration `supabase/migrations/202610220102_sagacepay_admin.sql` no projeto Supabase.
