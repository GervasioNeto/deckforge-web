// SETUP (uma vez só, por pessoa):
//
// Diferente do .env único do React/Vite, o Angular usa um ARQUIVO POR
// AMBIENTE dentro de src/environments/. Você precisa criar 2 cópias
// deste arquivo, com esses nomes exatos, na mesma pasta:
//
//   1. environment.ts             <- usado no build de produção
//   2. environment.development.ts <- usado por padrão no `npm start` (ng serve)
//
// Os dois são gitignorados (não vão pro repositório) e preenchidos com
// os MESMOS valores reais do projeto Supabase (Project Settings > API
// no painel do Supabase: Project URL e chave "anon public").
//
// Ex.: copiando por linha de comando, dentro de src/environments/
//   cp environment.example.ts environment.ts
//   cp environment.example.ts environment.development.ts
// Depois edite os dois arquivos criados com os valores reais.

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3333/api',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
};
