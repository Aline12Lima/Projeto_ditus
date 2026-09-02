# Arquitetura do Ditus

Esta documentação complementa a visão executiva do [README](../README.md) com os principais limites e relacionamentos técnicos da implementação atual.

## Visão em camadas

```text
Navegador (cliente / funcionário)
              ↓
      Next.js App Router
              ↓
       Route Handlers
              ↓
       Server Services
              ↓
 Supabase JS / funções RPC
              ↓
 PostgreSQL + Auth + Realtime + Storage
```

Componentes client-side cuidam da interação e de estado não sensível. Route Handlers validam entradas e autenticação antes de chamar serviços server-side. Regras que precisam de consistência entre registros são executadas por funções PL/pgSQL transacionais.

## Relacionamentos

```text
categories        1 --- N products
restaurant_tables 1 --- N table_sessions
customer_visits   1 --- 0..1 table_sessions por visita
table_sessions    1 --- N orders
orders            1 --- N order_items
products          1 --- N order_items
orders            1 --- 0..1 payment_requests
orders            1 --- 0..1 order_reviews
customer_visits   1 --- N order_reviews
auth.users        1 --- 0..1 staff_profiles
staff_profiles    1 --- N confirmações de pagamento
```

Uma mesa possui no máximo uma sessão `ABERTA`, regra protegida por índice parcial e validação transacional. A visita representa o ciclo do cliente; a sessão representa a ocupação da mesa; pedidos pertencem à sessão. O item congela `product_name` e `unit_price`, e o total é calculado no PostgreSQL com o preço atual de produtos ativos, nunca com um total enviado pelo navegador.

## Operações transacionais

As funções do banco coordenam os fluxos que alteram mais de uma entidade:

- início de visita pelo QR e associação convencional de mesa;
- criação idempotente e revisão do pedido recebido;
- transição da máquina de estados;
- solicitação, comunicação e confirmação de pagamento;
- criação de avaliação somente para pedido pago;
- encerramento emergencial com preservação do histórico.

`orders.idempotency_key` possui restrição de unicidade. Em uma repetição da mesma tentativa lógica, a função retorna o pedido existente sem duplicar itens.

## Limites de acesso

- O navegador pode ler diretamente somente categorias e produtos ativos.
- Supabase Auth e Realtime no navegador usam a chave publicável.
- Mutações passam pelas rotas do Next.js.
- A chave secreta/service-role existe apenas no servidor.
- Funções de pedido, status, pagamento e atendimento são executáveis pelo `service_role`, não por `anon` ou `authenticated`.
- Rotas administrativas validam a sessão Supabase e um `staff_profile` ativo.
- Confirmação de pagamento e encerramento emergencial também exigem papel `ADMIN`.
- RLS protege tabelas operacionais; a consulta pública do catálogo respeita `active`.

## Tokens e ciclo de atendimento

O acesso por QR usa o número da mesa e um token opaco, armazenado como hash para validação. O cliente recebe credenciais distintas para sua visita e para acompanhar o pedido. Isso separa o recurso físico do ciclo de negócio e evita que apenas um identificador previsível conceda acesso.

O encerramento integral invalida o estado persistido do cliente, incluindo a chave de idempotência, mas preserva o contexto do QR. A mesma mesa pode iniciar uma nova visita e sessão sem reaproveitar o pedido anterior.

## Realtime

Pedidos publicam eventos em canais derivados do token de acompanhamento. Visitas e pagamentos também enviam eventos para seus fluxos. O painel autenticado assina alterações de `orders`, `restaurant_tables`, `customer_visits` e `payment_requests`, atualizando a interface e gerando notificações operacionais.

## Storage e imagens

Uploads administrativos aceitam JPG, PNG e WebP de até 5 MB. O Route Handler autenticado grava arquivos no bucket `product-images`; o banco armazena a URL do produto. Imagens locais e seus créditos estão descritos em [image-credits.md](image-credits.md).

## Traduções

Categorias e produtos usam objetos JSONB como `{ "pt": "...", "en": "...", "es": "..." }`. Para o catálogo atual, isso evita tabelas de tradução e joins adicionais, preserva uma linha por entidade e permite adicionar idiomas sem mudar colunas. Se o catálogo crescer ou exigir busca textual por idioma, a estratégia pode evoluir para tabelas dedicadas.
