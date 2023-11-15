FROM node:20 as build

WORKDIR /app

COPY . .

ARG NG_CLI_ANALYTICS=ci

RUN npm ci
RUN npx ng build --configuration production

FROM nginx:latest

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/dist/fe /usr/share/nginx/html

COPY .conf/nginx-custom.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
