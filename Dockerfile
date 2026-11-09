FROM node:24.22.1-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev --no-audit --no-fund
COPY src ./src
ENV HOST=0.0.0.0 PORT=3002 SOURCE_MODE=offline
USER node
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(2000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","src/integration/server.mjs"]
