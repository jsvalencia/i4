# Usar una imagen base de Python oficial
FROM python:3.9-slim

# Establecer el directorio de trabajo en /app
WORKDIR /app

# Copiar el archivo de dependencias al directorio de trabajo
COPY requirements.txt .

# Instalar las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código de la aplicación al directorio de trabajo
COPY . .

# Exponer el puerto en el que la aplicación se ejecuta
EXPOSE 5001

# Comando para ejecutar la aplicación cuando el contenedor se inicie
CMD ["python", "app.py"]