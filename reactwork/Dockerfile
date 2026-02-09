# 1단계: build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2단계: nginx 가동, 설치해야함
FROM nginx:alpine 

# 기존 nginx 설정 제거
RUN rm -rf /etc/nginx/conf.d/*

# nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# build 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html


EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]