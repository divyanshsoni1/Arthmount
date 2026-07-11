# Development Guide 

1. Copy .env.example in .env file
2. Run For first time setup

```
npm run prisma:generate
npm run prisma:format
npm run prisma:validate
npm run db:migrate -- --name init
npm run db:deploy
npm run db:push
npm run db:fresh
```
