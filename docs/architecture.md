# Arquitetura do Ditos

## Relacionamentos

```text
Category 1 --- N Product
RestaurantTable 1 --- N TableSession
TableSession 1 --- N Order
Order 1 --- N OrderItem
Product 1 --- N OrderItem
auth.users 1 --- 0..1 StaffProfile
```

Uma mesa possui no máximo uma sessão `ABERTA`. Novos pedidos da mesma mesa reutilizam essa sessão. O item congela `product_name` e `unit_price`; o total é calculado no PostgreSQL com o preço do produto ativo, nunca com um total enviado pelo navegador.

## Traduções

Categorias e produtos usam objetos JSONB como `{ "pt": "...", "en": "...", "es": "..." }`. Para o catálogo pequeno, isso evita tabelas de tradução e joins adicionais, preserva uma linha por entidade e permite adicionar idiomas sem mudar colunas. Se o catálogo crescer ou exigir busca textual por idioma, a estratégia pode evoluir para tabelas `product_translations` e `category_translations`.

## Limites de acesso

- O navegador pode ler somente produtos e categorias ativos.
- Auth e Realtime usam a chave publicável.
- Mutações passam pelas rotas do Next.js.
- A chave secreta do Supabase existe apenas no servidor.
- Funções transacionais de pedido/status só podem ser executadas por `service_role`.
- Rotas administrativas validam a sessão Supabase e a existência de um `staff_profile` ativo.
