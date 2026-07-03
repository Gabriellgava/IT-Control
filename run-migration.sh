#!/bin/bash
cd /home/gabrielgava/projetos/IT-Control
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npx prisma db push --skip-generate
