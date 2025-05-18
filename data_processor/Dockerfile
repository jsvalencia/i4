# Usar una imagen base de Node.js oficial
FROM node:16-alpine

# Establecer el directorio de trabajo en /usr/src/app
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar las dependencias de la aplicación
# Usar --only=production para no instalar devDependencies en la imagen final si es para producción
RUN npm install --only=production 

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto en el que la aplicación se ejecuta
EXPOSE 3001

# Comando para ejecutar la aplicación
CMD [ "node", "server.js" ]