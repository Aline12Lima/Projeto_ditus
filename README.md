# Ditus

Sistema de pedidos de restaurante em Next.js, TypeScript, Supabase/PostgreSQL, Supabase Auth e Realtime.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Supabase

1. Copie `.env.example` para `.env.local` e preencha os três valores do projeto.
2. Instale a Supabase CLI ou use o SQL Editor do projeto.
3. Aplique, na ordem, os arquivos de `supabase/migrations/`.
4. Execute `supabase/seed.sql`.
5. Crie o primeiro usuário no Supabase Auth.
6. Cadastre o UUID desse usuário em `public.staff_profiles` com papel `ADMIN`:

```sql
insert into public.staff_profiles (user_id, role)
values ('UUID_DO_USUARIO_AUTH', 'ADMIN');
```

Nunca coloque `SUPABASE_SECRET_KEY` em uma variável `NEXT_PUBLIC_*`. A chave secreta é utilizada somente pelas rotas server-side.

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:e2e
npm run build
```

Os testes de banco requerem Supabase local. O teste E2E completo requer migrations, seed, variáveis de ambiente e `E2E_SUPABASE_READY=1`.

## Idiomas

Português é o idioma padrão. O seletor salva a escolha de Português, Español ou English no navegador.

## Fluxo de branches

- `main`: produção
- `develop`: integração
- `feature/<nome>`: novas funcionalidades
- `fix/<nome>`: correções

O design da pasta `stitch` será integrado assim que seus arquivos estiverem disponíveis no projeto.
