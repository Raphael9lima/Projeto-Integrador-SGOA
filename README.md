# SGOA — Sistema de Gestão de Ocorrências e Ativos Escolares

Backend do Sistema de Gestão de Ocorrências e Ativos Escolares (SGOA), desenvolvido para registrar ocorrências relacionadas à infraestrutura escolar, gerenciar equipamentos e permitir o acompanhamento e a resolução de solicitações.

## Tecnologias utilizadas

- Node.js
- Express 5
- Supabase (PostgreSQL, Auth e Storage)
- JavaScript (CommonJS)
- Multer
- Nodemon

## Pré-requisitos

- Node.js instalado
- npm
- Projeto Supabase configurado
- Tabelas, políticas RLS e bucket de armazenamento configurados no Supabase

## Instalação

Clone o repositório:

```bash
git clone https://github.com/Raphael9lima/Projeto-Integrador-SGOA.git
```

Entre na pasta:

```bash
cd Projeto-Integrador-SGOA
```

Instale as dependências:

```bash
npm install
```

## Configuração do ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

Substitua os valores de exemplo pelos dados do seu projeto Supabase.

Não compartilhe nem envie o arquivo `.env` ao GitHub.

O projeto utiliza a chave publicável do Supabase. A autenticação dos usuários é realizada por meio dos tokens de sessão.

## Executar o servidor

Modo desenvolvimento:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Por padrão, o servidor funciona em:

```text
http://localhost:3000
```

## Verificação do servidor

Rota inicial:

```http
GET /
```

Verificação da conexão com o Supabase:

```http
GET /teste-supabase
```

A segunda rota realiza uma consulta à tabela `usuarios` e informa se a conexão foi estabelecida.

## Autenticação

As rotas de autenticação são:

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/auth/cadastro` | Cadastra um usuário |
| POST | `/auth/login` | Realiza login |
| GET | `/auth/me` | Consulta o usuário autenticado |

### Cadastro

Exemplo de corpo JSON:

```json
{
  "nome": "Usuário de teste",
  "email": "usuario@exemplo.com",
  "senha": "SENHA_DE_TESTE",
  "cgm_ra": "123456"
}
```

### Login

```json
{
  "email": "usuario@exemplo.com",
  "senha": "SENHA_DE_TESTE"
}
```

O login retorna os dados do usuário e a sessão do Supabase.

### Autenticação das requisições

Nas rotas protegidas, envie o token de acesso retornado pelo login:

```http
Authorization: Bearer SEU_ACCESS_TOKEN
```

## Equipamentos

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| GET | `/equipamentos` | Lista equipamentos | Usuário autenticado |
| POST | `/equipamentos` | Cadastra equipamento | TECNICO / ADMIN |
| PATCH | `/equipamentos/:id` | Atualiza equipamento | TECNICO / ADMIN |
| DELETE | `/equipamentos/:id` | Exclui equipamento | TECNICO / ADMIN |

Exemplo de cadastro:

```json
{
  "numero_patrimonio": "PAT-001",
  "nome": "Computador",
  "ambiente": "Laboratório de informática"
}
```

## Ocorrências

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| GET | `/ocorrencias` | Lista ocorrências | Usuário autenticado |
| GET | `/ocorrencias/:id` | Consulta uma ocorrência | Usuário autenticado |
| POST | `/ocorrencias` | Registra ocorrência | ALUNO / PROFESSOR / TECNICO / ADMIN |
| PATCH | `/ocorrencias/:id` | Atualiza ocorrência | TECNICO / ADMIN |
| PATCH | `/ocorrencias/:id/status` | Atualiza status | TECNICO / ADMIN |

### Categorias disponíveis

- `HARDWARE_QUEBRADO`
- `SEM_INTERNET`
- `SOFTWARE`
- `MOBILIARIO`
- `OUTROS`

### Prioridades

- `BAIXA`
- `MEDIA`
- `ALTA`
- `URGENTE`

A prioridade é atribuída automaticamente conforme o perfil do solicitante. Professores recebem prioridade ALTA e alunos recebem prioridade MEDIA.

### Status

- `ABERTO`
- `EM_ANDAMENTO`
- `RESOLVIDO`
- `CANCELADO`

### Regras de negócio

- Ocorrências são associadas ao usuário autenticado.
- Ocorrências podem ser relacionadas a equipamentos cadastrados.
- A abertura de ocorrência da categoria `HARDWARE_QUEBRADO` exige o envio de uma imagem.
- A resolução exige o número de patrimônio do equipamento associado.
- O número informado na resolução precisa corresponder ao patrimônio do equipamento.

## Comentários

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/comentarios/ocorrencia/:ocorrencia_id` | Consulta comentários |
| POST | `/comentarios/ocorrencia/:ocorrencia_id` | Registra comentário |

Exemplo de corpo JSON:

```json
{
  "texto": "A ocorrência está em acompanhamento."
}
```

O comentário é associado automaticamente ao usuário autenticado. O texto deve ter até 2.000 caracteres.

## Anexos

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/anexos/ocorrencia/:ocorrencia_id` | Envia anexo |
| GET | `/anexos/ocorrencia/:ocorrencia_id` | Consulta anexos |

O envio utiliza `multipart/form-data`, com o campo:

```text
arquivo
```

Formatos aceitos:

- JPEG
- PNG
- WEBP
- PDF

Limite máximo: 5 MB por arquivo.

O sistema valida o tipo informado e a assinatura real do arquivo. Os anexos são armazenados no bucket `anexos-ocorrencias` do Supabase Storage.

O acesso aos anexos respeita as permissões do usuário e as políticas RLS.

## Banco de dados e armazenamento

O projeto utiliza o Supabase para persistência e autenticação.

Principais tabelas:

- `usuarios`
- `equipamentos`
- `ocorrencias`
- `comentarios`
- `anexos`

O controle de acesso aos registros utiliza Row Level Security (RLS).

O armazenamento de arquivos utiliza o bucket:

```text
anexos-ocorrencias
```

### Preparação das contas de teste

Os scripts utilizam dois arquivos JSON locais, criados manualmente na raiz do projeto:

- `cadastro.json`: credenciais de uma conta de teste com perfil ALUNO.
- `cadastro-tecnico.json`: credenciais de uma conta de teste com perfil TECNICO.

Cada arquivo deve ser um objeto JSON com duas propriedades de texto:

- `email`: endereço cadastrado no Supabase Auth.
- `senha`: senha da respectiva conta de teste.

Crie as contas pelo endpoint de cadastro ou pelo ambiente de autenticação do Supabase, garantindo que os perfis estejam configurados corretamente na tabela `usuarios`.

Os arquivos são utilizados pelos scripts para realizar login automaticamente. Não compartilhe esses arquivos e nunca os adicione ao Git.

## Testes

Os scripts de teste estão na raiz do projeto e podem ser executados individualmente:

```bash
node testar-autenticacao.js
node testar-equipamentos.js
node testar-cadastro-equipamento.js
node testar-atualizacao-equipamento.js
node testar-exclusao-equipamento.js
node testar-cadastro-ocorrencia.js
node testar-consulta-ocorrencias.js
node testar-atualizacao-ocorrencia.js
node testar-permissao-ocorrencia.js
node testar-cadastro-comentario.js
node testar-consulta-comentarios.js
node testar-resposta-tecnico.js
node testar-envio-anexo.js
node testar-consulta-anexos.js
node testar-consulta-anexos-tecnico.js
node testar-arquivo-invalido.js
node testar-hardware-sem-imagem.js
node testar-isolamento-anexos.js
node testar-ocorrencia-tecnico.js
node testar-resolucao-ocorrencia.js
```

Os testes utilizam os arquivos locais `cadastro.json` e `cadastro-tecnico.json` para obter os dados de autenticação.

Esses arquivos não devem ser enviados ao repositório.

## Estrutura do projeto

```text
SGOA/
├── docs/
│   └── Supabase.png
├── src/
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   ├── autenticacao.js
│   │   └── autorizarPerfil.js
│   ├── routes/
│   │   ├── anexos.js
│   │   ├── auth.js
│   │   ├── comentarios.js
│   │   ├── equipamentos.js
│   │   └── ocorrencias.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── testar-*.js
```

## Perfis de acesso

O sistema trabalha com os seguintes perfis:

- `ALUNO`
- `PROFESSOR`
- `TECNICO`
- `ADMIN`

As permissões são aplicadas pelos middlewares de autenticação e autorização, em conjunto com as políticas RLS do Supabase.

## Repositório

GitHub:

https://github.com/Raphael9lima/Projeto-Integrador-SGOA
